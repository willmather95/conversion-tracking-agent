import {
  GTM_PUBLIC_LOADER,
  MAX_CONTAINER_BYTES,
  MAX_GTM_CONTAINERS,
  MAX_HTML_BYTES,
  SCAN_TIMEOUT_MS,
} from './constants.ts';
import { detectTags } from './detect.ts';
import { fetchPublicText } from './fetch.ts';
import { GTM_ID_RE, GTM_SCRIPT_RE } from './patterns.ts';
import { assertPublicResolvedHost, hostnameOf, parsePageUrl } from './ssrf.ts';
import type { TagScanResult } from './types.ts';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function gtmIdsFromHtml(html: string): string[] {
  const fromLoader = [...html.matchAll(new RegExp(GTM_SCRIPT_RE.source, 'gi'))].map((match) => match[1]);
  const fromAny = html.match(new RegExp(GTM_ID_RE.source, 'g')) ?? [];
  return unique([...fromLoader, ...fromAny]).filter((id) => /^GTM-[A-Z0-9]{4,}$/.test(id));
}

export async function scanTagHealth(rawUrl: string, now = new Date()): Promise<TagScanResult> {
  const deadline = Date.now() + SCAN_TIMEOUT_MS;
  const parsed = parsePageUrl(rawUrl);
  await assertPublicResolvedHost(hostnameOf(parsed));

  const page = await fetchPublicText(parsed.toString(), MAX_HTML_BYTES, deadline);
  const ids = gtmIdsFromHtml(page.body).slice(0, MAX_GTM_CONTAINERS);
  const containers: { id: string; js: string }[] = [];

  for (const id of ids) {
    if (Date.now() >= deadline) break;
    try {
      const container = await fetchPublicText(
        `${GTM_PUBLIC_LOADER}?id=${encodeURIComponent(id)}`,
        MAX_CONTAINER_BYTES,
        deadline,
      );
      containers.push({ id, js: container.body });
    } catch {
      // A public container that fails to load still leaves the HTML findings.
    }
  }

  return detectTags({
    inputUrl: parsed.toString(),
    finalUrl: page.finalUrl,
    html: page.body,
    containers,
    scannedAt: now.toISOString(),
  });
}
