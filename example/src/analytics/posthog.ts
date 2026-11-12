/**
 * POSTHOG. Product analytics, session replay and heatmaps, alongside GA4.
 *
 * GA4 answers "how many came and from where". PostHog answers "what did they
 * do on the page": recordings, heatmaps, and the step where a form was
 * abandoned. That second question is what conversion changes are made from.
 *
 * The project token is a PUBLIC client key (it can only write events, never
 * read them), so a committed default is safe. NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
 * overrides it, which is how a separate project would be swapped in later
 * without a code change.
 *
 * Requests go through the /ingest rewrite in next.config.ts, a first-party
 * path, so blockers that drop *.posthog.com do not silently thin the data.
 *
 * Privacy, matching /privacy:
 *   - every input is masked in recordings (maskAllInputs), and anything marked
 *     data-ph-mask has its text masked too;
 *   - no identify() call anywhere, so no email or name ever reaches PostHog;
 *   - person profiles only for identified users, which is none of them;
 *   - GPC checked explicitly (guard.ts), respect_dnt for DNT.
 *
 * This file must stay importable from Node with no build step (see the
 * constraints in ./events.ts), so it holds constants and types only.
 */

export const POSTHOG_DEFAULT_TOKEN = 'phc_REPLACE_WITH_YOUR_PROJECT_KEY';

/** First-party proxy path. See the rewrites in next.config.ts. */
export const POSTHOG_PROXY_PATH = '/ingest';
export const POSTHOG_UI_HOST = 'https://us.posthog.com';

/**
 * One PostHog project serves more than one site (the free plan allows one),
 * so every event carries this super property as well as $host.
 */
export const POSTHOG_SITE = 'mms';

/** The minimal surface events.ts needs. Avoids a value import of posthog-js. */
export type PostHogCaptureTarget = {
  capture: (event: string, properties?: Record<string, unknown>) => unknown;
};

export type PostHogWindow = Window & { posthog?: PostHogCaptureTarget };
