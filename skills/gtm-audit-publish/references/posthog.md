# PostHog alignment checklist

Use this when a site runs PostHog next to GTM, GA4 and ad pixels. The goal:
one event spec, one consent decision, one definition of "internal", and every
tool counting the same outcome the same way.

## 1. One event spec feeds everything
- Keep one registry (a typed file in the repo, or the tracking-plan JSON) that
  holds each event name and its parameters. The site writes it once, to the
  dataLayer. GTM maps it to GA4 and Ads, and the same helper forwards it to
  PostHog with the same name and the same parameters.
- Don't let PostHog get its own names for the same outcome (for example,
  `affiliate_click` in PostHog while GA4 gets `outbound_affiliate_click`). If a
  second name is needed, document the mapping in the registry.
- A conversion fires only on confirmed success (a 2xx response or a provider
  callback), never on a click or a submit attempt. The same rule holds in all
  tools. Carry one `event_id` per outcome and send the same ID to Meta, TikTok
  and PostHog, so replays and reloads can be found and removed.
- Use an allowlist when forwarding. Rebuild each property object; never spread
  the dataLayer payload. New fields then can't leak by default.
- Add a parity check: a script or test that fails when a registry event has no
  GTM trigger or tag, or no PostHog forward (or no explicit "not forwarded").
- A server-side counter (cookieless, one shared `distinct_id`,
  `$process_person_profile: false`, `$ip: null`) is a good way to count
  everyone without consent. Give it its own name (for example `*_counted`) and
  never add it to the browser event.

## 2. Consent
- PostHog follows the same choice as GA4 and the pixels, from the same source
  of truth (the site's consent store, not a second banner).
- Opt-in sites: load the SDK only after consent. Re-check on every event with
  `before_send`, so a withdrawal or a hop to a private route sends nothing.
- Default-on (US) sites: honor GPC and Do Not Track yourself, and test that
  posthog-js really drops the event. Offer an off switch that calls
  `opt_out_capturing()`.
- Before consent, choose: no SDK, `persistence: 'memory'`, or the project's
  cookieless mode. Each is a privacy decision for the owner, so write it down.
- Never load PostHog, or allow replay, on private, account or health-input
  routes. Mirror the site's private-route list.

## 3. PII and sensitive data
- Mask all inputs in replay (`maskAllInputs`) and add `ph-no-capture` to any
  block whose text can reveal health, money or identity (search boxes, quiz
  answers, results). Keep network payload capture off.
- No email, name or phone in event or person properties. Strip query strings
  that can carry them (`email=`, `q=`, tokens) before capture.
- For health-adjacent quizzes, send the quiz name and the outcome bucket only.
  Don't send BMI, age, sex, condition or risk answers.

## 4. Identify
- Default: don't identify, and use `person_profiles: 'identified_only'`. Then
  no person profile exists and no PII reaches PostHog.
- If you need to join with the CRM, identify on confirmed signup or lead with a
  non-PII key (an HMAC of the lead or subscriber ID), never with an email. Call
  `reset()` on logout.
- Note: with no identify, person-property test filters match nobody (see
  section 6).

## 5. Proxy and load path
- Prefer a same-origin reverse proxy (`/ingest` rewrites to
  `us.i.posthog.com` and `us-assets.i.posthog.com`), so blockers don't thin
  the data. Don't proxy through a path that forwards the site's auth cookies
  to the third party. If that risk exists, use the direct host and allow it in
  the CSP.
- Load PostHog from site code, not GTM, so consent, `before_send` and the
  allowlist live in the repo and are tested. If it must load through GTM, use a
  vetted gallery template with consent "needed" and the same allowlist.
- Set a `site` super property when one project serves several sites. Add every
  production host to `app_urls` and `recording_domains`.
- Only send from production hosts. Block localhost and preview hosts (for
  example `*.vercel.app`) in code, not just in filters.

## 6. Internal and bot traffic
- PostHog's test-account filter must use something that exists on events. A
  person-property cohort catches nothing when you don't identify. Use event
  filters instead: `$host` is not localhost or preview, plus an internal flag.
- Internal flag: reuse the site's internal switch (for example
  `?site_internal=1`, stored in localStorage) and call `opt_out_capturing()` on
  those devices, or register `internal: true` and filter it out.
- Leave the SDK's bot user-agent filter on. Check for headless or `webdriver`
  traffic in the same way as in GTM.

## 7. Dashboards
- One dashboard per site, filtered by `site`: the money-event funnel (from
  landing, through start, to confirmed outcome), a daily outcome trend, and the
  server-counter trend next to the browser trend (consented share = browser ÷
  server).
- Tag bot-made boards and insights (for example `bot-YYYY-MM-DD`) so the owner
  can review them or bulk-remove them.

## 8. Audit queries (read-only)
- Events by `$host`, `site`, `$lib` and `$lib_version` (what loads, from where,
  on which SDK version).
- Event names by site, compared with the registry and the GTM triggers.
- PII scan: properties matching an email regex, and URLs with sensitive query
  keys.
- Recording count by host (is replay scoped to the intended domains).
- Conversion events by host, browser and city (test or QA bursts, preview
  hosts).
