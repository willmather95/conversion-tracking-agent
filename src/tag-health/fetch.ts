/**
 * Bounded HTTP GET used by the Tag Health Checker.
 *
 * Redirects are followed by hand so each hop is DNS-checked. Time and size
 * are capped. The User-Agent names the tool and the page that offers it.
 */

import { TAG_HEALTH_USER_AGENT, MAX_REDIRECTS } from './constants.ts';
import {
  ScanError,
  assertPublicResolvedHost,
  hostnameOf,
  parsePageUrl,
} from './ssrf.ts';

export type FetchedPage = {
  finalUrl: string;
  body: string;
  contentType: string;
};

function remainingMs(deadline: number): number {
  return Math.max(1, deadline - Date.now());
}

function timeoutSignal(deadline: number): AbortSignal {
  return AbortSignal.timeout(remainingMs(deadline));
}

async function readCapped(response: Response, maxBytes: number, deadline: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ScanError('The page is larger than this checker will read.', 'too_large');
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new ScanError('The page is larger than this checker will read.', 'too_large');
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    if (Date.now() > deadline) {
      await reader.cancel().catch(() => undefined);
      throw new ScanError('The page took too long to respond. Try again, or try a simpler URL.', 'timeout');
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ScanError('The page is larger than this checker will read.', 'too_large');
    }
    chunks.push(value);
  }

  const all = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(all);
}

async function getOnce(url: URL, deadline: number): Promise<Response> {
  await assertPublicResolvedHost(hostnameOf(url));
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: timeoutSignal(deadline),
      headers: {
        'user-agent': TAG_HEALTH_USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/javascript,text/javascript,text/plain;q=0.9,*/*;q=0.1',
      },
    });
  } catch (error) {
    if (error instanceof ScanError) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new ScanError('The page took too long to respond. Try again, or try a simpler URL.', 'timeout');
    }
    throw new ScanError('The page could not be fetched.', 'fetch_failed');
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

export async function fetchPublicText(rawUrl: string, maxBytes: number, deadline: number): Promise<FetchedPage> {
  let current = parsePageUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (Date.now() > deadline) {
      throw new ScanError('The page took too long to respond. Try again, or try a simpler URL.', 'timeout');
    }

    const response = await getOnce(current, deadline);

    if (isRedirect(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      if (hop === MAX_REDIRECTS) {
        throw new ScanError('The page could not be fetched.', 'fetch_failed');
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new ScanError('The page could not be fetched.', 'fetch_failed');
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new ScanError('The page could not be fetched.', 'fetch_failed');
      }
      if (next.protocol !== 'http:' && next.protocol !== 'https:') {
        throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
      }
      if (next.username || next.password) {
        throw new ScanError('That address cannot be scanned. Use a public website URL.', 'blocked');
      }
      current = next;
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new ScanError('The page could not be fetched.', 'fetch_failed');
    }

    const contentType = response.headers.get('content-type') ?? '';
    const body = await readCapped(response, maxBytes, deadline);
    return { finalUrl: current.toString(), body, contentType };
  }

  throw new ScanError('The page could not be fetched.', 'fetch_failed');
}
