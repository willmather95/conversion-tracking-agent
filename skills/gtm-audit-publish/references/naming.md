# Naming conventions

Goal: anyone can read a tag name and know the platform, the type and the
event. Keep it short and consistent inside one container. If a container
already has a clean convention, follow it instead of renaming everything.

## Tags: `<Platform> - <Type> - <event or purpose>`
- `GA4 - Config - Google tag`
- `GA4 - Event - generate_lead`
- `Ads - Conversion - Lead form`
- `Ads - Conversion Linker`
- `Ads - User Data - Lead form` (enhanced conversions data event)
- `Meta - Event - Lead` · `TikTok - Base` · `Consent - Default (CMP)`
- Custom HTML: add `[HTML]` at the end so it's easy to find.

## Triggers: `<Type> - <what>`
- `CE - lead_form_success` (Custom Event)
- `Click - tel: links` · `Click - Outbound affiliate`
- `PV - Thank you page` · `Init - All pages` · `Consent Init - All pages`
- `Vis - Booking confirmed` (Element Visibility)
- `Block - Internal traffic` (blocking triggers start with `Block`)

## Variables: `<type> - <name>`
- `DLV - form_name` (Data Layer Variable: use the exact key)
- `Const - GA4 ID` · `Const - Ads ID` · `Const - Meta Pixel ID`
- `CJS - lead value` (Custom JavaScript) · `URL - hostname`
- `Lookup - env to GA4 ID` · `Regex - hostname is prod`
- `UPD - Lead form` (User-Provided Data, for enhanced conversions)

## Folders
`01 Consent`, `02 Google tag + config`, `03 GA4 events`, `04 Google Ads`,
`05 Meta`, `06 Other vendors`, `90 Utilities`, `99 Deprecated (delete after
<date>)`.

## Versions
Name: `<YYYY-MM-DD> <what changed>` e.g. `2026-10-22 Ads lead conv + EC`.
Description: finding ID, objects changed, who approved, rollback version.

## Workspaces
`bot-<YYYY-MM-DD>-<topic>` e.g. `bot-2026-10-22-ads-lead`.

## Event names (GA4)
- lowercase `snake_case`, 40 chars max, no spaces.
- Use GA4 recommended names when they fit: `generate_lead`, `sign_up`,
  `begin_checkout`, `purchase`, `qualify_lead`, `close_convert_lead`.
  They unlock built-in reports.
- For custom events, use `object_action` (`form_started`, `cta_clicked`,
  `call_clicked`, `booking_confirmed`). Put details in params
  (`form_name`, `cta_location`, `method`), not in the event name.
- Never reuse Enhanced Measurement or reserved names for a custom event.
- If the site already pushes stable names (e.g. `cta_click`), map them in GTM.
  Don't rename site events just to be tidy; record the mapping instead.

## Parameter names
lowercase snake_case; reuse the same key everywhere (`form_name` in every
form event). Values: lowercase, no PII, under 100 chars.
