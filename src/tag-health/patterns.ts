/**
 * Detection patterns for the Tag Health Checker.
 *
 * Each vendor block records the public doc the result row links to, and the
 * date the pattern was last checked against that doc. Re-verify quarterly.
 *
 * These are static artifacts: HTML plus public GTM container JS. Runtime-only
 * tags will not match, and the result copy says so.
 */

export type VendorPattern = {
  id: string;
  lastVerified: string;
  docUrl: string;
  docLabel: string;
};

export const VENDOR_DOCS = {
  gtm: {
    id: 'gtm',
    lastVerified: '2026-10-08',
    docUrl: 'https://developers.google.com/tag-platform/tag-manager/web',
    docLabel: 'Google Tag Manager for web',
  },
  googleAds: {
    id: 'google-ads',
    lastVerified: '2026-10-08',
    docUrl: 'https://support.google.com/google-ads/answer/7548399',
    docLabel: 'Google Ads conversion tracking',
  },
  meta: {
    id: 'meta',
    lastVerified: '2026-10-08',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/get-started',
    docLabel: 'Meta Pixel',
  },
  tiktok: {
    id: 'tiktok',
    lastVerified: '2026-10-08',
    docUrl: 'https://ads.tiktok.com/help/article/get-started-pixel',
    docLabel: 'TikTok Pixel',
  },
  linkedin: {
    id: 'linkedin',
    lastVerified: '2026-10-08',
    docUrl: 'https://www.linkedin.com/help/lms/answer/a418880',
    docLabel: 'LinkedIn Insight Tag',
  },
  uet: {
    id: 'uet',
    lastVerified: '2026-10-08',
    docUrl: 'https://help.ads.microsoft.com/apex/index/3/en/56682',
    docLabel: 'Microsoft UET',
  },
  consent: {
    id: 'consent',
    lastVerified: '2026-10-08',
    docUrl: 'https://developers.google.com/tag-platform/security/guides/consent',
    docLabel: 'Google consent mode',
  },
  serverSide: {
    id: 'server-side',
    lastVerified: '2026-10-08',
    docUrl: 'https://developers.google.com/tag-platform/tag-manager/server-side',
    docLabel: 'Server-side Tag Manager',
  },
  gateway: {
    id: 'gateway',
    lastVerified: '2026-10-08',
    docUrl: 'https://developers.google.com/tag-platform/tag-manager/gateway',
    docLabel: 'Gateway for Google Tag Manager',
  },
} as const satisfies Record<string, VendorPattern>;

export const GTM_ID_RE = /GTM-[A-Z0-9]{4,}/g;
export const GA4_ID_RE = /\bG-[A-Z0-9]{6,}\b/g;
export const AW_ID_RE = /\bAW-\d{6,}\b/g;

export const GTM_SCRIPT_RE = /googletagmanager\.com\/gtm\.js\?id=(GTM-[A-Z0-9]{4,})/gi;
export const GTM_NOSCRIPT_RE = /googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]{4,})/gi;
export const GTAG_GA4_RE = /gtag\/js\?id=(G-[A-Z0-9]{6,})/gi;
export const GTAG_CONFIG_GA4_RE = /gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]{6,})['"]/gi;

export const FB_EVENTS_RE = /connect\.facebook\.net\/[^"'>\s]+\/fbevents\.js/i;
export const FBQ_INIT_RE = /fbq\s*\(\s*['"]init['"]\s*,\s*['"]?(\d{5,})['"]?/gi;

export const TIKTOK_HOST_RE = /analytics\.tiktok\.com/i;
export const TTQ_LOAD_RE = /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/gi;

export const LINKEDIN_SCRIPT_RE = /snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js/i;
export const LINKEDIN_PARTNER_RE = /_linkedin_partner_id\s*=\s*['"]?(\d{3,})/gi;

export const UET_SCRIPT_RE = /bat\.bing\.com\/bat\.js/i;
export const UET_TI_RE = /(?:['"]ti['"]\s*:\s*['"]?(\d{5,})|uetq\.push\(\s*['"]ti['"]\s*,\s*['"]?(\d{5,})|,\s*['"](\d{5,})['"]\s*\)\s*;?\s*\(window,\s*document,\s*['"]script['"]\s*,\s*['"]https:\/\/bat\.bing\.com)/gi;

export const CONSENT_DEFAULT_RE = /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]/i;

export const SERVER_URL_ASSIGN_RE =
  /(?:server_container_url|transport_url|vtp_serverContainerUrl|vtp_transportUrl)\s*"?\s*:\s*"https?:\/\//i;

export const CMP_HOSTS: { name: string; test: RegExp }[] = [
  { name: 'Cookiebot', test: /consent\.cookiebot\.com|cookiebot\.com\/uc\.js/i },
  { name: 'OneTrust', test: /cdn\.cookielaw\.org|onetrust\.com/i },
  { name: 'Usercentrics', test: /usercentrics\.eu|privacy-proxy\.usercentrics/i },
  { name: 'CookieYes', test: /cdn-cookieyes\.com|cookieyes\.com/i },
  { name: 'Termly', test: /app\.termly\.io|termly\.io/i },
];

export const THIRD_PARTY_TAG_HOSTS = [
  'googletagmanager.com',
  'www.googletagmanager.com',
  'google-analytics.com',
  'www.google-analytics.com',
  'www.googleadservices.com',
  'googleadservices.com',
  'www.googlesyndication.com',
];

export const TAG_SCRIPT_MARKERS = [
  'googletagmanager.com/gtm.js',
  'googletagmanager.com/gtag/js',
  'google-analytics.com/gtag/js',
  'google-analytics.com/analytics.js',
  'connect.facebook.net',
  'analytics.tiktok.com',
  'snap.licdn.com/li.lms-analytics/insight.min.js',
  'bat.bing.com/bat.js',
];
