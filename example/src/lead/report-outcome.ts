/**
 * Reports the outcome of one resolved lead submission, at most once.
 *
 * LeadForm calls this from an effect keyed on `state`. Each resolved action
 * hands back a new state object, so a second real submission always counts,
 * even with the same outcome. The WeakSet makes "the same outcome again" (a
 * re-render, a repeated effect run, a double-click that reuses the state) send
 * nothing more, without relying only on React's dependency check.
 *
 * Node-importable for scripts/analytics-guard-qa.mjs: relative value imports
 * with the .ts extension, type-only imports otherwise.
 */
import {
  trackFormInvalid,
  trackFormSent,
  trackFormUndelivered,
  trackWaitlistJoin,
  trackWaitlistUndelivered,
} from '../analytics/events.ts';
import type { LeadState } from '../types.ts';
import type { LeadVariant } from '../types.ts';

const reported = new WeakSet<object>();

export function reportLeadOutcome(
  state: LeadState,
  variant: LeadVariant,
  waitlist: boolean,
): void {
  if (state.status === 'idle' || reported.has(state)) return;
  reported.add(state);

  if (state.status === 'invalid') {
    trackFormInvalid({
      form_variant: variant,
      invalid_field_count: Object.keys(state.fieldErrors).length,
    });
    return;
  }
  if (state.status === 'sent') {
    if (waitlist) trackWaitlistJoin({ form_variant: variant });
    else trackFormSent({ form_variant: variant });
    return;
  }
  if (state.status === 'undelivered') {
    /*
      Reported as its own event, not folded into an error bucket. A report
      counting only form_sent would hide attempted leads whenever a configured
      transport is missing or fails.
    */
    const params = { form_variant: variant, undelivered_reason: state.reason };
    if (waitlist) trackWaitlistUndelivered(params);
    else trackFormUndelivered(params);
  }
}
