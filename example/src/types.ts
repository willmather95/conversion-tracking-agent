/** Type-only stand-ins for the site modules the example was lifted from. */
export type ServiceSlug = string;
export type LeadVariant =
  | 'audit' | 'search-audit' | 'capability-quiz' | 'enquiry' | 'signal-check' | 'early-access';
export type PostHogWindow = Window & { posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } };
export type LeadState =
  | { status: 'idle' }
  | { status: 'invalid'; fieldErrors: Record<string, string> }
  | { status: 'undelivered'; reason: string }
  | { status: 'sent' };
