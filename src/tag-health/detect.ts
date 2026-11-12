/**
 * The 14 Tag Health Checker reads. All of them run on HTML plus optional
 * public GTM container JS. Absence is not a runtime proof that a tag never
 * fires; the result copy keeps that limit in view.
 */

import type { TagCheckId, TagCheckResult, TagScanResult } from './types.ts';
import {
  AW_ID_RE,
  CMP_HOSTS,
  CONSENT_DEFAULT_RE,
  FBQ_INIT_RE,
  FB_EVENTS_RE,
  GA4_ID_RE,
  GTAG_CONFIG_GA4_RE,
  GTAG_GA4_RE,
  GTM_ID_RE,
  GTM_NOSCRIPT_RE,
  GTM_SCRIPT_RE,
  LINKEDIN_PARTNER_RE,
  LINKEDIN_SCRIPT_RE,
  SERVER_URL_ASSIGN_RE,
  TAG_SCRIPT_MARKERS,
  THIRD_PARTY_TAG_HOSTS,
  TIKTOK_HOST_RE,
  TTQ_LOAD_RE,
  UET_SCRIPT_RE,
  UET_TI_RE,
  VENDOR_DOCS,
} from './patterns.ts';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function collect(source: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const found: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const value = match.slice(1).find((group) => group) ?? match[0];
    if (value) found.push(value);
  }
  return unique(found);
}

function containerConfigSlice(gtmJs: string): string {
  const dataMark = gtmJs.indexOf('var data = {');
  const runtimeMark = gtmJs.indexOf('"runtime"');
  if (dataMark >= 0 && runtimeMark > dataMark) {
    return gtmJs.slice(dataMark, runtimeMark);
  }
  return '';
}

function firstIndex(haystack: string, needles: string[]): number | null {
  let best: number | null = null;
  const lower = haystack.toLowerCase();
  for (const needle of needles) {
    const index = lower.indexOf(needle.toLowerCase());
    if (index === -1) continue;
    if (best === null || index < best) best = index;
  }
  return best;
}

function hostOfSrc(src: string, pageUrl: string): string | null {
  try {
    return new URL(src, pageUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function siteHost(pageUrl: string): string {
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function hostBelongsToSite(loaderHost: string, pageHost: string): boolean {
  if (!loaderHost || !pageHost) return false;
  return loaderHost === pageHost || loaderHost.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${loaderHost}`);
}

function isGoogleTagHost(host: string): boolean {
  const bare = host.replace(/^www\./, '').toLowerCase();
  return THIRD_PARTY_TAG_HOSTS.some((entry) => entry.replace(/^www\./, '') === bare);
}

function scriptSources(html: string): string[] {
  const srcs: string[] = [];
  const attr = /<script\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(html)) !== null) srcs.push(match[1]);
  const assigned = /j\.src\s*=\s*['"]([^'"]+)['"]/gi;
  while ((match = assigned.exec(html)) !== null) srcs.push(match[1]);
  return srcs;
}

function row(
  id: TagCheckId,
  title: string,
  status: TagCheckResult['status'],
  ids: string[],
  meaning: string,
  doc: { docUrl: string; docLabel: string },
  where?: string,
): TagCheckResult {
  return { id, title, status, ids, meaning, docUrl: doc.docUrl, docLabel: doc.docLabel, ...(where ? { where } : {}) };
}

export type ScanArtifacts = {
  inputUrl: string;
  finalUrl: string;
  html: string;
  containers: { id: string; js: string }[];
  scannedAt: string;
};

export function detectTags(artifacts: ScanArtifacts): TagScanResult {
  const html = artifacts.html;
  const containerJs = artifacts.containers.map((entry) => entry.js).join('\n');
  const containerConfig = artifacts.containers.map((entry) => containerConfigSlice(entry.js)).join('\n');
  const combined = `${html}\n${containerJs}`;

  const gtmHtml = unique([
    ...collect(html, GTM_SCRIPT_RE),
    ...collect(html, GTM_ID_RE),
  ]);
  const gtmNoscript = collect(html, GTM_NOSCRIPT_RE);
  const gtmScriptPresent = GTM_SCRIPT_RE.test(html) || /googletagmanager\.com\/gtm\.js/i.test(html);
  GTM_SCRIPT_RE.lastIndex = 0;
  const gtmNoscriptPresent = GTM_NOSCRIPT_RE.test(html);
  GTM_NOSCRIPT_RE.lastIndex = 0;

  const ga4Html = unique([...collect(html, GTAG_GA4_RE), ...collect(html, GTAG_CONFIG_GA4_RE), ...collect(html, GA4_ID_RE)]);
  const ga4Container = unique([...collect(containerConfig || containerJs, GA4_ID_RE)]);
  const ga4All = unique([...ga4Html, ...ga4Container]);
  const ga4Overlap = ga4Html.filter((id) => ga4Container.includes(id));
  const ga4HtmlConfigs = collect(html, GTAG_CONFIG_GA4_RE);
  const ga4HtmlDouble = ga4HtmlConfigs.filter((id, index) => ga4HtmlConfigs.indexOf(id) !== index);

  const awIds = collect(combined, AW_ID_RE);

  const metaIds = collect(html, FBQ_INIT_RE);
  const metaScript = FB_EVENTS_RE.test(html);

  const tiktokIds = collect(html, TTQ_LOAD_RE);
  const tiktokScript = TIKTOK_HOST_RE.test(html);

  const linkedinIds = collect(html, LINKEDIN_PARTNER_RE);
  const linkedinScript = LINKEDIN_SCRIPT_RE.test(html);

  const uetIds = collect(html, UET_TI_RE);
  const uetScript = UET_SCRIPT_RE.test(html);

  const consentInPage = CONSENT_DEFAULT_RE.test(html);
  const consentInContainer =
    /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]/i.test(containerConfig) ||
    /"consentStatus"\s*:\s*"(NEEDED|GRANTED)"/i.test(containerConfig);

  const cmps = CMP_HOSTS.filter((cmp) => cmp.test.test(html)).map((cmp) => cmp.name);

  const consentIndex = html.search(CONSENT_DEFAULT_RE);
  const tagIndex = firstIndex(html, TAG_SCRIPT_MARKERS);

  const pageHost = siteHost(artifacts.finalUrl);
  const loaderHosts = scriptSources(html)
    .map((src) => {
      const resolved = src.includes('://') || src.startsWith('/') ? src : src;
      // The standard GTM snippet concatenates id after a googletagmanager URL.
      const filled = resolved.endsWith('id=') && gtmHtml[0] ? `${resolved}${gtmHtml[0]}` : resolved;
      return { src: filled, host: hostOfSrc(filled, artifacts.finalUrl) };
    })
    .filter((entry) => /gtm\.js|gtag\/js/i.test(entry.src));

  const customLoader = loaderHosts.filter((entry) => entry.host && !isGoogleTagHost(entry.host));
  const firstPartyOnSite = customLoader.filter(
    (entry) => entry.host && hostBelongsToSite(entry.host, pageHost),
  );
  const serverUrlConfigured = SERVER_URL_ASSIGN_RE.test(html) || SERVER_URL_ASSIGN_RE.test(containerConfig);
  const firstPartyHosts = unique(customLoader.map((entry) => entry.host).filter((host): host is string => Boolean(host)));

  const checks: TagCheckResult[] = [
    row(
      'gtm',
      'Google Tag Manager present',
      gtmHtml.length ? 'found' : 'not_found',
      gtmHtml,
      gtmHtml.length
        ? `Container ${gtmHtml.join(', ')} is referenced in the page HTML.`
        : 'No GTM container ID showed up in the HTML. It may still load after JavaScript runs.',
      VENDOR_DOCS.gtm,
    ),
    row(
      'multiple-gtm',
      'Multiple GTM containers',
      gtmHtml.length > 1 ? 'needs_look' : 'not_found',
      gtmHtml,
      gtmHtml.length > 1
        ? 'More than one GTM container ID is on the page. Two containers can double-fire tags.'
        : gtmHtml.length === 1
          ? 'One GTM container ID is referenced.'
          : 'No GTM container IDs to compare.',
      VENDOR_DOCS.gtm,
    ),
    row(
      'ga4',
      'GA4 present',
      ga4All.length ? 'found' : 'not_found',
      ga4All,
      ga4All.length
        ? `Measurement ID${ga4All.length === 1 ? '' : 's'} ${ga4All.join(', ')}.`
        : 'No GA4 measurement ID showed up in the HTML or the public container JS.',
      VENDOR_DOCS.gtm,
      ga4Html.length && ga4Container.length
        ? 'In the page HTML and in a GTM container'
        : ga4Html.length
          ? 'In the page HTML'
          : ga4Container.length
            ? 'In a GTM container'
            : undefined,
    ),
    row(
      'ga4-double',
      'Same GA4 ID loaded twice',
      ga4Overlap.length || ga4HtmlDouble.length ? 'needs_look' : 'not_found',
      unique([...ga4Overlap, ...ga4HtmlDouble]),
      ga4Overlap.length || ga4HtmlDouble.length
        ? 'The same GA4 ID appears more than once (hardcoded on the page and inside GTM, or two gtag configs). That is a double-count risk for page views and events.'
        : 'No repeated GA4 measurement ID showed up in both the HTML and the container.',
      VENDOR_DOCS.gtm,
    ),
    row(
      'google-ads',
      'Google Ads tag present',
      awIds.length ? 'found' : 'not_found',
      awIds,
      awIds.length
        ? `Google Ads tag ${awIds.join(', ')} is present. This scan cannot confirm that conversions fire.`
        : 'No AW- conversion ID showed up in the HTML or the public container JS.',
      VENDOR_DOCS.googleAds,
    ),
    row(
      'meta',
      'Meta Pixel present',
      metaIds.length > 1 ? 'needs_look' : metaIds.length ? 'found' : metaScript ? 'needs_look' : 'not_found',
      metaIds,
      metaIds.length > 1
        ? `More than one Meta pixel ID is on the page: ${metaIds.join(', ')}.`
        : metaIds.length === 1
          ? `Meta pixel ${metaIds[0]} is initialized in the HTML.`
          : metaScript
            ? 'The Meta pixel script is referenced, but no fbq init ID was found in the HTML.'
            : 'No Meta pixel script or fbq init call showed up in the HTML.',
      VENDOR_DOCS.meta,
    ),
    row(
      'tiktok',
      'TikTok Pixel present',
      tiktokIds.length ? 'found' : tiktokScript ? 'needs_look' : 'not_found',
      tiktokIds,
      tiktokIds.length
        ? `TikTok pixel ${tiktokIds.join(', ')} is referenced in the HTML.`
        : tiktokScript
          ? 'A TikTok analytics script is referenced, but no ttq.load ID was found in the HTML.'
          : 'No TikTok pixel script or ttq.load call showed up in the HTML.',
      VENDOR_DOCS.tiktok,
    ),
    row(
      'linkedin',
      'LinkedIn Insight Tag present',
      linkedinIds.length ? 'found' : linkedinScript ? 'needs_look' : 'not_found',
      linkedinIds,
      linkedinIds.length
        ? `LinkedIn partner ID ${linkedinIds.join(', ')} is referenced in the HTML.`
        : linkedinScript
          ? 'The LinkedIn Insight Tag script is referenced, but no partner ID was found in the HTML.'
          : 'No LinkedIn Insight Tag script or partner ID showed up in the HTML.',
      VENDOR_DOCS.linkedin,
    ),
    row(
      'uet',
      'Microsoft UET present',
      uetIds.length ? 'found' : uetScript ? 'needs_look' : 'not_found',
      uetIds,
      uetIds.length
        ? `UET tag ${uetIds.join(', ')} is referenced in the HTML.`
        : uetScript
          ? 'The Microsoft UET script is referenced, but no tag ID was found in the HTML.'
          : 'No Microsoft UET script or tag ID showed up in the HTML.',
      VENDOR_DOCS.uet,
    ),
    row(
      'consent-default',
      'Consent mode default',
      consentInPage || consentInContainer ? 'found' : 'not_found',
      [],
      consentInPage && consentInContainer
        ? 'A consent mode default is in the page HTML and consent settings are visible in the container.'
        : consentInPage
          ? 'A gtag consent default is in the page HTML.'
          : consentInContainer
            ? 'Consent settings are visible in the public GTM container. No consent default was found in the HTML.'
            : 'No consent mode default showed up in the HTML or the public container. It may still be set by your consent banner or inside GTM; check with Tag Assistant.',
      VENDOR_DOCS.consent,
      consentInPage && consentInContainer
        ? 'In the page HTML and in a GTM container'
        : consentInPage
          ? 'In the page HTML'
          : consentInContainer
            ? 'In a GTM container'
            : undefined,
    ),
    row(
      'cmp',
      'Consent banner (CMP) script',
      cmps.length ? 'found' : 'not_found',
      cmps,
      cmps.length ? `Recognized consent banner: ${cmps.join(', ')}.` : 'None recognized among Cookiebot, OneTrust, Usercentrics, CookieYes, and Termly.',
      VENDOR_DOCS.consent,
    ),
    row(
      'tag-order',
      'Tag order',
      tagIndex === null
        ? 'not_found'
        : consentIndex !== -1 && consentIndex < tagIndex
          ? 'found'
          : 'needs_look',
      [],
      tagIndex === null
        ? 'No tag scripts were found in the HTML, so load order cannot be judged from this scan.'
        : consentIndex !== -1 && consentIndex < tagIndex
          ? 'A consent mode default appears in the HTML before the first tag script.'
          : consentIndex === -1
            ? 'Tag scripts appear in the HTML without a consent mode default ahead of them. That is worth a look in Tag Assistant.'
            : 'A tag script appears in the HTML before the consent mode default. That is worth a look in Tag Assistant.',
      VENDOR_DOCS.consent,
    ),
    row(
      'first-party',
      'First-party / server-side signals',
      firstPartyOnSite.length || customLoader.length || serverUrlConfigured ? 'found' : 'not_found',
      firstPartyHosts,
      firstPartyOnSite.length || customLoader.length || serverUrlConfigured
        ? 'Looks like a first-party or server-side setup. This scan cannot prove that it works.'
        : 'GTM and gtag, where present, load from Google hosts, and no server_container_url or transport_url was set in the HTML or container config.',
      VENDOR_DOCS.serverSide,
    ),
    row(
      'gtm-snippet',
      'Tags in noscript only / broken snippet',
      gtmScriptPresent !== gtmNoscriptPresent && (gtmScriptPresent || gtmNoscriptPresent)
        ? 'needs_look'
        : 'not_found',
      unique([...gtmHtml, ...gtmNoscript]),
      gtmScriptPresent && !gtmNoscriptPresent
        ? 'The GTM script is present without the noscript iframe. The snippet may be half-installed.'
        : gtmNoscriptPresent && !gtmScriptPresent
          ? 'The GTM noscript iframe is present without the script. The snippet may be half-installed.'
          : gtmScriptPresent && gtmNoscriptPresent
            ? 'The GTM script and noscript iframe are both present.'
            : 'No GTM script or noscript iframe showed up in the HTML.',
      VENDOR_DOCS.gtm,
    ),
  ];

  return {
    inputUrl: artifacts.inputUrl,
    finalUrl: artifacts.finalUrl,
    scannedAt: artifacts.scannedAt,
    checks,
  };
}
