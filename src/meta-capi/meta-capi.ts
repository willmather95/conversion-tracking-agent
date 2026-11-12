/**
 * META CONVERSIONS API: the lead, sent to Meta from the server.
 *
 * Why server side and not a pixel: the container has a hard rule against
 * Custom HTML tags (scripts/gtm-parity-qa.mjs), and a browser pixel is the
 * thing the niche pages warn prospects about. The server already knows the
 * one fact Meta needs, that a lead was accepted, and it knows it only after a
 * transport stored the lead, so Meta never counts a lead the owner never got.
 *
 * What is sent, and nothing else:
 *   - event_name: Lead (diagnostic, audits, enquiry) or CompleteRegistration
 *     (the Signal Check subscriber offer), so bidding can tell them apart.
 *     The Bulk Judge early-access list sends nothing at all (metaCountsVariant):
 *     a waiting list for a free plugin is neither, and counting it would
 *     teach bidding to buy sign-ups instead of clients. A lead Jev quarantined
 *     as spam sends nothing either (metaCountsLead), for the same reason.
 *   - event_id: the lead's submission ID, so a retry can never double count
 *   - em: the work email, normalized and SHA-256 hashed as Meta requires
 *   - fbc: built from the fbclid the visitor landed with (src/lib/attribution)
 *   - client IP and user agent from the request, for match quality
 *   - event_source_url: the page the form was on, without its query string
 * No form answers, no free text, no website, no name.
 *
 * Off unless configured: META_PIXEL_ID (the dataset ID) and META_CAPI_TOKEN
 * must both be set. META_TEST_EVENT_CODE routes events to Test Events in
 * Events Manager. META_GRAPH_VERSION overrides the Graph API version.
 *
 * No runtime imports on purpose, so scripts/meta-capi-qa.mjs can load this
 * file directly with Node's type stripping.
 */
import { createHash } from 'node:crypto';
import type { Attribution } from './attribution-types.ts';

export const DEFAULT_GRAPH_VERSION = 'v23.0';
const TIMEOUT_MS = 5_000;

export type MetaCapiConfig = {
  pixelId: string;
  token: string;
  version: string;
  testEventCode?: string;
};

export function metaCapiConfig(env: Record<string, string | undefined>): MetaCapiConfig | null {
  const pixelId = env.META_PIXEL_ID?.trim();
  const token = env.META_CAPI_TOKEN?.trim();
  if (!pixelId || !token || !/^\d+$/.test(pixelId)) return null;
  const version = env.META_GRAPH_VERSION?.trim();
  const testEventCode = env.META_TEST_EVENT_CODE?.trim();
  return {
    pixelId,
    token,
    version: version && /^v\d+\.\d+$/.test(version) ? version : DEFAULT_GRAPH_VERSION,
    ...(testEventCode ? { testEventCode } : {}),
  };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Meta's normalization for email: trimmed, lowercased. */
export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}

/** fbc as Meta defines it: fb.1.<click time in ms>.<fbclid>. */
export function fbcFor(attribution: Attribution | null, fallbackMs: number): string | undefined {
  if (!attribution?.fbclid) return undefined;
  const captured = Date.parse(attribution.captured_at);
  return `fb.1.${Number.isNaN(captured) ? fallbackMs : captured}.${attribution.fbclid}`;
}

/** The page URL without query or fragment, or undefined when it is not http(s). */
export function sourceUrl(referer: string | null | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

/** First address in x-forwarded-for, which is the client on Vercel. */
export function clientIp(forwardedFor: string | null | undefined): string | undefined {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first ? first : undefined;
}

export type MetaLeadInput = {
  variant: string;
  submissionId: string;
  email: string;
  attribution: Attribution | null;
  /** Unix seconds. */
  eventTime: number;
  ip?: string;
  userAgent?: string;
  eventSourceUrl?: string;
};

/** Variants that never reach Meta. A waiting list is not a conversion. */
const NOT_SENT_TO_META = new Set(['early-access']);

export function metaCountsVariant(variant: string): boolean {
  return !NOT_SENT_TO_META.has(variant);
}

/**
 * Whether an accepted lead is reported: not a waiting list, and not a lead
 * Jev quarantined as spam (src/lib/lead/jev.ts), so bots never train bidding.
 */
export function metaCountsLead(variant: string, triage: { quarantine: boolean } | null): boolean {
  return metaCountsVariant(variant) && !triage?.quarantine;
}

export function metaEventName(variant: string): 'Lead' | 'CompleteRegistration' {
  return variant === 'signal-check' ? 'CompleteRegistration' : 'Lead';
}

export function metaLeadEvent(input: MetaLeadInput) {
  const fbc = fbcFor(input.attribution, input.eventTime * 1000);
  return {
    event_name: metaEventName(input.variant),
    event_time: input.eventTime,
    event_id: input.submissionId,
    action_source: 'website' as const,
    ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
    user_data: {
      em: [hashEmail(input.email)],
      ...(fbc ? { fbc } : {}),
      ...(input.ip ? { client_ip_address: input.ip } : {}),
      ...(input.userAgent ? { client_user_agent: input.userAgent.slice(0, 512) } : {}),
    },
    custom_data: { lead_source: input.variant },
  };
}

/**
 * POST one event. Throws on a non-2xx so the caller can log it; the caller
 * runs this after the response, so a Meta outage never touches the lead.
 */
export async function sendMetaEvent(
  config: MetaCapiConfig,
  event: ReturnType<typeof metaLeadEvent>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const endpoint = `https://graph.facebook.com/${config.version}/${config.pixelId}/events`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: [event],
      access_token: config.token,
      ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    // Status only: Meta error bodies can echo the request, which holds a hash
    // of the email and the access token.
    throw new Error(`meta capi responded ${response.status}`);
  }
}
