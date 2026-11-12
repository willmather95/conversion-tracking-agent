/**
 * Tag Health Checker: SSRF rejections that must hold without a network hop.
 *
 * Detection of the 14 checks is exercised against live public pages after the
 * route is up. This file stays Node-loadable: it only imports ssrf.ts, which
 * uses Node builtins and has no relative value imports.
 *
 *   node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/tag-health-qa.mjs
 */

import {
  isBlockedIp,
  parsePageUrl,
  ScanError,
  hostnameOf,
  assertPublicHostname,
} from '../src/tag-health/ssrf.ts';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const blockedIps = [
  '127.0.0.1',
  '10.0.0.1',
  '192.168.1.1',
  '169.254.169.254',
  '172.16.0.1',
  '0.0.0.0',
  '255.255.255.255',
  '::1',
  'fe80::1',
  'fc00::1',
  '::ffff:127.0.0.1',
  '2001:db8::1',
];

for (const ip of blockedIps) {
  assert(isBlockedIp(ip), `expected ${ip} to be blocked`);
}

assert(!isBlockedIp('8.8.8.8'), '8.8.8.8 is public');
assert(!isBlockedIp('1.1.1.1'), '1.1.1.1 is public');

function expectBlocked(raw) {
  try {
    const url = parsePageUrl(raw);
    assertPublicHostname(hostnameOf(url));
    throw new Error(`expected ${raw} to be rejected`);
  } catch (error) {
    assert(error instanceof ScanError, `${raw} should throw ScanError`);
    assert(
      error.code === 'blocked' || error.code === 'invalid_url',
      `${raw} rejected with ${error.code}`,
    );
  }
}

expectBlocked('javascript:alert(1)');
expectBlocked('file:///etc/passwd');
expectBlocked('ftp://example.com');
expectBlocked('http://127.0.0.1');
expectBlocked('http://localhost/');
expectBlocked('http://169.254.169.254/latest/meta-data/');
expectBlocked('http://[::1]/');
expectBlocked('https://user:pass@example.com');

const parsed = parsePageUrl('mathermediasolutions.com');
assert(parsed.protocol === 'https:', 'bare hosts should gain https');
assert(parsed.hostname === 'mathermediasolutions.com', 'bare host kept');

console.log('tag-health-qa: pass');
