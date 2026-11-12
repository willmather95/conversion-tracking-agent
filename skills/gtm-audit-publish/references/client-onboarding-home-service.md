# Client mode: home-service onboarding audit

For a new home-service client (HVAC, plumbing, roofing, electrical, tree,
landscaping, cleaning, pest, garage doors, etc.). Output: a plain-language
audit + a tracking plan the owner can approve. **Read-only.** No GTM, Ads or
GA4 writes in this mode, even if you have access.

## Step 0. Access and scope (ask, don't assume)
Confirm in writing which of these you can read, and that it's read-only:
- GTM container(s) (Read access is enough)
- GA4 property (Viewer / Analyst)
- Google Ads account (read-only or standard via MCC, no edits)
- Google Business Profile, Local Services Ads (LSA)
- Call tracking tool (CallRail, WhatConverts, etc.)
- Booking / field-service tool (ServiceTitan, Housecall Pro, Jobber, etc.)
- Form tool / website platform (WordPress, Webflow, Wix, Next.js)
- Consent / CMP tool, privacy policy page
Log access in the client's notes. Never paste credentials into files.

## Step 1. Map the money paths
List every way a customer becomes a lead, with the share of leads if known:
1. Phone calls: from ads, from GBP, from the site (header, sticky button).
2. Web forms: quote, contact, service request, careers (exclude careers!).
3. Online booking widget (often an iframe or a separate domain).
4. Chat / text widgets.
5. LSA leads (tracked inside Google, not GTM).
For each: where it starts, where success shows, and what record it creates
in the CRM / field-service tool.

## Step 2. Calls (usually the biggest gap)
- [ ] tel: links exist on every page and on mobile (click-to-call).
- [ ] `call_clicked` (or similar) GA4 event on tel: clicks, with location.
- [ ] Google Ads call assets on, with forwarding numbers and a min length.
- [ ] Calls from website conversion set (forwarding number swap) OR a call
      tracking tool with dynamic number insertion. Only one swap system.
- [ ] Call tracking tool sends qualified calls to GA4/Ads (native integration
      or offline import), not just "all calls".
- [ ] Same number shown in schema, GBP and site footer for local SEO
      (tracking numbers swap only in the visible number, not in schema).

## Step 3. Forms
- [ ] Conversion fires on success only (2xx response, thank-you page or
      success message), not on submit click.
- [ ] Careers, vendor and newsletter forms are separated by `form_name`.
- [ ] Spam: count after spam filtering where possible (or note the risk).
- [ ] Hidden fields capture gclid/gbraid/wbraid, UTM source/medium/campaign,
      landing page, and a lead_id into the CRM.
- [ ] No PII in GA4 (no email or phone in event params or URLs).

## Step 4. Booking
- [ ] Booking widget's own events used (postMessage/dataLayer); confirm what
      it sends and when ("booking_confirmed" with booking ID).
- [ ] Cross-domain or iframe handled so the ad click is kept.
- [ ] One conversion per booking (dedupe on booking ID).

## Step 5. Google Ads conversions
- [ ] Conversion actions listed: name, source (tag/GA4/import/call),
      primary or secondary, counting, value, attribution window.
- [ ] Leads counted "One". Micro-actions (page views, scroll, time on site)
      not primary.
- [ ] No lead counted twice (tag + GA4 import both primary).
- [ ] Conversion Linker on; auto-tagging on.
- [ ] Ads trust level (High/Medium/Low/Broken) from scorecard.md.
- [ ] Offline import path: qualified lead and sold job with value, via
      Data Manager or the call/booking tool's integration.

## Step 6. Enhanced conversions
- [ ] On in Ads (one unified setting since April 2026).
- [ ] Data source in GTM: User-Provided Data variable from dataLayer
      (best) or CSS selectors on the form.
- [ ] Phone in E.164; email trimmed; consent `ad_user_data` respected.
- [ ] EC diagnostics in Ads show no errors.

## Step 7. Consent and privacy
- [ ] Consent Mode v2 default set at Consent Initialization (or documented
      choice not to use a banner for US-only traffic).
- [ ] Pixels (Meta, Nextdoor, TikTok, Bing) have consent and an opt-out path
      where state law needs it.
- [ ] Privacy policy lists the tools that actually load.
- [ ] Session replay masks form inputs.

## Step 8. GA4 basics
- [ ] One property, right time zone and currency; internal traffic filtered.
- [ ] Key events: generate_lead (form), booking_confirmed, phone_call
      (qualified call) — the few that matter.
- [ ] Data retention set to 14 months.
- [ ] GA4 linked to Ads; GBP traffic tagged with UTMs.

## Deliverables (draft only; owner approves before sharing with the client)
1. One-page summary: what's working, what's broken, what it costs (e.g.
   "calls aren't tracked, so Ads can't learn from ~half your leads").
2. Findings table (P0-P3) with evidence and fix.
3. Tracking plan: events, conversions, primary/secondary, values.
4. Fix order: week 1 (P0/P1 quick wins), week 2-4 (calls, offline import, EC),
   later (server-side only if the decision gate says GO).
5. What we need from the client (access, number list, CRM fields).
Plain words, grade 8-9. Don't send it; give the draft to the owner.
