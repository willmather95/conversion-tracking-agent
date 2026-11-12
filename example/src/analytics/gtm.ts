/**
 * Google Tag Manager loader and Consent Mode v2 defaults.
 *
 * The strings live here; `src/app/layout.tsx` renders them, in an order that is
 * visible at the wiring site because the order is the entire correctness
 * argument. See resolveGtmId below for what happens when the container ID is
 * absent, which is the state this repository is in until the owner sets it.
 */

/**
 * A real container ID. Rejects the documented placeholder explicitly: it
 * matches the shape, so shape alone would let `GTM-XXXXXXX` reach production
 * and request a container that does not exist.
 */
import { INTERNAL_KEY, INTERNAL_PARAM } from './guard.ts';

const CONTAINER_ID = /^GTM-[A-Z0-9]{4,}$/;
const PLACEHOLDER_ID = 'GTM-XXXXXXX';

let warned = false;

/**
 * The configured container, or null.
 *
 * Null means the layout renders no GTM at all: no snippet, no noscript iframe,
 * no client listeners. A snippet carrying a placeholder ID is worse than no
 * snippet, because it looks instrumented in view-source while every request it
 * makes 404s, so there is no half-configured state here.
 *
 * The warning is development-only and fires once per server process. In
 * production a missing container is a deployment decision, not a code fault,
 * and a warning on every render would be noise in the function logs.
 */
export function resolveGtmId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GTM_ID?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === 'development' && !warned) {
      warned = true;
      console.warn(
        '[analytics] NEXT_PUBLIC_GTM_ID is not set, so no Google Tag Manager ' +
          'snippet is being rendered and no event reaches GA4. This is the ' +
          'expected local state. Set it in .env.local to test tagging. See ' +
          'docs/gtm-ga4-setup.md.',
      );
    }
    return null;
  }

  if (raw === PLACEHOLDER_ID || !CONTAINER_ID.test(raw)) {
    if (process.env.NODE_ENV === 'development' && !warned) {
      warned = true;
      console.warn(
        `[analytics] NEXT_PUBLIC_GTM_ID is set to ${JSON.stringify(raw)}, ` +
          'which is not a usable container ID, so no snippet is being ' +
          'rendered. Expected the form GTM-XXXXXXX with a real container ID.',
      );
    }
    return null;
  }

  return raw;
}

/**
 * CONSENT MODE V2 DEFAULTS. This runs before the loader below, always.
 *
 * All four signals default to granted. That is a deliberate choice for a
 * United States only audience with no EEA or UK targeting: neither GDPR nor the
 * ePrivacy Directive applies to this traffic, and US state privacy law is an
 * opt-out regime rather than an opt-in one. Granted defaults are the honest
 * description of what actually happens today, and denied defaults with no
 * consent banner to update them would simply mean collecting nothing.
 *
 * The plumbing exists so that adding a banner later is a configuration change
 * rather than a rebuild of the tagging:
 *
 *   1. Flip the four values here from 'granted' to 'denied'.
 *   2. Add `wait_for_update: 500` alongside them, so tags hold briefly for the
 *      banner instead of firing on the denied default. It is deliberately
 *      absent right now, because with granted defaults it would delay every
 *      GA4 hit by up to half a second and buy nothing.
 *   3. Have the banner call `gtag('consent', 'update', { ... })` on a choice.
 *
 * Nothing downstream changes. GA4 tags queue and replay through Consent Mode
 * natively, which is one of the reasons this container has no Custom HTML tags:
 * a Custom HTML tag blocked at fire time is blocked permanently and never
 * replays.
 *
 * The gtag shim is the standard one. It must exist before any consent call, and
 * it deliberately shares `window.dataLayer` with the event helpers in
 * ./events.ts, which is what makes the arguments object readable by GTM.
 */
export const CONSENT_DEFAULTS_SNIPPET = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{'ad_storage':'granted','ad_user_data':'granted','ad_personalization':'granted','analytics_storage':'granted'});
`.trim();

/**
 * The standard GTM loader, wrapped in one internal-traffic check. `id` has
 * already been validated against CONTAINER_ID, so nothing user-controlled is
 * interpolated into the script.
 *
 * The check mirrors isInternal() in ./guard.ts (same param and storage key,
 * inlined because this runs as a plain inline script before hydration). When
 * the sticky internal flag is set, GTM never loads, so GA4 page views and
 * enhanced measurement hits stop too, not just the events from ./events.ts.
 */
export const GTM_INTERNAL_CHECK = `try{var q=new URLSearchParams(location.search).get('${INTERNAL_PARAM}');if(q==='1')localStorage.setItem('${INTERNAL_KEY}','1');if(q==='0')localStorage.removeItem('${INTERNAL_KEY}');if(localStorage.getItem('${INTERNAL_KEY}')==='1')return;}catch(e){}`;

export function gtmLoaderSnippet(id: string): string {
  return `(function(){${GTM_INTERNAL_CHECK}(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');})();`;
}

/** Source for the noscript iframe fallback. */
export function gtmNoscriptSrc(id: string): string {
  return `https://www.googletagmanager.com/ns.html?id=${id}`;
}
