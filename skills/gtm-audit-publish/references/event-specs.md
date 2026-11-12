# Event specs: lead-gen and home-service sites

## Event contract (fill this in for every new or changed event)
| Field | Meaning |
|---|---|
| event_name | GA4 name (recommended name when one fits) |
| source | Who pushes it: site code, form tool callback, booking widget, server |
| fires_when | Exact success condition (e.g. API 2xx, booking ID returned) |
| required_params | Keys and types; no PII |
| consent | analytics_storage / ad_storage / ad_user_data needed |
| dedupe_key | lead_id, booking_id or transaction_id; scope (page, session, server) |
| destinations | GA4 key event? Ads conversion (primary/secondary)? Meta? CRM? |
| proof | How you'll show it worked: Preview, network hit, DebugView, CRM row |

## dataLayer rules
- Site pushes facts; GTM decides where they go. Push on success, not on click.
- One push per outcome, with a stable unique ID for dedupe.
- Flat, lowercase keys. Same key names in every event.
- Clear ecommerce before a new ecommerce push: `dataLayer.push({ecommerce: null})`.
- Initialize `window.dataLayer = window.dataLayer || []` before the GTM snippet.
- For enhanced conversions, push user data in its own object
  (`user_data: {email, phone_number, address}`) on the success event. GTM
  reads it with a User-Provided Data variable. Never forward it to GA4.
- SPA / Next.js: push a virtual page view on route change, or rely on the
  Google tag's history-change page views (pick one, not both).

Example success push:
```js
window.dataLayer.push({
  event: 'generate_lead',
  lead_id: 'L-7f3a',            // dedupe key, not PII
  form_name: 'quote_request',
  lead_source: 'website',
  service_type: 'ac_repair',
  value: 150, currency: 'USD',  // expected lead value, if known
  user_data: { email: e, phone_number: '+1312...' } // for Ads EC only
});
```

## Lead-gen core set
| Event | Fires when | Key params | Key event? | Ads |
|---|---|---|---|---|
| `generate_lead` | Form accepted (2xx / thank-you) | form_name, lead_id, service_type, value | Yes | Primary "Lead form" |
| `form_started` | First field touched (once per form per page) | form_name | No | No |
| `form_error` | Validation or server error | form_name, error_type | No | No |
| `call_clicked` | tel: link clicked | phone_location (header, hero, footer) | Optional | Secondary (intent) |
| `email_clicked` | mailto: clicked | link_location | No | No |
| `cta_clicked` | Main CTA clicked | cta_location, cta_text | No | No |
| `sign_up` | Newsletter / account created (confirmed) | method | Yes if it matters | Optional |
| `qualify_lead` | CRM marks qualified (server / MP) | lead_id, value | Yes | Offline import |
| `close_convert_lead` | Lead becomes a paid job | lead_id, value, currency | Yes | Offline import |

## Home-service add-ons
| Event | Fires when | Notes |
|---|---|---|
| `booking_started` | Booking widget opened | Widgets are often iframes; need the vendor's postMessage or dataLayer hook |
| `booking_confirmed` | Booking ID returned | Primary Ads conversion if bookings are the goal; dedupe on booking_id |
| `quote_requested` | Quote form accepted | Can be the same as generate_lead with form_name=quote |
| `service_area_checked` | ZIP checker used | param: in_area true/false; no full address |
| `financing_clicked` | Financing CTA | Outbound; param: provider |
| `chat_started` / `chat_lead` | Chat widget opens / captures contact | Use the vendor's events; chat_lead can be a conversion |
| `phone_call` (from call tracking) | Call answered and over N seconds | Comes from Google forwarding numbers or a call tracking tool, not GTM |

Calls are often the biggest lead source for home-service shops. A tel: click is intent, not a
call. Track real calls with Google Ads call conversions (calls from ads and
calls from website with a forwarding number) or a call tracking tool with
dynamic number insertion, and set a minimum call length (often 60s+).

## What not to send
- Names, emails, phones, street addresses to GA4 or in URLs.
- Health, money, or kids' details, even bucketed (e.g. BMI bucket, condition).
- Free-text form fields.
