# Consent Mode v2

## Facts
- 4 types matter for Google: `ad_storage`, `analytics_storage`,
  `ad_user_data`, `ad_personalization`. v2 added the last two (Nov 2023).
  Also: `functionality_storage`, `personalization_storage`, `security_storage`.
- Set the **default** before any tag reads or writes cookies. In GTM: a
  consent template (CMP gallery template, or your own using
  `setDefaultConsentState` / `updateConsentState`) on **Consent
  Initialization - All Pages**. Not Initialization, not All Pages.
- Don't use Custom HTML or `gtag('consent', ...)` inside GTM for consent.
  gtag commands are queued and may run too late.
- Scope defaults to regions where you show a banner (EEA, UK, CH, and any US
  states you choose). Elsewhere, set the default your policy allows.
- `wait_for_update` (ms) helps when the banner loads async.
- Update consent on the same page where the user chooses, before navigation.

## Basic vs advanced
| | Basic | Advanced |
|---|---|---|
| Google tags before choice | Don't load | Load with denied state |
| Data while denied | Nothing | Cookieless pings |
| Ads modeling | General model | Advertiser-specific model (better) |
| Setup | Block tags until consent | Tags load; consent checks control behavior |

For lead-gen in the US, advanced mode with region-scoped defaults usually
keeps the most data while staying honest. Pick with the owner; write it down.

## Non-Google tags
Google tags adjust themselves to consent. Other tags (Meta, TikTok, Clarity,
LinkedIn, Custom HTML) don't. Set their consent setting to **needed** with the
right types (usually `ad_storage`, plus `ad_user_data` for data uploads).
"Not set" means they fire no matter what.

## US privacy
- Some US states require an opt-out of "sale/share" for ad pixels. If Meta or
  TikTok run, give a working "Do not sell or share" path that flips ad types
  to denied.
- Health-adjacent sites: some states (e.g. Washington's My Health My Data Act)
  treat even inferred health data as sensitive. Don't send it to ad platforms.
- The banner must match reality. If it says "no ad networks", there must be
  none (Google Signals and Clarity/Bing count as ad-linked).

## How to test
1. Fresh profile. Load page. Tag Assistant > Consent tab: default set at
   Consent Initialization, before any tag.
2. Network: `gcs=G100` (all denied), `G101` (analytics granted, ads denied),
   `G111` (both granted). `gcd` shows default and update per type; `l` means
   not set.
3. Deny: Google hits are cookieless pings; non-Google ad tags don't fire.
4. Grant: full hits; pixels fire.
5. Change mind: update applies on the same page.
6. Region: test with a VPN or the CMP's region override if regions differ.
