# Server-side tagging and first-party serving: decision gate

Don't default to server-side GTM (sGTM). Decide with the owner using this
gate, then record GO, NOT NOW, or BLOCKED (with the blocker).

## Cheapest first step: Google tag gateway
If the site is on Cloudflare (or another supported CDN), **Google tag gateway
for advertisers** serves Google tags and hits from your own domain
(`site.com/<path>`). Free on all Cloudflare plans; set up from GTM Admin >
Google tag gateway. It is not a full server container, and it does not change
consent rules: consent still applies.

## sGTM is worth it when 2+ are true
- Real paid media spend where better match rates move CPA.
- You need Meta/TikTok Conversions API or other server events with dedupe.
- You must strip or transform data before vendors see it (PII, health data).
- Many vendors; you want one browser stream fanned out server-side.
- Long sales cycles with offline outcomes to join.
- Ad blockers / Safari ITP are cutting a lot of data (measure first).

## Not worth it (yet) when
- Low traffic, no paid ads, simple one-step conversions.
- Nobody will own hosting, updates, cost and monitoring.
- The browser setup is still broken. Fix that first; sGTM copies mistakes.

## If GO, write down before building
Endpoint (first-party subdomain), host (Stape, Cloud Run), monthly cost,
clients (GA4, Data Tag), consent pass-through, transformations/redaction,
dedupe IDs (event_id), destinations, monitoring, owner, rollback (point the
Google tag back at Google's endpoint).
