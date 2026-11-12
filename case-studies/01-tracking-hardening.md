# Case study 1: hardening lead tracking on my own lead-gen site

**Date:** Oct 22, 2026. **Site:** my own lead-gen site (Next.js on Vercel, GTM + GA4 + PostHog).
**Outcome:** merged and live the same day, after the owner's yes on the exact commit. Every live check passed.

## The problem

Three leaks were putting fake traffic into real numbers:

1. **Preview deploys wrote to production analytics.** The client only blanked `localhost`, so preview URLs sent events into the live project.
2. **No internal-traffic switch.** One QA session (12 form submits, 3 sent leads) sat in production data. That test person had no page view, so the lead funnel read 21 → 0 → 0.
3. **Global Privacy Control wasn't checked.** Do Not Track was respected; GPC wasn't.

## The change

- `guard.ts` (in `example/src/analytics/`): one place that decides "is this real traffic?"
  - `?<site>_internal=1` sets a sticky flag, `=0` clears it.
  - `gpcOn()` reads `navigator.globalPrivacyControl`.
  - Production hosts are an allow-list, so previews get no analytics key.
- `events.ts` `push()`: the first line drops internal traffic. That one choke point covers both the dataLayer (GA4 through GTM) and PostHog.
- The inline GTM loader checks the same flag, so GA4 page views stop too, not just events.
- GPC gates PostHog only. GA4 consent stays GTM's job (Consent Mode).
- The event names didn't change. GTM, GA4 and PostHog share one spec (see `example/src/analytics/events.ts`), and `gtm-parity-qa.mjs` fails the build if they drift.

## How agents did it

| Step | Who | Guardrail |
|---|---|---|
| Spec | me + lead agent | Written first, with acceptance tests and a rollback plan |
| Plan | planning agent | Read-only tools |
| Build | coding agent | Branch only, PR, stop |
| Review (×3) | review agent | Read-only; findings fixed before merge |
| Merge | lead agent | Only after my yes on the exact head SHA, `--match-head-commit`, no force push |
| Live check | headless browser | Signed out, no form submitted |

**Cost control:** `tools/capped.py` set hard caps of $2 per site and $10 across the five-site run. The whole run used $7.01. This site went over its $2 cap only through two extra grants I approved in advance, each with its own hard cap ($0.22 of $1.00 and $0.74 of $1.00).

## Results

Live check on production, signed out:

| Check | Result |
|---|---|
| Pages load, lead form renders | PASS |
| GTM loads once per page; GA4 collect fires | PASS |
| PostHog loads and captures normally | PASS |
| `?<site>_internal=1` → 0 GTM, 0 GA4 hits, 0 PostHog | PASS |
| Flag survives a reload; `=0` restores everything | PASS |
| GPC on → PostHog off, GA4 left to consent | PASS |
| Console or page errors | none |

The old production build, checked the same day, suppressed nothing with the internal flag, so the new behavior comes from this change.

4-case lead test (`npm run test:lead`), counting `form_sent`:

| Case | Expected | Got |
|---|---|---|
| Failed attempt | 0 | 0 |
| One success | 1 | 1 |
| Same lead again (double click, reload) | 0 more | 0 more |
| New distinct lead | 1 more | 1 more |

## What I'd still do

- A small audit log line never fires in production, because the inline loader sets the flag first. Suppression still works. It's a cosmetic fix.
- The production 4-case test and the funnel check need a real test lead. I ran them locally, not on the live site.
- Rollback is one `git revert -m 1` on the merge commit. No data migration.
