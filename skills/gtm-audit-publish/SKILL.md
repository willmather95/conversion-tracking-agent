---
name: gtm-audit-publish
description: >-
  Use when auditing, planning, fixing, testing or publishing Google Tag Manager
  (GTM) web containers through a GTM MCP connector. Covers GA4 events and key
  events, Google Ads conversions and enhanced conversions, call, form and
  booking tracking, Consent Mode v2, double counting, Meta/TikTok pixels,
  server-side decisions, versions and rollback. Also use for a client
  onboarding audit of a home-service or lead-gen site ("is our tracking
  working?", "audit GTM", "set up conversions", "why don't Ads and GA4 match?").
---
# GTM audit and publish (power-user)

Agents read containers, find what's broken, draft the smallest fix in a
separate workspace, prove it in Preview, and wait for the owner's yes before
anything goes live. Tag creation is not tag firing. Firing is not delivery.
Delivery is not a real business outcome. Keep those apart.

## 0. Scope and safety (always first)
1. Read the connector's custom instructions. They list the accounts and
   containers you may write to. Everything else is read-only: list and get only.
2. Client, agency and partner accounts are read-only unless the owner gives a
   yes for that exact change in that exact container.
3. If the task says "read-only" or "audit only", never call create, update,
   remove, revert, createVersion, publish, setLatest, bulkUpdate, sync,
   resolveConflict, importFromGallery or gtm_remove_session.
4. Don't submit real forms, bookings or payments on production unless the
   owner allows a named test. Note every click that could send a hit.
5. Never print tokens, keys, or personal data (emails, phones) in files or chat.
6. Pace calls. On a 429 (or quota 403), wait 60s and retry, at most 3 times.
   Then stop and report BLOCKED. Details: `references/api-quirks.md`.

## 1. Pick a mode
| Mode | Use when | Writes? |
|---|---|---|
| Audit | "check", "audit", "is it working" | None |
| Fix | Owner approved a finding to fix | Bot workspace only |
| Build | New tracking plan or new conversion | Bot workspace only |
| Client onboarding (MMS client mode) | New home-service or lead-gen client | None (audit + plan) |
| Rollback | Live version broke something | Publish prior version (with yes) |

Client onboarding mode: follow `references/client-onboarding-home-service.md`.

## 2. Audit (read-only)
Do these in order. Save raw output to files so you don't refetch.
1. **Map scope.** `gtm_account list`, `gtm_container list`. Match each
   container's public ID (GTM-XXXX) to a site.
2. **Live version.** `gtm_version_header list` (names, numbers) and
   `gtm_version live` with `resourceType` = tag, trigger, variable, folder,
   builtInVariable, customTemplate (20 per page, page until done).
   Record the live version number. That's your rollback target.
3. **Pending drafts.** `gtm_workspace list` and `getStatus` on each. Unpublished
   changes in Default or other workspaces are a finding, not something to touch.
4. **Live site check.** Load the real site in a browser (headless is fine).
   Confirm the served `gtm.js?id=` matches, and that the served version matches
   the API live version. Capture network hits to `/g/collect`,
   `googleadservices`, `/pagead/`, `facebook.com/tr`, `analytics.tiktok.com`,
   `/ingest` etc. Check what loads outside GTM (hard-coded gtag, pixels,
   PostHog, Clarity, call tracking scripts).
5. **Read the source** if you have the repo: find every `dataLayer.push`
   event name and key. Compare writers (site) to readers (GTM triggers and
   variables). Mismatched names are silent failures.
   If the site also runs PostHog, check it against the same event spec, consent,
   identify and proxy rules in `references/posthog.md`.
6. **Run the checklist** in `references/audit-checklist.md`.
7. **Score** each finding with `references/scorecard.md`
   (P0 broken, P1 double counting / missing conversion / consent, P2 data
   quality, P3 hygiene). Every finding needs evidence and a fix.
8. **Write the report**: per container, live version, counts, findings by
   severity, top 3 fixes. Say what you could not check and why.

Finding format (one per finding):
```
[P1][double-count] Pixel Lead fires on two events
Evidence: tag 42 triggers = signup_a, signup_b (live v7)
Impact: one signup can count twice; bidding learns from fake volume
Fix: fire Lead on one success event, or add event_id dedupe
Confidence: high | medium | low   Verified on: API / live site / code
```

## 3. Plan the fix (before any write)
- One finding = one small change set. Don't mix cleanup with conversion work.
- Write the event contract for any new or changed event:
  `event_name, source (who pushes it), when it fires (success only),
  required params, consent category, dedupe key, destinations, proof`.
  Use `references/event-specs.md`.
- Pick the right tag type: Google tag / GA4 Event / Google Ads Conversion /
  Conversion Linker / gallery template first. Custom HTML only with a written
  reason (see "Custom HTML gate" below). Never Custom HTML for consent.
- Keep IDs (G-, AW-, pixel IDs) in Constant variables. No hard-coded copies.
- Decide dedupe before you build: which path is the source of truth for a
  conversion (direct Ads tag vs GA4 import, pixel vs CAPI)? Never both
  counting as primary.

## 4. Draft in a bot workspace
1. `gtm_workspace create` named `bot-<YYYY-MM-DD>-<topic>`. Never edit Default.
   Free containers allow 3 workspaces. If full, stop and ask; don't delete one.
2. Before each edit, `get` the object and save it (the "before").
3. Updates are full replaces. Send the whole object from `get` with your change
   and its fingerprint. Missing fields get deleted.
4. For multi-object changes, prefer `gtm_workspace bulkUpdate` (atomic; new
   objects use temp IDs `new_1`, `new_2`).
5. Save the "after". Make an object-level diff: added, changed, removed, and
   the exact fields that changed.
6. Name things per `references/naming.md`.

## 5. Test (proof, not hope)
Follow `references/test-protocol.md`. Minimum:
- GTM Preview / Tag Assistant on the real site: the tag fires once on the
  right event, not on others; variables have real values (not `undefined`).
- Network: exactly one request per outcome, right ID, right params,
  consent state (`gcs`/`gcd`) as expected.
- GA4 DebugView (debug sessions only) or Realtime; Ads Tag diagnostics.
- Conversion matrix for lead/booking/purchase changes:
  failed attempt = 0, one success = 1, replay/double-click/reload = 0 more,
  a new distinct success = 1 more.
- Consent: test denied, granted, and changed.
If you can't preview or test, say so. Don't call it tested.

## 6. Approve and publish (owner's yes required)
Show the owner, in plain words:
- the finding and why it matters,
- the exact diff (before/after per object),
- Preview evidence (what fired, what didn't, hits seen),
- the live version you'll roll back to,
- any side effects (e.g. "conversions may drop ~40% when duplicates stop").
Only after a clear yes for this change:
1. `gtm_workspace createVersion` with a name that says what changed
   (`2026-10-22 Add Ads lead conversion + EC`) and a description.
2. `gtm_version publish` with that version's fingerprint.
3. Reload the live site. Confirm the new version serves and the tags fire.
4. Re-run the key test case on the published version and check the
   destination got it. Status per layer, not one big "done":
   source / container / delivery / destination / business outcome, each
   PASS, PARTIAL, BLOCKED or FAIL.

## 7. Rollback
- Plan it before publish: the prior live version number.
- If anything breaks: publish the prior version (`gtm_version publish` on it),
  confirm it serves, tell the owner what happened and what you saw.
- Don't "fix forward" on a live break without a yes.

## 8. Log
Add one line to the stream's HANDOFF.md:
`<date> | <container GTM-ID> | <change> | v<before> -> v<after> | DONE/BLOCKED/ROLLED BACK | <evidence path>`

## Custom HTML gate
Custom HTML is allowed only when no Google tag type or maintained gallery
template does the job. Write down: owner, vendor purpose, endpoint, consent
type it needs, trigger, firing limit, data it reads, dedupe key and test proof.
Set its consent to "needed" with the right types (ad_storage for ad pixels).
Never use Custom HTML to set consent defaults or call `gtag('consent', ...)`.

## High-value traps (check every time)
- GA4 Enhanced Measurement names: `scroll`, `click`, `file_download`,
  `form_start`, `form_submit`, `view_search_results`, `video_*`. A custom event
  with the same name merges or double counts. Check which EM toggles are on.
- Same lead counted by both a direct Ads tag and an imported GA4 key event,
  both set as primary.
- Pixel base tag with no internal-traffic or consent block while event tags
  have one.
- Quoted variables in Custom HTML: `'{{DLV}}' || 'USD'` never falls back,
  because an empty variable becomes the text "undefined".
- Hostname guards (`^www\.site\.com$`) silently stop all tags after a domain
  change or on preview domains.
- Consent default set on Initialization or later instead of Consent
  Initialization; consent only via a banner that blocks GTM entirely
  (no cookieless pings, so modeling is weak).
- Health, finance or kids' data in event params (quiz answers, conditions,
  ages). Treat as sensitive. Bucketed is still sensitive in some states.
- Click triggers on "All Elements" for links; use "Just Links" + Check
  Validation where possible.
- `(?i)` in RE2 regex is not supported in some GTM fields; use "matches RegEx
  (ignore case)".

## Reference files
- `references/audit-checklist.md`: full audit list by area
- `references/scorecard.md`: severities, scoring, Ads trust levels
- `references/naming.md`: tags, triggers, variables, folders, versions, events
- `references/event-specs.md`: lead-gen + home-service event specs, dataLayer
- `references/consent-mode.md`: Consent Mode v2, basic vs advanced, tests
- `references/ads-conversions.md`: Ads tags, enhanced conversions, calls,
  offline import, Meta/TikTok dedupe
- `references/test-protocol.md`: Preview, Tag Assistant, DebugView, network,
  release matrix, receipt
- `references/server-side.md`: when sGTM or Google tag gateway is worth it
- `references/api-quirks.md`: MCP tool behavior, quotas, import gotchas
- `references/client-onboarding-home-service.md`: client mode for
  home-service shops
- `references/posthog.md`: PostHog alignment with GTM/GA4/Ads (event spec,
  consent, identify, proxy, filters, dashboards)

## Done means
Report: what you checked, findings by severity with evidence, what changed
(diff), versions before/after, test proof per layer, rollback target, and
what is still unproven. If proof is missing, say PARTIAL or BLOCKED and name
the next step.
