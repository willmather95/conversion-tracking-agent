/**
 * Shared types for the Tag Health Checker.
 *
 * Kept free of Node APIs so the client result renderer can import the shape
 * without pulling the fetcher into the browser bundle.
 */

export type CheckStatus = 'found' | 'not_found' | 'needs_look';

export type TagCheckId =
  | 'gtm'
  | 'multiple-gtm'
  | 'ga4'
  | 'ga4-double'
  | 'google-ads'
  | 'meta'
  | 'tiktok'
  | 'linkedin'
  | 'uet'
  | 'consent-default'
  | 'cmp'
  | 'tag-order'
  | 'first-party'
  | 'gtm-snippet';

export type TagCheckResult = {
  id: TagCheckId;
  title: string;
  status: CheckStatus;
  /** Vendor IDs or other short evidence strings, already de-duplicated. */
  ids: string[];
  /** Where the evidence sat, when that distinction matters. */
  where?: string;
  meaning: string;
  docUrl: string;
  docLabel: string;
};

export type TagScanResult = {
  inputUrl: string;
  finalUrl: string;
  scannedAt: string;
  checks: TagCheckResult[];
};

export type TagHealthState =
  | { status: 'idle' }
  | { status: 'invalid'; message: string; values: { url: string } }
  | { status: 'error'; message: string; values: { url: string } }
  | { status: 'ready'; result: TagScanResult; values: { url: string } };

export const EMPTY_TAG_HEALTH_STATE: TagHealthState = { status: 'idle' };
