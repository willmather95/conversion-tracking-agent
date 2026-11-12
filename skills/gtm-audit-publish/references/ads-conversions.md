# Google Ads conversions, enhanced conversions, calls, other pixels

## Terms (since March 2024)
GA4 "conversions" are now **key events**. A **conversion** is a key event (or
Ads tag action) used in Google Ads. Flow: event → key event → Ads conversion.

## Pick one source per conversion
| Path | Pros | Cons |
|---|---|---|
| Direct Ads conversion tag (+ Conversion Linker) | Fastest, click-level, supports enhanced conversions directly | One more tag to keep in sync |
| Import GA4 key event | One definition; covers organic too | Slower; depends on GA4 consent and attribution |
Use one as primary. If both exist, set the other to secondary. Never two
primaries for the same lead.

## Required basics
- Conversion Linker on all pages (stores gclid/gbraid/wbraid in 1st-party
  cookies). Auto-tagging on in Ads.
- Counting: **One** for leads, **Every** for purchases.
- Values: a real expected value per lead type beats a flat default.
- Use a transaction/lead ID on the conversion to avoid duplicates.

## Enhanced conversions (web and leads)
- Sends hashed email/phone/address with the conversion so Google can match
  more conversions after cookie loss.
- Since April 2026, web and leads are one on/off setting in Ads.
- In GTM: enable user-provided data in the Google tag, or add a
  **User-Provided Data** variable to the Ads conversion tag, or use a
  **Google Ads User-Provided Data Event** tag on the form step when data is
  only on an earlier page.
- Best source: code (dataLayer `user_data` object) > CSS selectors > automatic
  (automatic can't collect phone numbers).
- Phone must be E.164 (`+13125551234`). Email trimmed and lowercased.
- Needs ad_user_data consent where consent applies.
- Check the Ads enhanced conversions diagnostics after a few days.

## Offline outcomes (home service gold)
- Save gclid/gbraid/wbraid + lead_id in the CRM with each lead (hidden fields).
- Import "qualified lead" and "booked job / sale" back to Ads with value.
- Use **enhanced conversions for leads** via **Data Manager** (preferred) or
  the Data Manager API. Since June 15, 2026 offline/EC-for-leads uploads moved
  off the Google Ads API to the Data Manager API.
- Optimize bidding toward qualified or booked, not raw form fills, once volume
  allows.

## Calls
- **Calls from ads**: call assets with Google forwarding numbers; set min
  call length.
- **Calls from website**: Ads "calls to a phone number on your website" +
  GTM "Google Ads Calls from Website Conversion" tag (swaps in a forwarding
  number for ad visitors). The phone number in the tag must match the page.
- **tel: clicks**: GA4 event `call_clicked`; secondary in Ads (intent only).
- **Call tracking tools** (DNI): pick one number-swap system; two fight each
  other. Feed qualified calls back as offline conversions.

## Meta / TikTok
- Use gallery templates or official integrations over Custom HTML.
- Base tag must have the same consent and internal-traffic blocking as event
  tags.
- Pixel + Conversions API: send the same `event_id` from both so the platform
  dedupes. One business event = one platform event name (don't send Lead from
  two different site events).
- Meta's 8-event Aggregated Event Measurement limit was removed in 2025;
  old advice about ranking events is out of date.
- Values: pass real value/currency; don't hard-code fallbacks that hide
  missing data.
