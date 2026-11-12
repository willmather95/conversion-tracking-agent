/**
 * Runs the 14 detection checks offline against a made-up page and container,
 * so the logic is testable without a network hop.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectTags } from '../src/tag-health/detect.ts';
import { plainTextResults } from '../src/tag-health/format.ts';

const html = readFileSync(new URL('./fixtures/sample-page.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('./fixtures/sample-container.js', import.meta.url), 'utf8');
const result = detectTags({
  inputUrl: 'https://example.com/',
  finalUrl: 'https://example.com/',
  html,
  containers: [{ id: 'GTM-ABC1234', js }],
  scannedAt: '2026-11-12T15:00:00.000Z',
});
const by = Object.fromEntries(result.checks.map((c) => [c.id, c]));
assert.equal(result.checks.length, 14, '14 checks');
assert.equal(by.gtm.status, 'found');
assert.equal(by.ga4.status, 'found');
assert.equal(by.meta.status, 'found');
assert.equal(by['consent-default'].status, 'found');
assert.equal(by['ga4-double'].status, 'needs_look', 'same GA4 ID hardcoded and in GTM is flagged');
if (process.argv.includes('--print')) console.log(plainTextResults(result));
console.log(`detect: pass (${result.checks.map((c) => `${c.id}=${c.status}`).join(', ')})`);
