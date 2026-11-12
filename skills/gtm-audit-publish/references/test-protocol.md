# Test protocol

## Tools and what each proves
| Tool | Proves | Doesn't prove |
|---|---|---|
| GTM Preview / Tag Assistant | Trigger matched, tag fired, variable values, consent state per event | That the hit reached GA4/Ads |
| Browser network tab / headless capture | Real request sent, params, status, duplicates, `gcs`/`gcd` | That the platform accepted it |
| GA4 DebugView | GA4 got the event + params (debug sessions only) | Normal-user traffic; reports (24-48h) |
| GA4 Realtime | Non-debug hits arriving | Param details |
| Ads: Tag diagnostics, conversion status, EC diagnostics | Ads saw the tag / conversions / matched data | Same-day attribution |
| Meta Events Manager Test Events | Pixel/CAPI events and dedupe | Ads attribution |
| CRM / booking system | Real business outcome | Ad attribution |

## Steps for any change
1. **Baseline** on the live version: record what fires now for each journey.
2. **Preview** the bot workspace (`gtm_workspace quickPreview` or the UI).
   Walk each journey. For each: event seen, tags fired, tags not fired,
   variable values (no `undefined`), consent state.
3. **Network**: one request per outcome per platform. Check `tid`/`en` (GA4),
   conversion ID/label (Ads), `ev` (Meta), status 2xx.
4. **Destination**: DebugView (add `debug_mode` or use Preview), Ads Tag
   diagnostics, Meta Test Events.
5. **Consent**: denied, granted, changed (see consent-mode.md).
6. **Edge cases**: double-click submit, reload thank-you page, back button,
   failed validation, server error, second distinct lead.
7. After publish: repeat the key cases on the live version.

## Conversion release matrix (lead, booking, purchase)
| Case | Expected count |
|---|---|
| Failed / invalid / cancelled attempt | 0 |
| One accepted outcome | 1 |
| Same outcome again (double-click, retry, reload) | 0 more |
| A new, distinct outcome (new ID) | 1 more |
Record expected vs seen at source (dataLayer), request (network) and
destination. Two intended events for one outcome (e.g. generate_lead +
booking_confirmed) are fine if each is counted on purpose.

## Production safety
- No real form/booking/payment submits on production without a named,
  approved test (use a test email/phone and tell the owner to delete it).
- Prefer staging, Preview with a test-mode flag, or simulated dataLayer pushes
  (`dataLayer.push({event:'generate_lead', ...})` in Preview) to check GTM logic.
  A simulated push proves GTM wiring, not the site's success path.
- Any click that may send a hit (e.g. "Allow analytics") is disclosed in
  the report.

## Headless browser tips
- Some sites flag headless/webdriver as internal traffic. Use
  `--disable-blink-features=AutomationControlled` and a normal UA to see
  real-user behavior; test both.
- Read `window.dataLayer` and `window.google_tag_manager` to see pushes and
  container versions. gtag calls appear in dataLayer as Arguments objects.
- Next.js `<Link>` clicks: dispatch a real click event; `element.click()` may
  be intercepted by the router before GTM's listener.
- Consent-gated GTM: if no `gtm.js` loads, look for a banner that injects GTM
  only after a click.

## Release receipt (paste into the report)
```
Target + business outcome:
Authority (who approved changes / publish / tests):
Baseline version + evidence:
Changed in this run (objects + exact diff):
Dedupe key + scope:
Candidate workspace / version:
Matrix results (case, env, version, expected, source, request, destination):
Consent checks:
Published version + time (America/Chicago):
Post-publish destination receipt:
Business-system check:
Ads attribution (separate; unproven if absent):
Overall: PASS | PARTIAL | BLOCKED | FAIL
Exact claim allowed:
Open items + owner:
Rollback version:
```
