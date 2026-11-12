# Audit checklist

Work top to bottom. Mark each line PASS, FAIL, N/A or UNKNOWN (with why).
Save evidence (API output, screenshots, network logs) next to the report.

## A. Container and versions
- [ ] Served container ID on the live site matches the container you audit.
- [ ] Served version (`gtm.js` response or Tag Assistant) = API live version.
- [ ] Only one GTM container per site, or each extra one is explained.
- [ ] No hard-coded gtag.js on the page that duplicates a GTM Google tag.
- [ ] Version names say what changed (not "updates" or blank).
- [ ] No stale unpublished changes in Default or other workspaces.
- [ ] Rollback target recorded (current live version number).

## B. Tags
- [ ] Every active tag has at least one firing trigger.
- [ ] Paused tags: list them. Delete or document why they're kept.
- [ ] One Google tag (config) per GA4 measurement ID. Events point at it.
- [ ] Measurement IDs, Ads IDs and pixel IDs live in Constant variables.
- [ ] IDs match the real GA4 property / Ads account / pixel the owner uses.
- [ ] Placeholder IDs (`000000000`, `REPLACE_ME`, `AW-XXXX`) not live.
- [ ] Custom HTML tags: each passes the Custom HTML gate (see SKILL.md).
- [ ] Gallery templates preferred over Custom HTML for Meta, TikTok, etc.
- [ ] Tag firing options sane (once per event for conversions).
- [ ] Setup/teardown sequencing used only where needed and documented.

## C. Triggers
- [ ] No unused triggers.
- [ ] Conversion triggers fire on success only (2xx response, thank-you page,
      confirmed booking), not on button click or submit attempt.
- [ ] Form Submission triggers use Check Validation and a form filter.
- [ ] Click triggers use "Just Links" for links; "All Elements" only with a
      tight filter.
- [ ] Custom Event names match what the site actually pushes (exact case).
- [ ] Hostname guards include every real domain (and new brand domains).
- [ ] Blocking triggers (internal traffic, bots, staging) applied to every
      tag that needs them, including pixel base tags.
- [ ] Regex uses RE2 syntax; no lookarounds; ignore-case via the operator.
- [ ] Timer, scroll and visibility triggers have limits.

## D. Variables
- [ ] No unused variables.
- [ ] Data Layer Variable keys match the site's push keys (writer = reader).
- [ ] Default values set where an empty value would break a tag.
- [ ] No variable sends personal data (email, phone, name) to GA4.
- [ ] Lookup/regex tables have a default.

## E. GA4
- [ ] Enhanced Measurement toggles known (scroll, outbound clicks, site
      search, video, file downloads, form interactions).
- [ ] No custom event reuses an EM or reserved name (`scroll`, `click`,
      `file_download`, `form_start`, `form_submit`, `page_view`,
      `first_visit`, `session_start`, names starting `ga_`, `google_`,
      `firebase_`).
- [ ] Recommended names used where they fit (`generate_lead`, `sign_up`,
      `purchase`, `begin_checkout`) so GA4 reports work.
- [ ] Key events chosen on purpose. One lead should count once.
- [ ] Params under limits: 25 per event, names 40 chars, values 100 chars.
      Custom dimensions: 50 event-scoped, 25 user-scoped (standard property).
- [ ] High-cardinality params (IDs, timestamps) not registered as dimensions.
- [ ] Every-page "context" events avoided; use page params or the Google tag.
- [ ] Internal traffic and developer traffic filters set in GA4.
- [ ] Cross-domain set if the journey crosses domains (booking widgets!).

## F. Ads and other ad platforms
- [ ] Conversion Linker fires on all pages (if any Google Ads tag exists).
- [ ] Each Ads conversion has one source (tag or GA4 import), set primary
      or secondary on purpose.
- [ ] Enhanced conversions on and fed with user-provided data, or the
      reason it's off is written down.
- [ ] Calls tracked (calls from ads, calls from website, tel: clicks).
- [ ] Offline/CRM outcomes planned (qualified lead, booked job, sale).
- [ ] Meta/TikTok: base tag consent + internal-traffic blocking matches
      event tags; event_id set for pixel/CAPI dedupe.
- [ ] No two platforms' "Lead" fired from different events for one signup.

## G. Consent and privacy
- [ ] Consent default set on Consent Initialization (template or CMP).
- [ ] All 4 v2 types set: ad_storage, analytics_storage, ad_user_data,
      ad_personalization.
- [ ] Region-scoped defaults match where banners show.
- [ ] Non-Google tags have consent "needed" with the right types.
- [ ] Banner text matches what actually loads (e.g. "no ad networks" vs
      Google Signals, Clarity, pixels).
- [ ] US state opt-out (do not sell/share) path exists if ad pixels run.
- [ ] Sensitive data (health, finance, kids) not sent to ad platforms.
- [ ] Session replay tools mask inputs.

## H. Live behavior (browser)
- [ ] Page load: which hits fire, in what order, with what consent state.
- [ ] Key journeys: CTA click, form start, form success, call click,
      booking, outbound affiliate click.
- [ ] Each conversion sends exactly one hit per platform.
- [ ] Internal-traffic mode really stops all ad hits.
