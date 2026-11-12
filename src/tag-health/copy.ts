import { VENDOR_DOCS } from './patterns.ts';

/**
 * All visitor-facing copy for /tag-health-checker.
 *
 * FAQ answers are the same strings emitted as FAQPage JSON-LD. Do not edit one
 * without the other. No scores, no invented figures, no personal names.
 */

export const TAG_HEALTH_COPY = {
  metaTitle: 'Free Tag Health Checker: GA4, GTM, Meta',
  metaDescription:
    'Free tag checker. Paste a URL and see in seconds which GA4, GTM, Google Ads, Meta and consent tags load. No signup, no email, nothing stored.',
  headline: 'Tag Health Checker',
  subhead: 'See which tracking tags your page loads, in seconds. Free, no signup.',
  formLabel: 'Public page URL',
  formHint: 'Homepage or a landing page. http or https only.',
  submit: 'Check tags',
  pending: 'Checking tags',
  copyResults: 'Copy results',
  copied: 'Copied',
  cta: 'Test the whole journey',
  ctaHref: '/start?type=tracking',
  asOfPrefix: 'As of',
  fetchedPrefix: 'URL fetched',
} as const;

export const LIMITS_COPY = {
  heading: 'What a page scan cannot see',
  intro: 'A page scan reads what your page and your public tag container load. It cannot see:',
  items: [
    'whether a conversion actually fires when someone books, buys, or submits a form',
    'what happens after the click: the CRM, booking system, or offline import',
    'tags that only load after consent, after a click, or inside an app',
    'whether the ad platforms accept the data (diagnostics, match quality, duplicates on their side)',
  ],
  close: 'That is the part our tracking audit tests.',
} as const;

export const HOW_IT_WORKS = {
  heading: 'How it works',
  paragraphs: [
    'Paste a public page URL. The checker fetches that page on a server, reads the HTML, and then fetches up to two public Google Tag Manager container scripts it finds. Container JS is public; it is the same file a browser downloads.',
    'There is no headless browser in this version. Tags that only appear after JavaScript runs, after a consent choice, or after a click are invisible unless they are already in the HTML or the container. The result list says what was found, not whether a conversion works.',
    'Nothing is stored. The URL you paste and the findings are not kept after the result is returned.',
  ],
} as const;

export const CHECK_CATALOG: {
  title: string;
  detect: string;
  docUrl: string;
  docLabel: string;
}[] = [
  {
    title: 'Google Tag Manager present',
    detect: 'Looks for googletagmanager.com/gtm.js?id=GTM- in the HTML, or GTM- IDs in the inline snippet.',
    docUrl: VENDOR_DOCS.gtm.docUrl,
    docLabel: VENDOR_DOCS.gtm.docLabel,
  },
  {
    title: 'Multiple GTM containers',
    detect: 'Flags more than one distinct GTM- ID. Two containers can double-fire tags.',
    docUrl: VENDOR_DOCS.gtm.docUrl,
    docLabel: VENDOR_DOCS.gtm.docLabel,
  },
  {
    title: 'GA4 present',
    detect: 'Looks for gtag/js?id=G- in the HTML, or G- IDs inside a fetched GTM container.',
    docUrl: VENDOR_DOCS.gtm.docUrl,
    docLabel: VENDOR_DOCS.gtm.docLabel,
  },
  {
    title: 'Same GA4 ID loaded twice',
    detect: 'The same G- ID hardcoded in the HTML and inside GTM, or two gtag configs. Double-counted page views and events are the risk.',
    docUrl: VENDOR_DOCS.gtm.docUrl,
    docLabel: VENDOR_DOCS.gtm.docLabel,
  },
  {
    title: 'Google Ads tag present',
    detect: 'Looks for AW- IDs in the HTML or the container. Presence is not proof that conversions fire.',
    docUrl: VENDOR_DOCS.googleAds.docUrl,
    docLabel: VENDOR_DOCS.googleAds.docLabel,
  },
  {
    title: 'Meta Pixel present',
    detect: 'Looks for connect.facebook.net fbevents.js and fbq init with a pixel ID. More than one ID is flagged.',
    docUrl: VENDOR_DOCS.meta.docUrl,
    docLabel: VENDOR_DOCS.meta.docLabel,
  },
  {
    title: 'TikTok Pixel present',
    detect: 'Looks for analytics.tiktok.com and ttq.load with a pixel ID.',
    docUrl: VENDOR_DOCS.tiktok.docUrl,
    docLabel: VENDOR_DOCS.tiktok.docLabel,
  },
  {
    title: 'LinkedIn Insight Tag present',
    detect: 'Looks for snap.licdn.com insight.min.js and _linkedin_partner_id.',
    docUrl: VENDOR_DOCS.linkedin.docUrl,
    docLabel: VENDOR_DOCS.linkedin.docLabel,
  },
  {
    title: 'Microsoft UET present',
    detect: 'Looks for bat.bing.com/bat.js and a UET tag ID.',
    docUrl: VENDOR_DOCS.uet.docUrl,
    docLabel: VENDOR_DOCS.uet.docLabel,
  },
  {
    title: 'Consent mode default',
    detect: 'Looks for gtag consent default in the HTML before tag scripts, or consent settings visible in the container.',
    docUrl: VENDOR_DOCS.consent.docUrl,
    docLabel: VENDOR_DOCS.consent.docLabel,
  },
  {
    title: 'Consent banner (CMP) script',
    detect: 'Recognizes Cookiebot, OneTrust, Usercentrics, CookieYes, and Termly script hosts when they appear in the HTML.',
    docUrl: VENDOR_DOCS.consent.docUrl,
    docLabel: VENDOR_DOCS.consent.docLabel,
  },
  {
    title: 'Tag order',
    detect: 'Compares the position of a consent default with the first tag script in the HTML. Tags loading first is worth a look.',
    docUrl: VENDOR_DOCS.consent.docUrl,
    docLabel: VENDOR_DOCS.consent.docLabel,
  },
  {
    title: 'First-party / server-side signals',
    detect: 'Looks for GTM or gtag loaded from the site’s own domain, and for server_container_url or transport_url in the config.',
    docUrl: VENDOR_DOCS.serverSide.docUrl,
    docLabel: VENDOR_DOCS.serverSide.docLabel,
  },
  {
    title: 'Tags in noscript only / broken snippet',
    detect: 'A GTM noscript iframe without the script, or the script without the iframe, may mean a half-installed snippet.',
    docUrl: VENDOR_DOCS.gtm.docUrl,
    docLabel: VENDOR_DOCS.gtm.docLabel,
  },
];

export const TAG_HEALTH_FAQS: { q: string; a: string }[] = [
  {
    q: 'Is the tag checker free?',
    a: 'Yes. No signup, no email, no account.',
  },
  {
    q: 'Do you store the URLs I check?',
    a: 'No. The checker fetches the page, returns the result, and keeps neither the URL nor the findings.',
  },
  {
    q: 'Why does it say a tag is missing when I know it is there?',
    a: 'A page scan reads HTML and public GTM container scripts. Tags that load after consent, after a click, or from a script this tool cannot read will not show up.',
  },
  {
    q: 'Can it tell me if my conversions work?',
    a: 'No. It shows which tags load. Testing whether a conversion fires when someone books, buys, or submits a form needs the full journey.',
  },
  {
    q: 'What is consent mode and why does it matter?',
    a: 'Consent mode is Google’s way for tags to change behavior based on a visitor’s cookie choice. If a default is not in the HTML, it may still be set by your consent banner or inside GTM. Check with Tag Assistant. Google’s guide: https://developers.google.com/tag-platform/security/guides/consent',
  },
  {
    q: 'What does a first-party or server-side setup mean here?',
    a: 'It means GTM or gtag is loaded from the site’s own domain, or the config names a server container URL. That can mean more control over delivery. It does not prove the setup works. Google’s server-side Tag Manager docs: https://developers.google.com/tag-platform/tag-manager/server-side',
  },
];

/**
 * Dated worked example from a real fetch of the live homepage on 8 October 2026.
 * Kept as static copy so the page stays indexable without storing later scans.
 */
export const WORKED_EXAMPLE = {
  heading: 'A real run against this site',
  date: '8 October 2026',
  url: 'https://mathermediasolutions.com',
  intro:
    'On 8 October 2026 the checker fetched https://mathermediasolutions.com and the public container for GTM-XXXXXXX. These are the findings from that scan, not a grade.',
  rows: [
    { title: 'Google Tag Manager present', status: 'Found', detail: 'GTM-XXXXXXX in the page HTML.' },
    { title: 'Multiple GTM containers', status: 'Not found', detail: 'One GTM container ID is referenced.' },
    { title: 'GA4 present', status: 'Found', detail: 'G-XXXXXXXXXX in the GTM container, not hardcoded in the HTML.' },
    { title: 'Same GA4 ID loaded twice', status: 'Not found', detail: 'The measurement ID appeared in the container only.' },
    { title: 'Google Ads tag present', status: 'Not found', detail: 'No AW- ID in the HTML or the public container JS.' },
    { title: 'Meta Pixel present', status: 'Not found', detail: 'No fbevents.js or fbq init in the HTML.' },
    { title: 'TikTok Pixel present', status: 'Not found', detail: 'No TikTok pixel script in the HTML.' },
    { title: 'LinkedIn Insight Tag present', status: 'Not found', detail: 'No Insight Tag script in the HTML.' },
    { title: 'Microsoft UET present', status: 'Not found', detail: 'No UET script in the HTML.' },
    { title: 'Consent mode default', status: 'Found', detail: 'A gtag consent default is in the page HTML before the GTM loader.' },
    { title: 'Consent banner (CMP) script', status: 'Not found', detail: 'None recognized among the known CMP hosts.' },
    { title: 'Tag order', status: 'Found', detail: 'The consent default appears before the first tag script.' },
    { title: 'First-party / server-side signals', status: 'Not found', detail: 'GTM loads from googletagmanager.com. No server container URL was set in the config.' },
    { title: 'Tags in noscript only / broken snippet', status: 'Not found', detail: 'The GTM script and noscript iframe are both present.' },
  ],
} as const;

export const TAG_HEALTH_PAGE = {
  path: '/tag-health-checker',
  name: 'Tag Health Checker',
} as const;
