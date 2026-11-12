#!/usr/bin/env node
/**
 * GTM PARITY GATE
 *
 * ============================================================================
 * THE FAILURE THIS EXISTS TO MAKE IMPOSSIBLE
 * ============================================================================
 *
 * `dataLayer.push({event: 'form_sent'})` is a message with no receiver until a
 * GTM Custom Event trigger listens for that exact string. When the trigger is
 * missing, nothing anywhere reports a problem. The form submits, the console is
 * clean, the network tab is green, and GA4 records nothing at all. On two prior
 * properties here that state ran for weeks before anyone noticed, because the
 * only symptom is a number that stays at zero, and a number that stays at zero
 * looks exactly like a quiet week.
 *
 * The writer and the reader have to be checked against each other, and no build
 * step does that by itself. This is that step.
 *
 * ============================================================================
 * WHAT IT CHECKS
 * ============================================================================
 *
 * FAIL, exit 1:
 *   1.  A registered event with no CUSTOM_EVENT trigger. The original failure.
 *   2.  A registered event with no GA4 event tag.
 *   3.  A tag that fires on a trigger which does not exist.
 *   4.  A tag wired to the wrong trigger for its event name.
 *   5.  A CUSTOM_EVENT trigger no tag fires on. A dead trigger.
 *   6.  A CUSTOM_EVENT trigger for an event the application never emits.
 *   7.  A registry parameter not mapped in its tag. GA4 drops what is not sent.
 *   8.  Any Custom HTML tag. One wrapping a dataLayer push bricked a container.
 *   9.  `measurementId` on a gaawe tag, or `measurementIdOverride` on a gaawc.
 *       Silently wrong: the tag imports fine and reports to nothing.
 *   10. A `{{variable}}` reference that resolves to no defined variable.
 *   11. An event name GA4 already uses. Ours and GA4's merge under one name.
 *   12. A parameter name GA4 reserves. Sent, mapped, and thrown away.
 *   13. A Google Ads conversion tag (awct) that is live while its conversion ID
 *       or label is still a placeholder. The tag ships paused with placeholder
 *       constants so an import can never fire it. Unpausing it before pasting
 *       the real values would report every lead to an account that does not
 *       exist, and Google Ads would show a quiet zero, exactly like rule 1.
 *
 * Rules 11 and 12 exist because rules 1 to 10 all compare this codebase against
 * this container, and the two of them once agreed with each other perfectly
 * while three separate things were wrong on the live domain. Neither side
 * models GA4, which is the third party that actually decides what a name
 * means. See the block headed GA4'S OWN NAMESPACE below.
 *
 * WARN, exit 0:
 *   - Any TIMER trigger. Their interval and limit values do not survive a
 *     container JSON round trip in either direction, so every import needs them
 *     retyped by hand in the UI or the workspace refuses to publish.
 *   - Placeholder IDs still in the file. Expected until the owner swaps them.
 *     That includes the paused Google Ads conversion tag's ID and label.
 *   - A Google Ads conversion tag with real IDs that is still paused. It passes
 *     every check and records nothing, so it is said out loud here.
 *   - A custom variable nothing references.
 *
 * Built-in Google tag types (GA4 config and event, Conversion Linker, Google
 * Ads conversion) are the only kind this container uses. They respect Consent
 * Mode natively and need no consent logic of their own. Custom HTML stays a
 * hard failure under rule 8 whatever it wraps.
 *
 * ============================================================================
 * HOW IT READS THE REGISTRY
 * ============================================================================
 *
 * It imports `src/analytics/events.ts` and reads the real exported values,
 * using Node's native TypeScript stripping. It does NOT grep the source. A
 * regex over source is a second, weaker parser that disagrees with the compiler
 * the moment anything is written in a shape it did not anticipate, and a gate
 * that silently stops seeing events is worse than no gate.
 *
 * Requires Node 22.18 or newer, or Node 23 or newer. On an older runtime the
 * import throws and this script exits 1 saying so, rather than reporting a
 * clean scan it never performed.
 *
 * Zero dependencies. Node stdlib only.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(ROOT, 'src', 'analytics', 'events.ts');
const CONTAINER = path.join(
  ROOT,
  'gtm-container.json',
);

/**
 * Event names allowed to have a CUSTOM_EVENT trigger without being in the
 * registry. Empty, and it should stay empty unless a third party starts pushing
 * to this dataLayer. Anything listed here is a trigger nothing in this codebase
 * can fire, so it needs a reason written beside it.
 */
const EXTERNAL_EVENTS = new Set([]);

/** Built-in GTM trigger IDs a tag may legitimately reference. */
const BUILT_IN_TRIGGERS = new Map([
  ['2147479553', 'All Pages'],
  ['2147479572', 'DOM Ready'],
  ['2147479573', 'Window Loaded'],
]);

const PLACEHOLDERS = ['GTM-XXXXXXX', 'G-XXXXXXXXXX'];

/**
 * The values the Google Ads constants ship with. Checked against the resolved
 * value of each awct field, not by substring over the raw file, because nine
 * zeros is not a string anyone should trust to be unique in a JSON export.
 * The ID is digits only because that is what the awct Conversion ID field
 * takes: the "AW-" prefix belongs to gtag.js, not to this tag.
 */
const GOOGLE_ADS_PLACEHOLDERS = new Map([
  ['conversionId', new Set(['', '000000000'])],
  ['conversionLabel', new Set(['', 'REPLACE_ME'])],
]);

/* ------------------------------------------------------------------ */
/* GA4'S OWN NAMESPACE                                                 */
/* ------------------------------------------------------------------ */

/*
  Two lists, and they exist for two different failures. Both were found by
  reading real /g/collect payloads from the live domain, and neither was
  visible from the code or the container, because in both cases the code and
  the container agreed with each other exactly. GA4 is a third party that
  neither of them models, and it gets the last word on what a name means.

  GA4_BUILT_IN_EVENTS: names GA4 already sends, from Enhanced Measurement or
  from automatic collection. GA4 does not keep ours apart from its own. Both
  arrive under one name, so one user action lands as several rows carrying a
  mix of our parameters and GA4's, and no report can separate this site's event
  from the built-in. Measured: with our events named `form_start` and
  `form_submit`, a single interaction produced three of each, our `form_variant`
  merged with GA4's `form_id`, `form_destination`, `form_length` and
  `first_field_*`.

  GA4_RESERVED_PARAMETERS: names GA4 already owns. It either reserves them
  outright or collects them itself, and either way the value this site sends
  under one is not the value that comes back. These fail more quietly than
  anything else here. The push carries the value, the tag maps it, the request
  is a 200, and collection drops the parameter on the floor. Measured: a
  `cta_click` push carrying `page_path` produced a request with `ep.cta_label`
  and `ep.cta_placement` and no `ep.page_path`, while both siblings from the
  same push arrived. A custom dimension built on such a parameter is empty
  forever and nothing anywhere says why.

  Both lists are Google's, not ours, so both go stale when Google changes them.
  Current sources, all three worth re-reading before adding an event:
    Enhanced measurement events
      https://support.google.com/analytics/answer/9216061
    Automatically collected events
      https://support.google.com/analytics/answer/9234069
    Event naming rules, which is where the reserved prefixes are listed
      https://support.google.com/analytics/answer/13316687

  Neither list has to be exhaustive to be worth having. Each entry is one
  failure that can no longer reach production silently.
*/

/** Event name -> where GA4 sends it from, so the failure message can say. */
const GA4_BUILT_IN_EVENTS = new Map([
  ['page_view', 'automatically collected'],
  ['session_start', 'automatically collected'],
  ['first_visit', 'automatically collected'],
  ['user_engagement', 'automatically collected'],
  ['scroll', 'Enhanced Measurement'],
  ['click', 'Enhanced Measurement, as the outbound click event'],
  ['view_search_results', 'Enhanced Measurement, as site search'],
  ['video_start', 'Enhanced Measurement'],
  ['video_progress', 'Enhanced Measurement'],
  ['video_complete', 'Enhanced Measurement'],
  ['file_download', 'Enhanced Measurement'],
  ['form_start', 'Enhanced Measurement, as a form interaction'],
  ['form_submit', 'Enhanced Measurement, as a form interaction'],
]);

/**
 * Exact parameter names GA4 reserves or collects for itself. Every one of
 * these is already available in reports as a standard dimension, which is why
 * losing them costs nothing.
 */
const GA4_RESERVED_PARAMETERS = new Set([
  'page_path',
  'page_location',
  'page_title',
  'page_referrer',
  'screen_resolution',
  'language',
  'session_id',
  'engagement_time_msec',
]);

/** Whole prefixes GA4 keeps for itself, whatever follows them. */
const GA4_RESERVED_PREFIXES = ['ga_', 'google_', 'firebase_', '_'];

/**
 * Why this parameter name is unusable, or undefined when it is fine. The
 * returned clause is written to read after the thing that carries it.
 */
function reservedParameterReason(name) {
  if (GA4_RESERVED_PARAMETERS.has(name)) {
    return `"${name}", a name GA4 reserves and collects for itself`;
  }
  const prefix = GA4_RESERVED_PREFIXES.find((p) => name.startsWith(p));
  if (prefix) {
    return `"${name}", and GA4 reserves every name starting "${prefix}"`;
  }
  return undefined;
}

/** The consequence, spelled out. Appended to every rule 12 failure. */
const DISCARDED =
  'It is pushed, mapped, and then dropped at collection: it never reaches the ' +
  '/g/collect payload, the custom dimension built on it stays empty forever, ' +
  'and nothing errors. The information is not lost, it is GA4\'s to collect: ' +
  'the page path, for one, arrives on every single hit as "dl".';

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

const C = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
};
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (codes, text) =>
  useColor ? `${[].concat(codes).join('')}${text}${C.reset}` : text;

const lines = [];
const say = (text = '') => lines.push(text);
const flush = () => process.stdout.write(`${lines.join('\n')}\n`);

const failures = [];
const warnings = [];
const fail = (rule, detail) => failures.push({ rule, detail });
const warn = (rule, detail) => warnings.push({ rule, detail });

function finish(code) {
  if (failures.length) {
    say();
    say(paint(C.bold, 'FAILURES'));
    for (const item of failures) {
      say(`  ${paint(C.red, item.rule.padEnd(28))}${item.detail}`);
    }
  }

  if (warnings.length) {
    say();
    say(paint(C.bold, 'WARNINGS'));
    for (const item of warnings) {
      say(`  ${paint(C.yellow, item.rule.padEnd(28))}${item.detail}`);
    }
  }

  say();
  if (failures.length) {
    say(paint([C.bold, C.red], 'FAIL'));
    say(
      paint(
        C.red,
        `  ${failures.length} failure(s), ${warnings.length} warning(s). An event with no ` +
          'listener reaches GA4 as nothing at all,',
      ),
    );
    say(paint(C.red, '  and reports nothing while looking healthy. Fix the above.'));
  } else {
    say(paint([C.bold, C.green], 'PASS'));
    say(
      paint(
        C.dim,
        `  Every registered event has a trigger, a tag, and every parameter mapped. ${warnings.length} warning(s).`,
      ),
    );
  }
  say();
  flush();
  process.exit(code);
}

/* ------------------------------------------------------------------ */
/* Container helpers                                                   */
/* ------------------------------------------------------------------ */

/** Reads a scalar tag/trigger/variable parameter by key. */
function paramValue(entity, key) {
  const found = (entity.parameter ?? []).find((p) => p.key === key);
  return found ? found.value : undefined;
}

function hasParam(entity, key) {
  return (entity.parameter ?? []).some((p) => p.key === key);
}

/**
 * The `name` values of a GA4 event tag's `eventParameters` list.
 *
 * Event tags use `eventParameters` with map keys name / value. Config tags use
 * `eventSettingsTable` with map keys parameter / parameterValue. Same idea,
 * different spelling, and mixing them is an import rejection.
 */
function mappedParameterNames(tag) {
  const list = (tag.parameter ?? []).find((p) => p.key === 'eventParameters');
  if (!list || !Array.isArray(list.list)) return [];
  return list.list
    .map((row) => (row.map ?? []).find((m) => m.key === 'name'))
    .filter(Boolean)
    .map((m) => m.value);
}

/** Every `{{Name}}` reference anywhere inside an entity. */
function variableReferences(entity) {
  const found = new Set();
  const walk = (node) => {
    if (typeof node === 'string') {
      for (const match of node.matchAll(/\{\{([^}]+)\}\}/g)) {
        found.add(match[1]);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };
  walk(entity);
  return found;
}

/** The event name a CUSTOM_EVENT trigger listens for. */
function customEventName(trigger) {
  for (const filter of trigger.customEventFilter ?? []) {
    const arg1 = (filter.parameter ?? []).find((p) => p.key === 'arg1');
    if (arg1) return arg1.value;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Load the registry                                                   */
/* ------------------------------------------------------------------ */

/**
 * Node prints an ExperimentalWarning the first time it strips types. Swallow
 * that one and re-emit everything else, so a real warning is never hidden by
 * the suppression that exists for a cosmetic one.
 */
function quietTypeStrippingWarning() {
  const original = process.listeners('warning');
  process.removeAllListeners('warning');
  process.on('warning', (w) => {
    const cosmetic =
      w.name === 'ExperimentalWarning' && /[Tt]ype [Ss]tripping/.test(w.message);
    if (cosmetic) return;
    for (const listener of original) listener(w);
  });
}

async function loadRegistry() {
  quietTypeStrippingWarning();
  try {
    return await import(pathToFileURL(REGISTRY).href);
  } catch (error) {
    say();
    say(paint([C.bold, C.red], 'FAIL'));
    say(
      paint(
        C.red,
        `  Could not load the event registry at ${path.relative(ROOT, REGISTRY)}`,
      ),
    );
    say(paint(C.red, `  ${error && error.message ? error.message : error}`));
    say();
    say(
      paint(
        C.yellow,
        `  This runs on Node ${process.version}. Native TypeScript stripping needs`,
      ),
    );
    say(
      paint(
        C.yellow,
        '  Node 22.18 or newer, or Node 23 or newer. It is also what a value import',
      ),
    );
    say(
      paint(
        C.yellow,
        '  of an "@/" aliased module in events.ts would break. Type-only imports are fine.',
      ),
    );
    say();
    say(
      paint(
        C.red,
        '  Nothing was checked. This is a hard failure, not a pass.',
      ),
    );
    say();
    flush();
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

say();
say(paint(C.bold, 'GTM PARITY GATE'));
say('='.repeat(50));

const registry = await loadRegistry();
const eventNames = registry.EVENT_NAMES;
const eventParameters = registry.EVENT_PARAMETERS;

if (!Array.isArray(eventNames) || !eventParameters) {
  fail(
    'registry-shape',
    'events.ts must export EVENT_NAMES (array) and EVENT_PARAMETERS (object)',
  );
  finish(1);
}

let container;
try {
  container = JSON.parse(readFileSync(CONTAINER, 'utf8'));
} catch (error) {
  say();
  say(paint([C.bold, C.red], 'FAIL'));
  say(
    paint(
      C.red,
      `  ${path.relative(ROOT, CONTAINER)} could not be parsed as JSON.`,
    ),
  );
  say(paint(C.red, `  ${error && error.message ? error.message : error}`));
  say();
  flush();
  process.exit(1);
}

const version = container.containerVersion;
if (!version) {
  fail('container-shape', 'no containerVersion key, so this is not a GTM export');
  finish(1);
}

const tags = version.tag ?? [];
const triggers = version.trigger ?? [];
const variables = version.variable ?? [];
const builtIns = version.builtInVariable ?? [];

say();
say(`registry   ${eventNames.length} event(s) in src/analytics/events.ts`);
say(
  `container  ${tags.length} tag(s), ${triggers.length} trigger(s), ` +
    `${variables.length} variable(s), ${builtIns.length} built-in(s)`,
);

/* --- indexes ------------------------------------------------------- */

const triggerById = new Map(triggers.map((t) => [String(t.triggerId), t]));
const customEventTriggers = triggers.filter((t) => t.type === 'CUSTOM_EVENT');

/** event name -> triggers listening for it */
const triggersByEvent = new Map();
for (const trigger of customEventTriggers) {
  const name = customEventName(trigger);
  if (!name) {
    fail(
      'trigger-no-event-name',
      `trigger ${trigger.triggerId} "${trigger.name}" is CUSTOM_EVENT with no arg1`,
    );
    continue;
  }
  if (!triggersByEvent.has(name)) triggersByEvent.set(name, []);
  triggersByEvent.get(name).push(trigger);
}

/** event name -> GA4 event tags declaring it */
const tagsByEvent = new Map();
for (const tag of tags) {
  if (tag.type !== 'gaawe') continue;
  const name = paramValue(tag, 'eventName');
  if (!name) {
    fail(
      'tag-no-event-name',
      `tag ${tag.tagId} "${tag.name}" is a GA4 event tag with no eventName`,
    );
    continue;
  }
  if (!tagsByEvent.has(name)) tagsByEvent.set(name, []);
  tagsByEvent.get(name).push(tag);
}

const definedVariableNames = new Set(variables.map((v) => v.name));
const builtInNames = new Set(builtIns.map((v) => v.name));
const referencedVariables = new Set();

/* --- 11, 12: GA4's namespace --------------------------------------- */

for (const event of eventNames) {
  const source = GA4_BUILT_IN_EVENTS.get(event);
  if (source) {
    fail(
      'ga4-event-collision',
      `"${event}" is a name GA4 already sends (${source}). Ours and GA4's merge ` +
        'under it, so one user action arrives as several rows carrying a mix of ' +
        'both sets of parameters, and no report can separate this site from any ' +
        'other form, link or video on the page. Give it a name this site owns, ' +
        'the way form_start became lead_form_start. Turning the GA4 setting off ' +
        'is not the fix: anyone can turn it back on and the merge returns silently.',
    );
  }

  for (const parameter of eventParameters[event] ?? []) {
    const reason = reservedParameterReason(parameter);
    if (reason) {
      fail(
        'ga4-reserved-parameter',
        `"${event}" declares ${reason}. ${DISCARDED}`,
      );
    }
  }
}

/*
  The same two rules against the container, which is not redundant: a tag can
  carry an event name or a parameter the registry never mentions. `scroll_depth`
  is exactly that, it has no registry entry, and it was mapping `page_path`.

  Event tags only. A config tag's "Fields to Set" is the one place a reserved
  page parameter is legitimate, because overriding `page_location` there is how
  a single page app tells GA4 what page it is on. This container's config tag
  sets no fields, and if one ever needs to, it will not be stopped here.
*/
for (const tag of tags) {
  if (tag.type !== 'gaawe') continue;

  const eventName = paramValue(tag, 'eventName');
  const source = eventName ? GA4_BUILT_IN_EVENTS.get(eventName) : undefined;
  if (source) {
    fail(
      'ga4-event-collision',
      `tag ${tag.tagId} "${tag.name}" sends "${eventName}", which GA4 already ` +
        `sends itself (${source}). The two merge under one name.`,
    );
  }

  for (const parameter of mappedParameterNames(tag)) {
    const reason = reservedParameterReason(parameter);
    if (reason) {
      fail(
        'ga4-reserved-parameter',
        `tag ${tag.tagId} "${tag.name}" maps ${reason}. ${DISCARDED}`,
      );
    }
  }
}

/* --- 1, 2, 4, 7: the registry, event by event ---------------------- */

for (const event of eventNames) {
  const matchingTriggers = triggersByEvent.get(event) ?? [];
  const matchingTags = tagsByEvent.get(event) ?? [];

  if (matchingTriggers.length === 0) {
    fail(
      'event-without-trigger',
      `"${event}" is pushed by the app and NO CUSTOM_EVENT trigger listens for it. ` +
        'GA4 will receive nothing.',
    );
  }

  if (matchingTags.length === 0) {
    fail(
      'event-without-tag',
      `"${event}" has no GA4 event tag, so nothing sends it even if a trigger fires`,
    );
    continue;
  }

  for (const tag of matchingTags) {
    const firing = (tag.firingTriggerId ?? []).map(String);

    const wired = matchingTriggers.some((t) =>
      firing.includes(String(t.triggerId)),
    );
    if (matchingTriggers.length > 0 && !wired) {
      fail(
        'tag-wrong-trigger',
        `tag ${tag.tagId} "${tag.name}" sends "${event}" but does not fire on the ` +
          `"${event}" trigger (fires on ${firing.join(', ') || 'nothing'})`,
      );
    }

    const mapped = new Set(mappedParameterNames(tag));
    for (const parameter of eventParameters[event] ?? []) {
      if (!mapped.has(parameter)) {
        fail(
          'parameter-not-mapped',
          `tag ${tag.tagId} "${tag.name}" does not map "${parameter}". ` +
            'The app sends it, GA4 drops it.',
        );
      }
    }
  }
}

/* --- 5, 6: triggers with nothing behind them ----------------------- */

const registered = new Set(eventNames);

for (const trigger of customEventTriggers) {
  const name = customEventName(trigger);
  if (!name) continue;

  const firedBy = tags.filter((tag) =>
    (tag.firingTriggerId ?? []).map(String).includes(String(trigger.triggerId)),
  );
  if (firedBy.length === 0) {
    fail(
      'dead-trigger',
      `trigger ${trigger.triggerId} "${trigger.name}" fires no tag`,
    );
  }

  if (!registered.has(name) && !EXTERNAL_EVENTS.has(name)) {
    fail(
      'trigger-without-emitter',
      `trigger ${trigger.triggerId} listens for "${name}", which nothing in ` +
        'src/analytics/events.ts ever pushes',
    );
  }
}

/* --- 3, 8, 9, 10: every tag ---------------------------------------- */

for (const tag of tags) {
  if (tag.type === 'html') {
    fail(
      'custom-html-tag',
      `tag ${tag.tagId} "${tag.name}" is Custom HTML. Native GA4 tags only: a ` +
        'Custom HTML tag wrapping a dataLayer push has bricked a container here.',
    );
  }

  if (tag.type === 'gaawe' && hasParam(tag, 'measurementId')) {
    fail(
      'wrong-measurement-key',
      `tag ${tag.tagId} "${tag.name}" is a GA4 event tag using "measurementId". ` +
        'Event tags use "measurementIdOverride".',
    );
  }

  if (tag.type === 'gaawc' && hasParam(tag, 'measurementIdOverride')) {
    fail(
      'wrong-measurement-key',
      `tag ${tag.tagId} "${tag.name}" is a GA4 config tag using ` +
        '"measurementIdOverride". Config tags use "measurementId".',
    );
  }

  for (const id of (tag.firingTriggerId ?? []).map(String)) {
    if (triggerById.has(id) || BUILT_IN_TRIGGERS.has(id)) continue;
    fail(
      'missing-trigger-reference',
      `tag ${tag.tagId} "${tag.name}" fires on trigger ${id}, which is not ` +
        'defined in this container and is not a known built-in',
    );
  }

  for (const id of (tag.blockingTriggerId ?? []).map(String)) {
    if (triggerById.has(id) || BUILT_IN_TRIGGERS.has(id)) continue;
    fail(
      'missing-trigger-reference',
      `tag ${tag.tagId} "${tag.name}" is blocked by trigger ${id}, which is not defined`,
    );
  }
}

for (const entity of [...tags, ...triggers, ...variables]) {
  for (const reference of variableReferences(entity)) {
    referencedVariables.add(reference);
    // `_event` is GTM's own internal event name variable, always available.
    if (reference === '_event') continue;
    if (definedVariableNames.has(reference) || builtInNames.has(reference)) {
      continue;
    }
    fail(
      'missing-variable-reference',
      `"${entity.name}" references {{${reference}}}, which is neither a defined ` +
        'variable nor an enabled built-in. It resolves to undefined at runtime.',
    );
  }
}

/* --- 13: Google Ads conversion tags -------------------------------- */

/**
 * A tag field's effective value. A whole-field `{{Name}}` reference to a
 * Constant variable resolves to that constant's value. Anything else, a
 * literal or a reference to a variable only known at runtime, is returned as
 * written, and a runtime variable is treated as a real value on purpose: this
 * gate cannot know it, and guessing placeholder would block a legitimate setup.
 */
function resolvedTagField(tag, key) {
  const raw = String(paramValue(tag, key) ?? '').trim();
  const reference = raw.match(/^\{\{([^}]+)\}\}$/);
  if (!reference) return raw;
  const constant = variables.find(
    (v) => v.name === reference[1] && v.type === 'c',
  );
  return constant ? String(paramValue(constant, 'value') ?? '').trim() : raw;
}

const isPaused = (tag) => tag.paused === true || tag.paused === 'true';

for (const tag of tags) {
  if (tag.type !== 'awct') continue;

  const placeholderFields = [...GOOGLE_ADS_PLACEHOLDERS]
    .filter(([key, values]) => values.has(resolvedTagField(tag, key)))
    .map(([key]) => `${key} "${resolvedTagField(tag, key)}"`);

  if (placeholderFields.length > 0 && !isPaused(tag)) {
    fail(
      'ads-placeholder-live',
      `tag ${tag.tagId} "${tag.name}" is not paused while its ` +
        `${placeholderFields.join(' and ')} ` +
        `${placeholderFields.length > 1 ? 'are still placeholders' : 'is still a placeholder'}. It would ` +
        'report every lead to a conversion action that does not exist, and ' +
        'Google Ads would show zero with no error. Paste the real ID and label ' +
        'into the Google Ads constants, or set "paused": true.',
    );
  } else if (placeholderFields.length > 0) {
    warn(
      'placeholder-id',
      `tag ${tag.tagId} "${tag.name}" is paused with a placeholder ` +
        `${placeholderFields.join(' and ')}. Expected until the owner pastes ` +
        'the real values and unpauses it. See docs/gtm-ga4-setup.md.',
    );
  } else if (isPaused(tag)) {
    warn(
      'ads-tag-paused',
      `tag ${tag.tagId} "${tag.name}" has real conversion values and is still ` +
        'paused, so it records nothing. Unpause it in GTM, then publish.',
    );
  }
}

/* --- warnings ------------------------------------------------------ */

const timers = triggers.filter((t) => t.type === 'TIMER');
for (const timer of timers) {
  warn(
    'timer-trigger',
    `trigger ${timer.triggerId} "${timer.name}" is a TIMER. Its interval and ` +
      'limit will not survive this JSON, so they must be retyped in the GTM UI ' +
      'after import or the workspace refuses to publish.',
  );
}

const raw = readFileSync(CONTAINER, 'utf8');
for (const placeholder of PLACEHOLDERS) {
  if (raw.includes(placeholder)) {
    warn(
      'placeholder-id',
      `${placeholder} is still in the file. Swap it for the real ID before ` +
        'publishing the workspace. See docs/gtm-ga4-setup.md.',
    );
  }
}

for (const variable of variables) {
  if (!referencedVariables.has(variable.name)) {
    warn(
      'unreferenced-variable',
      `variable ${variable.variableId} "${variable.name}" is used by no tag or trigger`,
    );
  }
}

/* --- summary -------------------------------------------------------- */

const covered = eventNames.filter(
  (event) => (triggersByEvent.get(event) ?? []).length > 0,
).length;
const totalParameters = eventNames.reduce(
  (sum, event) => sum + (eventParameters[event] ?? []).length,
  0,
);

say();
say(paint(C.bold, 'COVERAGE'));
const nameWidth =
  eventNames.reduce((widest, event) => Math.max(widest, event.length), 0) + 2;
for (const event of eventNames) {
  const trigger = (triggersByEvent.get(event) ?? [])[0];
  const tag = (tagsByEvent.get(event) ?? [])[0];
  const mapped = tag ? new Set(mappedParameterNames(tag)) : new Set();
  const declared = eventParameters[event] ?? [];
  const missing = declared.filter((p) => !mapped.has(p));
  /*
    The wiring is part of the row, not just the existence of both halves. A tag
    that sends the right event name off the wrong trigger is the most deceptive
    shape this file can take, and it would otherwise print as ok here while
    failing below.
  */
  const wired = Boolean(
    trigger &&
      tag &&
      (tag.firingTriggerId ?? []).map(String).includes(String(trigger.triggerId)),
  );
  const ok = wired && missing.length === 0;
  const mark = ok ? paint(C.green, 'ok  ') : paint(C.red, 'FAIL');
  const detail = [
    trigger ? `trigger ${trigger.triggerId}` : paint(C.red, 'NO TRIGGER'),
    tag ? `tag ${tag.tagId}` : paint(C.red, 'NO TAG'),
    trigger && tag && !wired ? paint(C.red, 'NOT WIRED') : null,
    `${declared.length - missing.length}/${declared.length} params`,
  ]
    .filter(Boolean)
    .join(', ');
  say(`  ${mark} ${event.padEnd(nameWidth)}${detail}`);
}

say();
say(paint(C.bold, 'SUMMARY'));
say(`  ${'events registered'.padEnd(28)}${eventNames.length}`);
say(`  ${'events with a trigger'.padEnd(28)}${covered}/${eventNames.length}`);
say(`  ${'parameters declared'.padEnd(28)}${totalParameters}`);
say(`  ${'custom html tags'.padEnd(28)}${tags.filter((t) => t.type === 'html').length}`);
say(`  ${'timer triggers'.padEnd(28)}${timers.length}`);
say(
  `  ${'google ads conversion tags'.padEnd(28)}` +
    `${tags.filter((t) => t.type === 'awct').length} ` +
    `(${tags.filter((t) => t.type === 'awct' && isPaused(t)).length} paused)`,
);
say(`  ${'failures'.padEnd(28)}${failures.length}`);
say(`  ${'warnings'.padEnd(28)}${warnings.length}`);

finish(failures.length ? 1 : 0);
