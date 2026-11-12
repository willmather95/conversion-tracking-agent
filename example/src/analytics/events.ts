/**
 * THE EVENT REGISTRY. One file, and it is the only place an event name exists.
 *
 * ============================================================================
 * WHY THIS FILE IS SHAPED THE WAY IT IS
 * ============================================================================
 *
 * A dataLayer push is a message with no receiver until a GTM trigger listens
 * for it by exact name. Nothing fails when the receiver is missing. The form
 * still submits, the console stays clean, the network tab shows a successful
 * request, and GA4 reports nothing at all. That exact failure has now happened
 * twice on other properties here, and on one of them a live subscribe form ran
 * for weeks writing into a dataLayer that no trigger read.
 *
 * So the names are declared once, here, and three things hang off that:
 *
 *   1. Call sites never type an event name. They call `trackFormSent(...)`.
 *      A typo becomes a TypeScript error instead of silence.
 *
 *   2. `EVENT_PARAMETERS` is checked against the payload types at compile time
 *      in BOTH directions (see AllParametersListed below), so the declared
 *      parameter list cannot drift from what the helpers actually send.
 *
 *   3. `scripts/gtm-parity-qa.mjs` imports this module directly, at its real
 *      runtime values, and fails the build if the container JSON does not carry
 *      a CUSTOM_EVENT trigger and a mapped GA4 tag for every entry. It does not
 *      grep for pushes. It reads the registry. It also fails if a name declared
 *      here lands inside GA4's own namespace, which is the one class of wiring
 *      error the container cannot reveal: the app and the container agree with
 *      each other perfectly, and GA4 merges or discards anyway.
 *
 * ============================================================================
 * CONSTRAINTS ON EDITING THIS FILE
 * ============================================================================
 *
 * The QA gate loads this module under Node's native TypeScript stripping, so it
 * must stay runtime-importable outside the Next build:
 *
 *   - Type-only imports are fine (they are erased). Value imports from other
 *     modules are NOT, except the import-free guard.ts. The `@/` alias does not
 *     resolve under plain Node.
 *   - No enums, no namespaces, no decorators, no parameter properties. Those
 *     are the TypeScript constructs stripping refuses.
 *   - Nothing may execute at import time beyond building the constants below.
 *
 * Adding an event is three edits in this file plus two in the container JSON
 * (a CUSTOM_EVENT trigger and a GA4 event tag). Skip either JSON edit and the
 * gate fails before the build finishes.
 */

import { isInternal } from './guard.ts';

import type { ServiceSlug } from '../types.ts';
import type { LeadVariant } from '../types.ts';
import type { PostHogWindow } from '../types.ts';

/* ------------------------------------------------------------------ */
/* Value vocabularies                                                  */
/* ------------------------------------------------------------------ */

/**
 * Where a primary call to action was rendered. Required at every call site, so
 * that a report can separate the header button (browsing) from the closing one
 * (finished reading) without inferring it from the page path.
 */
export type CtaPlacement =
  | 'header'
  | 'hero'
  | 'hero_secondary'
  | 'closing'
  | 'footer'
  | 'calculator'
  /** The action under a price block. */
  | 'pricing'
  | 'not_found'
  /** The promo card for the Signal Check, wherever it is placed. */
  | 'signal_check_card'
  /** The next step shown under the unlocked Signal Check. */
  | 'signal_check_result'
  /** The one CTA under a Tag Health Checker result. */
  | 'tag_health_result'
  /** The phone-only bar that pins the page's action in the thumb zone. */
  | 'sticky_mobile';

/**
 * Which email link was used. `form_fallback` is the one that matters most: it
 * is the link inside the undelivered state, which is the live conversion path
 * until a delivery transport is configured.
 */
export type MailtoPlacement =
  | 'contact'
  | 'footer'
  | 'not_found'
  | 'form_fallback'
  | 'form_alternative';

/* ------------------------------------------------------------------ */
/* The registry                                                        */
/* ------------------------------------------------------------------ */

/**
 * Every event this site emits, and the exact parameters each one carries.
 * This type is the source of truth. Everything else in the file is derived
 * from it or checked against it.
 */
type EventPayloads = {
  /**
   * The single primary action, wherever it appears.
   *
   * NO `page_path` HERE, AND NOTHING ELSE MAY ADD ONE. It used to be on this
   * event and on phase_view. It was pushed, it was mapped in the container,
   * and it never once arrived: `page_path` is reserved by GA4, which drops it
   * at collection with no error anywhere. Measured on the live domain, the
   * push carried `page_path` and the resulting /g/collect request carried
   * `ep.cta_label` and `ep.cta_placement` and no `ep.page_path` at all. Its
   * two siblings from the same push landed, so the mapping was fine and the
   * name was not.
   * GA4 derives the path itself and sends it as `dl` on every single hit, so
   * reports read it from there. Sending our own only ever produced a custom
   * dimension that stayed empty.
   */
  cta_click: {
    cta_label: string;
    cta_placement: CtaPlacement;
  };
  /** A service detail page was opened. */
  phase_view: {
    phase_slug: ServiceSlug;
  };
  /**
   * First interaction with any field. Fires once per mounted form.
   *
   * NAMED `lead_form_start` RATHER THAN `form_start`, DELIBERATELY. GA4
   * Enhanced Measurement ships its own `form_start` and `form_submit`. While
   * this site used those names, one interaction on the live domain produced
   * three `form_start` rows and three `form_submit` rows, each carrying a
   * merge of our `form_variant` with GA4's `form_id`, `form_destination`,
   * `form_length` and `first_field_*` parameters. One user action, several
   * rows, mixed parameters, and no report able to tell this form apart from
   * any other form on the page.
   *
   * The alternative fix is to switch Enhanced Measurement's form interactions
   * off in the GA4 UI. That was considered and rejected. A UI toggle can be
   * flipped back by anyone with edit access at any time, and when it is, the
   * collision returns silently: no build fails, no error appears, the numbers
   * just quietly stop meaning what they say. A name GA4 does not use cannot
   * collide no matter what anyone toggles. Do not "simplify" this back.
   */
  lead_form_start: { form_variant: LeadVariant };
  /** Submission attempted. Says nothing about whether it validated. */
  lead_form_submit: { form_variant: LeadVariant };
  /**
   * Server-side validation rejected it.
   *
   * This one, `form_sent` and `form_undelivered` keep their bare names: GA4
   * has no built-in by any of those three. So the five form events are no
   * longer uniformly prefixed, and that is fine. Uniformity is not what these
   * names are for. Not colliding is. Renaming the three that do not collide,
   * purely so the set looks tidy, would break every report and audience built
   * on them for no measurable gain at all.
   */
  form_invalid: {
    form_variant: LeadVariant;
    invalid_field_count: number;
  };
  /** A transport accepted the lead. Only ever set after a 2xx. */
  form_sent: { form_variant: LeadVariant };
  /**
   * A transport accepted a waiting-list sign-up (form_variant early-access).
   * Its own name, not form_sent, because GA4 marks key events by name: a
   * waitlist email sent as form_sent would count as a sales lead in GA4 and in
   * any Ads goal imported from it. Same 2xx rule as form_sent.
   */
  waitlist_join: { form_variant: LeadVariant };
  /**
   * A waiting-list sign-up that no transport received. The waitlist's own
   * form_undelivered, split out for the same reason as waitlist_join:
   * form_undelivered is a key event.
   */
  waitlist_undelivered: {
    form_variant: LeadVariant;
    undelivered_reason: string;
  };
  /**
   * Validated, and nothing received it. This is not an error state to be
   * filtered out of reports: it is a real inbound lead that reached the mailto
   * path instead of the inbox.
   */
  form_undelivered: {
    form_variant: LeadVariant;
    undelivered_reason: string;
  };
  /**
   * An email link was opened. `form_variant` is present only on the two links
   * that live inside a form, and absent everywhere else.
   */
  mailto_click: {
    mailto_placement: MailtoPlacement;
    form_variant?: LeadVariant;
  };
  /** A link leaving this origin. Captured globally, not per link. */
  outbound_click: {
    link_domain: string;
    link_url: string;
  };
};

export type EventName = keyof EventPayloads;
export type EventParams<E extends EventName> = EventPayloads[E];

/**
 * The parameter list per event, as data the QA gate can read.
 *
 * `satisfies` rejects a listed parameter that is not on the payload type. The
 * assertion under it rejects the opposite mistake.
 */
export const EVENT_PARAMETERS = {
  cta_click: ['cta_label', 'cta_placement'],
  phase_view: ['phase_slug'],
  lead_form_start: ['form_variant'],
  lead_form_submit: ['form_variant'],
  form_invalid: ['form_variant', 'invalid_field_count'],
  form_sent: ['form_variant'],
  waitlist_join: ['form_variant'],
  waitlist_undelivered: ['form_variant', 'undelivered_reason'],
  form_undelivered: ['form_variant', 'undelivered_reason'],
  mailto_click: ['mailto_placement', 'form_variant'],
  outbound_click: ['link_domain', 'link_url'],
} as const satisfies {
  [E in EventName]: readonly (keyof EventPayloads[E] & string)[];
};

/**
 * Any payload key missing from EVENT_PARAMETERS, collected as a type.
 * When everything is listed this resolves to `never`.
 */
type UnlistedParameters = {
  [E in EventName]: Exclude<
    keyof EventPayloads[E],
    (typeof EVENT_PARAMETERS)[E][number]
  >;
}[EventName];

type AssertNever<T extends never> = T;

/**
 * A compile error here means a parameter was added to EventPayloads and not to
 * EVENT_PARAMETERS. The message names the missing key. Without this, a new
 * parameter would be sent by the app, absent from the registry, and therefore
 * never checked against the container: silently dropped by GA4 because no tag
 * maps it. Exported only so it counts as used.
 */
export type AllParametersListed = AssertNever<UnlistedParameters>;

/** Every event name. The list the QA gate walks. */
export const EVENT_NAMES = Object.keys(EVENT_PARAMETERS) as EventName[];

/* ------------------------------------------------------------------ */
/* The push                                                            */
/* ------------------------------------------------------------------ */

/**
 * GA4 silently discards an event parameter whose value is longer than 100
 * characters. Not truncated: dropped, with no error anywhere. The only
 * unbounded value on this site is `undelivered_reason`, which is authored copy
 * and currently well inside the limit, but authored copy changes.
 */
const MAX_PARAM_LENGTH = 100;

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

/**
 * Drops absent values and clamps long strings. An absent optional parameter is
 * left off the push entirely rather than sent as the string "undefined", which
 * is what GA4 would otherwise record and report on.
 */
function sanitize(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] =
      typeof value === 'string' && value.length > MAX_PARAM_LENGTH
        ? value.slice(0, MAX_PARAM_LENGTH)
        : value;
  }
  return out;
}

/**
 * The only function in the codebase that writes to the dataLayer.
 *
 * Server-safe: it returns without doing anything when there is no window, so a
 * helper called during a server render is a no-op rather than a crash. It is
 * not exported, because an exported generic push is an invitation to pass a
 * string literal event name at a call site, and the whole point of this file is
 * that no call site does that.
 */
function push<E extends EventName>(event: E, params: EventParams<E>): void {
  if (isInternal()) return;
  if (typeof window === 'undefined') return;
  const target = window as unknown as DataLayerWindow;
  const layer = (target.dataLayer ??= []);
  const clean = sanitize(params);
  layer.push({ event, ...clean });

  /*
    The same event, same name, same parameters, to PostHog, so the GA4 and
    PostHog funnels read the same words. window.posthog is set by
    src/instrumentation-client.ts. It is absent when initialization is skipped
    (including GPC), and PostHog honors Do Not Track through respect_dnt.
    Wrapped so an analytics fault can never break a form submit.
  */
  try {
    (window as unknown as PostHogWindow).posthog?.capture(event, clean);
  } catch {
    /* analytics must never throw into a user action */
  }
}

/* ------------------------------------------------------------------ */
/* Helpers. One per event, and the only way to emit one.               */
/* ------------------------------------------------------------------ */

export function trackCtaClick(params: EventParams<'cta_click'>): void {
  push('cta_click', params);
}

export function trackPhaseView(params: EventParams<'phase_view'>): void {
  push('phase_view', params);
}

export function trackLeadFormStart(
  params: EventParams<'lead_form_start'>,
): void {
  push('lead_form_start', params);
}

export function trackLeadFormSubmit(
  params: EventParams<'lead_form_submit'>,
): void {
  push('lead_form_submit', params);
}

export function trackFormInvalid(params: EventParams<'form_invalid'>): void {
  push('form_invalid', params);
}

export function trackFormSent(params: EventParams<'form_sent'>): void {
  push('form_sent', params);
}

export function trackWaitlistJoin(params: EventParams<'waitlist_join'>): void {
  push('waitlist_join', params);
}

export function trackWaitlistUndelivered(
  params: EventParams<'waitlist_undelivered'>,
): void {
  push('waitlist_undelivered', params);
}

export function trackFormUndelivered(
  params: EventParams<'form_undelivered'>,
): void {
  push('form_undelivered', params);
}

export function trackMailtoClick(params: EventParams<'mailto_click'>): void {
  push('mailto_click', params);
}

export function trackOutboundClick(
  params: EventParams<'outbound_click'>,
): void {
  push('outbound_click', params);
}
