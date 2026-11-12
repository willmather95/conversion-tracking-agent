/**
 * SSRF guard for the Tag Health Checker.
 *
 * http and https only. DNS is resolved and every address is checked against
 * private, loopback, link-local, and metadata ranges (IPv4 and IPv6). The same
 * checks run on the hostname when it is already an IP, and again on every
 * redirect target before the next request.
 */

import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export class ScanError extends Error {
  code:
    | 'invalid_url'
    | 'blocked'
    | 'timeout'
    | 'too_large'
    | 'fetch_failed'
    | 'rate_limited';

  constructor(
    message: string,
    code:
      | 'invalid_url'
      | 'blocked'
      | 'timeout'
      | 'too_large'
      | 'fetch_failed'
      | 'rate_limited',
  ) {
    super(message);
    this.name = 'ScanError';
    this.code = code;
  }
}

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google.com',
  'metadata',
]);

const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.invalid',
  '.lan',
  '.home',
  '.corp',
];

const IPV4_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
] as const;

export function userFacingScanError(error: unknown): { code: ScanError['code']; message: string } {
  if (error instanceof ScanError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return {
      code: 'timeout',
      message: 'The page took too long to respond. Try again, or try a simpler URL.',
    };
  }
  return { code: 'fetch_failed', message: 'The page could not be fetched.' };
}

export function parsePageUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ScanError('Enter a public page URL.', 'invalid_url');
  }
  if (/\s/.test(trimmed)) {
    throw new ScanError('Enter a public http or https page URL.', 'invalid_url');
  }

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ScanError('Enter a public http or https page URL.', 'invalid_url');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScanError('Only http and https URLs can be scanned.', 'blocked');
  }
  if (url.username || url.password) {
    throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
  }
  if (!url.hostname) {
    throw new ScanError('Enter a public http or https page URL.', 'invalid_url');
  }

  return url;
}

export function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

export function assertPublicHostname(host: string): void {
  if (!host) {
    throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
  }
  if (BLOCKED_HOSTS.has(host)) {
    throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
  }
  if (isBlockedIp(host)) {
    throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
  }
}

export async function assertPublicResolvedHost(host: string): Promise<string[]> {
  assertPublicHostname(host);
  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
    }
    return [host];
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ScanError('The page could not be fetched.', 'fetch_failed');
  }

  if (!records.length) {
    throw new ScanError('The page could not be fetched.', 'fetch_failed');
  }

  const blocked = records.filter((record) => isBlockedIp(record.address));
  if (blocked.length) {
    throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
  }

  return records.map((record) => record.address);
}

export function isBlockedIp(value: string): boolean {
  const ip = value.replace(/^\[/, '').replace(/\]$/, '');
  const version = isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return false;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

function ipv4InCidr(ip: number, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  const baseNum = ipv4ToInt(base);
  if (baseNum === null || Number.isNaN(bits)) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
  return (ip & mask) === (baseNum & mask);
}

function isBlockedIPv4(ip: string): boolean {
  const num = ipv4ToInt(ip);
  if (num === null) return true;
  return IPV4_CIDRS.some((cidr) => ipv4InCidr(num, cidr));
}

function parseIPv6(ip: string): number[] | null {
  let value = ip.toLowerCase();
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice(7);
    if (isIP(mapped) === 4) {
      const num = ipv4ToInt(mapped);
      if (num === null) return null;
      return [0, 0, 0, 0, 0, 0xffff, (num >>> 16) & 0xffff, num & 0xffff];
    }
  }

  const zone = value.indexOf('%');
  if (zone !== -1) value = value.slice(0, zone);

  const sides = value.split('::');
  if (sides.length > 2) return null;

  const parseSide = (side: string): number[] => {
    if (!side) return [];
    return side.split(':').map((chunk) => {
      if (chunk.includes('.')) {
        const num = ipv4ToInt(chunk);
        if (num === null) return Number.NaN;
        return [(num >>> 16) & 0xffff, num & 0xffff];
      }
      if (!/^[0-9a-f]{1,4}$/.test(chunk)) return Number.NaN;
      return Number.parseInt(chunk, 16);
    }).flat();
  };

  const head = parseSide(sides[0] ?? '');
  const tail = sides.length === 2 ? parseSide(sides[1] ?? '') : [];
  if (head.some((n) => Number.isNaN(n)) || tail.some((n) => Number.isNaN(n))) return null;
  if (head.length + tail.length > 8) return null;
  const mid = new Array(8 - head.length - tail.length).fill(0);
  return [...head, ...mid, ...tail];
}

function isBlockedIPv6(ip: string): boolean {
  const parts = parseIPv6(ip);
  if (!parts) return true;

  const allZero = parts.every((part) => part === 0);
  if (allZero) return true;
  if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0 && parts[6] === 0 && parts[7] === 1) {
    return true;
  }

  // IPv4-mapped and NAT64: judge the embedded IPv4.
  if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0xffff) {
    const ipv4 = `${(parts[6] >> 8) & 0xff}.${parts[6] & 0xff}.${(parts[7] >> 8) & 0xff}.${parts[7] & 0xff}`;
    return isBlockedIPv4(ipv4);
  }
  if (parts[0] === 0x64 && parts[1] === 0xff9b && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0) {
    const ipv4 = `${(parts[6] >> 8) & 0xff}.${parts[6] & 0xff}.${(parts[7] >> 8) & 0xff}.${parts[7] & 0xff}`;
    return isBlockedIPv4(ipv4);
  }

  // Discard prefix 100::/64
  if (parts[0] === 0x100 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0) return true;
  // Documentation 2001:db8::/32
  if (parts[0] === 0x2001 && parts[1] === 0xdb8) return true;
  // Unique local fc00::/7
  if ((parts[0] & 0xfe00) === 0xfc00) return true;
  // Link-local fe80::/10
  if ((parts[0] & 0xffc0) === 0xfe80) return true;
  // Multicast ff00::/8
  if ((parts[0] & 0xff00) === 0xff00) return true;
  // 6to4 2002::/16 encodes an IPv4 address in the next 32 bits.
  if (parts[0] === 0x2002) {
    const ipv4 = `${(parts[1] >> 8) & 0xff}.${parts[1] & 0xff}.${(parts[2] >> 8) & 0xff}.${parts[2] & 0xff}`;
    return isBlockedIPv4(ipv4);
  }

  return false;
}
