# GTM API and MCP quirks

## Quotas
- GTM API: 10,000 requests per project per day; 0.25 QPS per project
  (25 requests per 100 s sliding window). Daily reset at midnight Pacific.
  Google returns 403 on quota; hosted MCPs may surface it as 429.
- A hosted MCP (e.g. Stape's) may share one Google project across users, so
  you can hit limits you didn't cause. Pace calls; batch reads; cache output.
- On 429/quota 403: wait 60 s, retry, max 3 tries. Then report BLOCKED.
- 401/403 auth errors: run `gtm_auth_status` (shows token state and scopes,
  never the token). Don't call `gtm_remove_session` unless the owner asks.

## Reading
- `gtm_tag/trigger/variable list` return 20 per page. Page until empty.
- `gtm_version live` / `get` with `resourceType` (tag, trigger, variable,
  folder, builtInVariable, customTemplate, ...) to avoid truncated output;
  20 per page. Without it you get a summary only.
- `gtm_version_header list` gives version numbers and names cheaply.
- Use the real workspace IDs from `gtm_workspace list`; guessing gives 404.
- `gtag_destination` only works for Google tag IDs, not GTM container IDs.

## Writing (only with permission)
- `update` replaces the whole object. Always `get` first, change, send the
  full object with its `fingerprint`. Omitted fields are deleted.
- `gtm_workspace bulkUpdate` applies many changes at once (atomic). New
  objects use temp IDs `new_1`, `new_2` that other objects can reference.
- Publish = `gtm_workspace createVersion` then `gtm_version publish`
  (needs the version fingerprint). Publishing removes the workspace.
- Rollback = `gtm_version publish` on the prior version. `setLatest` only
  changes the draft base; it does not change what's live.
- Free containers: max 3 workspaces (Default + 2). Don't delete someone
  else's workspace to make room.
- `gtm_template importFromGallery` needs `acknowledgePermissions: true` and
  the owner's review of the template's permissions.
- A tag that uses a gallery template has type `cvt_<galleryTemplateId>`
  (e.g. `cvt_K8GSG`, from the import response), not
  `cvt_<containerId>_<templateId>`. The wrong form fails with
  "Unknown entity type".
- A Page View-type blocking trigger only matches the page view event. To
  block tags on Consent Initialization, Initialization or custom events, use
  a Custom Event trigger with event regex `.*` plus your condition.
- Consent per tag: `consentSettings.consentStatus` = `notSet`, `notNeeded`
  or `needed` (+ `consentType` list).

## Tag JSON gotchas
- GA4 Event tag (`gaawe`): measurement ID key is `measurementIdOverride`;
  params go in `eventSettingsTable` rows with keys `parameter` and
  `parameterValue`.
- Match sibling objects' field shapes when creating; copy a working one.
- Regex fields are RE2: no lookarounds. Use the "ignore case" operator,
  not an inline `(?i)` flag.
- Empty variable inside quotes in Custom HTML becomes the text "undefined".
  Use a variable default (Format Value > convert undefined) instead of `||`.
- Built-in variables (Click URL, Form ID...) must be enabled before triggers
  can use them.

## Container JSON import (UI)
- Use **Merge**, conflicts **Rename** (or Overwrite only for objects you mean
  to replace). Never "Overwrite" the whole container.
- After import, diff object by object (added/changed/removed) before Preview.
- Export the live version first; that file is your manual rollback.
- `exportFormatVersion: 2`; every object needs a fingerprint; don't use the
  All Pages system ID (`2147483647`) in hand-built JSON; no placeholder Ads
  IDs; no `notes` on hand-built tags.
- Every new tag needs a `consentSettings` block like its siblings. Google tags
  (GA4, Ads) can be `notSet` because they read Consent Mode themselves;
  non-Google tags should be `needed` with consent types.
- If a hand-built import fails twice with the same "File format is invalid"
  error at the same spot, stop guessing: export the live container and append
  your new objects into its arrays, keeping every other byte the same.

## Other
- Hosted booking/checkout platforms often don't load your GTM by default.
  Check the vendor's docs: many need the container ID in settings or a URL
  parameter, and some block Custom HTML (use native GA4 Event tags).
- Some MCP clients cap server+tool name length at 60 chars; long server
  names can hide tools.
- Hosted MCP data passes through the host. For sensitive client work, the
  local CLI with the owner's own credentials keeps data on the machine.
- Vercel/CI env values copied with a trailing newline break IDs
  (`G-XXXX\n`). Trim them.
