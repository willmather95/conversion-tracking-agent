# GTM and GA4 setup

Everything the code needs is already written. This is the part that happens in
a browser, in order, once.

Budget about forty minutes. Steps 1 to 5 get data flowing. Step 6 is the one
that is easy to skip and expensive to skip: an event parameter that is not
registered as a custom dimension is collected and then invisible in every
report, forever, with no error to tell you.

---

## If you have already imported this container once, start here

The container file changed. A container sitting in GTM from an earlier import
is still running the old wiring, and nothing picks the change up on its own.

Two things moved, both because GA4 was quietly overruling what this site sent.

**`form_start` and `form_submit` are now `lead_form_start` and
`lead_form_submit`.** GA4's own Enhanced Measurement sends events under the
first two names, and GA4 does not keep ours apart from its own. Both landed
under one name: a single interaction on the live site produced three
`form_start` rows and three `form_submit` rows, each mixing this form's
`form_variant` with GA4's `form_id`, `form_destination`, `form_length` and
`first_field_*`. Nothing separates them again afterwards.

**`page_path` is gone, from every tag and from the variable that fed them.**
GA4 reserves that name and drops it at collection. It was pushed by the site,
mapped by the container, and never once arrived: the live request carried
`cta_label` and `cta_placement` from the same push and no `page_path` at all.
GA4 records the path itself on every hit, which is where reports should read it.

To pick both up: re-import per step 3, then publish per step 7. Nothing takes
effect until you publish.

**Overwrite is the right choice on re-import.** The tags, triggers and
variables that conflict are this same file's own, from your previous import of
it. Overwriting replaces the earlier version of each object rather than
discarding anything of yours.

One thing to expect afterwards: a renamed event starts a new row in GA4 from
the moment it is published. The old `form_start` and `form_submit` totals stay
where they are and stop growing. Nothing is lost, and nothing is stitched
together for you either.

---

## Before you start

Two accounts, both free, both under the Google account you want to own this
long term. Not a personal one you might lose access to.

- Google Tag Manager: <https://tagmanager.google.com>
- Google Analytics: <https://analytics.google.com>

---

## 1. Create the GA4 property

1. Open <https://analytics.google.com> and sign in.
2. Bottom left, click the gear icon for **Admin**.
3. Under the Account column, **Create** then **Account** if you have none.
   Account name: `Example Co`. Accept the data sharing defaults or
   turn them off, either is fine. **Next**.
4. Property name: `example.com`. Set the reporting time zone to
   **United States, Central Time** and currency to **US Dollar**. **Next**.
5. Answer the business size and objective questions. Pick **Generate leads**.
   **Create**, then accept the terms.
6. On the data collection screen choose **Web**.
7. Website URL: `https://example.com`. Stream name:
   `example.com`. **Create stream**.
8. The stream detail panel now shows a **Measurement ID** in the top right. It
   looks like `G-ABC1234XYZ`. **Copy it. You need it in step 4.**

### Enhanced measurement, while you are in the stream settings

Click **Enhanced measurement** in the stream detail panel. It is a list of
toggles, all on by default, and GA4 sends every one of them from its own script
without asking the container. Two of them overlap with what this site sends.

**Turn OFF Scroll.** The container sends its own scroll event at four
thresholds, 25, 50, 75 and 90 percent. Leaving both on gives you two scroll
metrics that disagree, and nobody ever remembers which is which.

**Turn OFF Outbound clicks.** The container sends `outbound_click` with the
destination domain and the full URL as separate parameters, so a report can
group by domain without parsing strings. GA4's built-in sends a `click` event
carrying `outbound=1` and the URL among the link parameters. The two use
different event names, so this is duplication rather than the merge described
above, but it is still two rows for one click, and the better instrumented row
is the one this site sends.

**Form interactions can be left on or off, and it no longer matters.** GA4
sends `form_start` and `form_submit`; this site sends `lead_form_start` and
`lead_form_submit`. Different names cannot merge. Leave GA4's on if a coarse
count of every form on the site is useful to you, turn it off if the extra rows
are noise. Either way the lead form's own numbers are unaffected.

Everything else on that list is fine to leave alone. Page views, site search,
video engagement and file downloads do not overlap with anything here.

---

## 2. Create the GTM container

1. Open <https://tagmanager.google.com> and sign in.
2. **Create Account**. Account name: `Example Co`. Country:
   **United States**.
3. Container name: `example.com`. Target platform: **Web**.
4. **Create**, accept the terms.
5. A box appears with two code snippets. **Close it without copying anything.**
   The snippets are already in `src/app/layout.tsx`, rendered in an order the
   code guarantees. Pasting them again would load the container twice and
   double every number on this site.
6. At the top of the screen, beside the account name, is the container ID. It
   looks like `GTM-ABC1234`. **Copy it. You need it in step 5.**

---

## 3. Import the container

1. In GTM, left sidebar, **Admin**.
2. Container column, **Import Container**.
3. **Choose container file**, and select
   `example/gtm-container.json` from the root of this repository.
4. Workspace: **Existing** then **Default Workspace**.
5. Import option: **Merge**, then **Overwrite conflicting tags, triggers and
   variables**.
6. The preview below the buttons should read **15 tags, 12 triggers,
   12 variables**. On a first import those are all additions. On a re-import
   they appear as modifications, which is expected and correct: they are the
   same objects from your previous import of this same file. The exception is
   anything added since your last import, which shows as an addition: if you
   imported before the Google Ads objects existed, that is the **Conversion
   Linker** and **Google Ads - Lead (form_sent)** tags and the two
   **Const - Google Ads** variables (see step 10). If the preview
   reports deletions, you selected the top level **Overwrite** option instead
   of **Merge**. Go back.
7. **Confirm**.
8. **Re-import only.** Merge adds and updates, and never deletes. The variable
   **DLV - page_path** is no longer in this file but it is still in your
   workspace from the earlier import, so delete it by hand: **Variables**,
   User-Defined Variables, the row menu, **Delete**. Nothing references it, so
   nothing breaks either way. This keeps the workspace and the file honest
   about each other.

Nothing is live yet. Import writes to the workspace. Publishing is step 7, and
it comes after the measurement ID is real.

---

## 4. Put the real measurement ID in

The container in this repository already carries the measurement ID for this
site's property. Confirm it rather than retype it, and only change it if you
created a different property in step 1.

1. Left sidebar, **Variables**.
2. Under **User-Defined Variables**, click **Const - GA4 Measurement ID**.
3. The Value field should match the measurement ID you copied in step 1.8. If
   it does not, replace it with the one you copied and **Save**.
4. Whatever you do here, do not leave it holding an ID shaped like
   `G-XXXXXXXXXX`. A placeholder publishes cleanly and reports to nothing.

That one variable feeds the configuration tag and all ten event tags. There is
nowhere else to change it.

---

## 5. Put the container ID in the site

The site renders no tagging at all until this is set, on purpose. A snippet with
a placeholder ID looks instrumented in view-source while every request it makes
returns a 404, so there is no half-configured state to be fooled by.

**Local**, create `.env.local` in the repository root:

```
NEXT_PUBLIC_GTM_ID=GTM-ABC1234
```

**Production**, in the Vercel dashboard:

1. Project, **Settings**, **Environment Variables**.
2. Key `NEXT_PUBLIC_GTM_ID`, value the container ID from step 2.6.
3. Tick **Production**, **Preview** and **Development**.
4. **Save**, then redeploy. This value is compiled into the pages, so an
   existing deployment will not pick it up.

To confirm: load the site, view source, and search for `googletagmanager`. Two
hits, a consent call above them, and a noscript iframe below. If you find
nothing, the variable did not reach the build.

---

## 6. Register the custom dimensions

**Do not skip this.** GA4 collects every parameter the site sends, but a
parameter that is not registered here cannot be selected in any report, any
exploration, or any audience. The data is not lost, it is unreachable, and it
only becomes visible from the day you register it. Registering late does not
backfill.

In GA4: **Admin**, then **Custom definitions**, then **Create custom
dimension**. Scope is **Event** for every one of these. Set the dimension name
and the event parameter to the same string.

| Dimension name        | Event parameter       | What it answers                                    |
| --------------------- | --------------------- | -------------------------------------------------- |
| `cta_placement`       | `cta_placement`       | Which button gets clicked: header, hero, closing, footer, not_found |
| `cta_label`           | `cta_label`           | The wording, so a copy change is comparable         |
| `phase_slug`          | `phase_slug`          | Which of the four service phases was read           |
| `form_variant`        | `form_variant`        | `audit` at /start against `enquiry` at /contact     |
| `undelivered_reason`  | `undelivered_reason`  | Why a lead did not reach the inbox                  |
| `mailto_placement`    | `mailto_placement`    | Which email link was used                           |
| `link_domain`         | `link_domain`         | Where outbound clicks go                            |
| `link_url`            | `link_url`            | The specific outbound link                          |

One numeric parameter, registered separately. **Admin**, **Custom
definitions**, **Custom metrics**, **Create custom metric**:

| Metric name           | Event parameter       | Unit     |
| --------------------- | --------------------- | -------- |
| `invalid_field_count` | `invalid_field_count` | Standard |

There is a cap of 50 event-scoped custom dimensions per property. This uses
eight.

**There is no `page_path` row, and adding one would achieve nothing.** GA4
reserves that parameter name and discards it at collection, so a custom
dimension built on it reports `(not set)` on every row forever. The page a
thing happened on is already available without it: GA4 collects the page
location itself on every hit, and **Page path** is a standard dimension you can
break any report down by. `cta_placement` answers the question a `page_path`
parameter could not, which is which of several buttons on the same page was
clicked.

`scroll_percent`, sent by the scroll depth tag, is deliberately not registered.
GA4 reports scroll reach well enough without it and the slot is worth more
elsewhere. Register it if you ever want reach by exact threshold.

---

## 7. Publish the container

1. GTM, top right, **Submit**.
2. Version name: `Initial web tracking`.
3. Description: `GA4 configuration, eleven event tags, scroll depth, Conversion
   Linker, Google Ads lead conversion (paused).`
4. **Publish**.

If publishing is refused with a message about an invalid trigger, read the
Timer note at the bottom of this document.

---

## 8. Mark the key events, and read this part carefully

In GA4: **Admin**, **Events**. Events appear in this list only after they have
been received at least once, so trigger each one on the live site first, then
come back. Toggle **Mark as key event** on:

- `form_undelivered`
- `mailto_click`
- `form_sent`

**Do not mark `waitlist_join` or `waitlist_undelivered`.** They are Bulk Judge
early-access sign-ups, not sales leads, and they have their own names so they
can never be counted as `form_sent` or `form_undelivered`.

**`form_undelivered` and `mailto_click` are key events. That is not a
formality.**

No delivery transport is configured for the lead form yet. Neither
`MMS_LEAD_WEBHOOK_URL` nor a Resend key with a verified sending domain exists,
so `submit()` in `src/lib/lead/actions.ts` cannot return `sent`. Every single
real lead today follows the undelivered path: the visitor is told plainly that
nothing was sent and handed a prefilled email containing everything they typed,
and the ones who click that link do reach the inbox.

So on today's configuration:

- `form_sent` will be **zero**.
- `form_undelivered` will be **every completed form**.
- `mailto_click` with `mailto_placement = form_fallback` is the closest thing
  this site has to a conversion.

Mark only `form_sent` and the dashboard reports zero conversions during a week
that produced real inbound contact. That is the exact reading error that gets a
working site declared broken, or an ad campaign switched off for performing
badly when it was performing fine.

Once a transport is live and verified, `form_sent` starts carrying the volume
and `form_undelivered` becomes what it sounds like: an alarm. Keep both marked.
A rising `form_undelivered` after that point means delivery has broken again,
and it is the only signal that will tell you.

---

## 9. Confirm it works

1. In GTM, top right, **Preview**. Enter `https://example.com` and
   **Connect**. A new tab opens with the debugger attached.
2. In GA4, **Admin**, **DebugView**.
3. In the site tab, do these five things and watch both panels:

   | Action                                  | Expected event     |
   | --------------------------------------- | ------------------ |
   | Click the header button                 | `cta_click`        |
   | Open `/services/reconcile`              | `phase_view`       |
   | Click into the first field at `/start`  | `lead_form_start`  |
   | Submit that form with fields left empty | `form_invalid`     |
   | Fill it correctly and submit            | `form_undelivered` |

4. In GTM's debugger, click an event in the left rail and confirm the tag
   fired. Then open the tag and check the parameter values are populated rather
   than `undefined`. An `undefined` here means the Data Layer Variable name and
   the parameter name have drifted apart.

`form_sent` cannot be produced by hand until a transport exists. It is wired and
tested, and it will stay at zero until delivery is configured.

---

## 10. Google Ads conversions

The container already carries everything Google Ads needs. Two things are left
for you: paste two values, and unpause one tag.

What is in the container:

- **Conversion Linker**, firing on All Pages. It stores the ad click IDs
  (`gclid`, `gbraid`, `wbraid`) in a first-party cookie when a visitor lands
  from an ad, so a conversion later in the visit can be credited to that click.
  It is live from the first publish and harmless without an Ads account.
- **Google Ads - Lead (form_sent)**, firing on the existing `form_sent` trigger,
  so it counts a lead only when a transport has actually accepted it. The Bulk
  Judge early-access waiting list never reaches it: that form reports
  `waitlist_join`, not `form_sent`. No
  conversion value is sent. No order ID either, because the `form_sent` push
  carries only `form_variant` and nothing unique per submission. **It is
  imported paused**, so the placeholder values below can never fire.
- Two constant variables the tag reads, holding placeholders:
  **Const - Google Ads Conversion ID** (`000000000`) and
  **Const - Google Ads Conversion Label** (`REPLACE_ME`).

`npm run qa:gtm` fails the build if that tag is ever unpaused while either
value is still a placeholder, and warns if the values are real and the tag is
still paused.

### Find the ID and label

1. In Google Ads, **Goals**, then **Conversions**, then **Summary**.
2. Click the lead conversion action. If there is none yet, create one:
   **New conversion action**, **Website**, enter `example.com`,
   then add a conversion action manually with category **Submit lead form**,
   **Don't use a value**, and Count **One**.
3. Open the action, then **Tag setup**, then **Use Google Tag Manager**.
4. Copy the **Conversion ID** (digits only) and the **Conversion label**.

### Paste them, unpause, preview, publish

1. In GTM, **Variables**, open **Const - Google Ads Conversion ID** and replace
   `000000000` with the Conversion ID. Digits only: no `AW-` prefix, which
   belongs to the gtag snippet and not to this field. **Save**.
2. Open **Const - Google Ads Conversion Label**, replace `REPLACE_ME` with the
   Conversion label, **Save**.
3. **Tags**, open **Google Ads - Lead (form_sent)**, and from the menu at the
   top right choose **Unpause**. **Save**. A paused tag does not fire in
   Preview either, so this comes before the next step.
4. **Preview** as in step 9, and submit a real lead. On the `form_sent` event,
   **Google Ads - Lead (form_sent)** should be under Tags Fired. On the first
   page load, **Conversion Linker** should be too. Until a lead transport is
   configured `form_sent` never happens (see step 8), so this tag records
   nothing until then, and that is correct.
5. **Submit** and **Publish**. If you edited the repository's container file
   instead of the GTM UI, `npm run qa:gtm` first, then re-import per step 3.

GTM may suggest adding a Google tag for the Ads account. It is not needed for
this conversion to record.

Consent needs nothing extra. Both tags are Google's built-in types and read the
Consent Mode state set in `src/lib/analytics/gtm.ts` natively, the same way the
GA4 tags do. Do not add consent checks through a Custom HTML tag.

### This is not the won-client import

The **MMS Won Client** conversion action from `docs/HANDOFF.md` is a separate
action of type Import, fed by uploading the sheet's CSV after a deal closes.
This tag is the online lead conversion, recorded in the browser at the moment
of submission. Keep them as two actions with two names, and never point this
tag at the Import action's label. Which of them is Primary for bidding is a
choice you make in Goals, and nothing in this container changes it.

**Meta needs no pixel.** Meta conversions are sent server side by the site, as
a separate change, not from this container. Do not add a Meta pixel here.

---

## Rules this setup follows, and why

**No Custom HTML tags, ever.** A Custom HTML tag that fires before consent is
granted is blocked permanently and never replays, unlike a native GA4 tag which
queues and sends afterwards. One wrapping a `dataLayer.push` has bricked a
container on another property here. `scripts/gtm-parity-qa.mjs` fails the build
if one appears.

**Every event has a Custom Event trigger.** A `dataLayer.push` with no trigger
listening for that exact name is silently discarded. Nothing errors, the form
still works, GA4 just receives nothing. That has happened twice on other
properties and ran for weeks each time, because the only symptom is a number
that stays at zero. `npm run qa:gtm` reads the event registry in
`src/lib/analytics/events.ts` and fails if any event has no listener, which is
what makes a repeat structurally impossible rather than merely unlikely.

**No event name GA4 already uses, and no parameter name it reserves.** GA4
sends events of its own, from Enhanced Measurement and from automatic
collection, and it does not keep this site's apart from them. Two events under
one name arrive merged, one action landing as several rows with two sets of
parameters mixed together, which is why the lead form's events are
`lead_form_start` and `lead_form_submit`. Reserved parameter names fail the
other way: `page_path` and its relatives are accepted by the dataLayer, mapped
by the tag, and then dropped at collection, so the dimension built on one is
empty forever.

Neither failure is visible from the code or from the container, because in both
cases the two of them agree with each other exactly and GA4 is the one
overruling them. `npm run qa:gtm` now carries both of Google's lists and fails
the build on either. The other three form events keep their bare names,
`form_invalid`, `form_sent` and `form_undelivered`, because GA4 has no built-in
by those names. The prefix is therefore not uniform, on purpose. Not colliding
is the point, not tidiness.

**No Timer triggers.** Their interval and limit values do not survive a
container JSON round trip in either direction, so every import needs them
retyped by hand in the UI or the workspace refuses to publish. This container
has none. If you ever add one, the QA script warns, and GA4's own engagement
metrics are the better answer anyway.

**Consent Mode v2 defaults to granted.** The audience is United States only, so
neither GDPR nor the ePrivacy Directive applies and US state privacy law is an
opt-out regime. The defaults are set in `src/lib/analytics/gtm.ts` and execute
before the container loads, which means adding a banner later is a change to
four values plus one `wait_for_update` line, not a re-architecture. The comment
in that file spells out the three steps.

---

## Adding an event later

Five edits. Miss either of the last two and the build fails, which is the point.

1. `src/lib/analytics/events.ts`: add the event to `EventPayloads` with its
   parameters.
2. Same file: add it to `EVENT_PARAMETERS`. TypeScript fails if these two
   disagree in either direction.
3. Same file: add a `trackYourEvent` helper and call it from the component.
4. `example/gtm-container.json`: add a `CUSTOM_EVENT` trigger whose
   `arg1` is the exact event name.
5. Same file: add a `gaawe` tag with `eventName` set, firing on that trigger,
   with every parameter listed in `eventParameters`.

Then `npm run qa:gtm`, import the container again with Merge and Overwrite, and
register any new parameter as a custom dimension per step 6.

Four things that pass review and fail silently in production, all of which the
QA script catches:

- A name GA4 already sends. `page_view`, `session_start`, `first_visit`,
  `user_engagement`, `scroll`, `click`, `view_search_results`, `video_start`,
  `video_progress`, `video_complete`, `file_download`, `form_start`,
  `form_submit`. Yours and GA4's merge under the one name.
- A parameter GA4 reserves. `page_path`, `page_location`, `page_title`,
  `page_referrer`, `screen_resolution`, `language`, `session_id`,
  `engagement_time_msec`, and anything beginning `ga_`, `google_`, `firebase_`
  or an underscore. Sent, mapped, and thrown away at collection.
- Event tags use `measurementIdOverride`. Config tags use `measurementId`. The
  wrong one imports cleanly and reports to nothing.
- Event tags use `eventParameters` with map keys `name` and `value`. Config tags
  use `eventSettingsTable` with map keys `parameter` and `parameterValue`. Same
  idea, different spelling, and mixing them is an import rejection.

Both of Google's lists live in one commented block at the top of
`scripts/gtm-parity-qa.mjs`, with the support pages they came from. They are
Google's lists, so they go stale when Google changes them. Read the linked
pages before adding an event, and add to the block rather than working around
it.
