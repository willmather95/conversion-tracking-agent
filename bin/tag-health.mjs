#!/usr/bin/env node
/**
 * Scan one public page for tracking tags: 14 read-only checks.
 *
 *   npm run scan -- https://example.com
 *   npm run scan -- https://example.com --json
 *
 * Fetches the page HTML and each public GTM container it references. Never
 * submits forms, never runs page JavaScript, and refuses private or local hosts.
 */
import { scanTagHealth } from '../src/tag-health/scan.ts';
import { plainTextResults } from '../src/tag-health/format.ts';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
if (!url) {
  console.error('usage: npm run scan -- <https://public-page> [--json]');
  process.exit(2);
}
try {
  const result = await scanTagHealth(url);
  console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : plainTextResults(result));
} catch (error) {
  console.error(`scan failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
