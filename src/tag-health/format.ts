import type { TagScanResult } from './types.ts';

export function plainTextResults(result: TagScanResult): string {
  const lines = [
    'Tag Health Checker',
    `URL fetched: ${result.finalUrl}`,
    `As of: ${result.scannedAt}`,
    '',
  ];
  for (const check of result.checks) {
    const status =
      check.status === 'found' ? 'Found' : check.status === 'needs_look' ? 'Needs a look' : 'Not found';
    lines.push(`${check.title}: ${status}`);
    if (check.ids.length) lines.push(`  IDs: ${check.ids.join(', ')}`);
    if (check.where) lines.push(`  Where: ${check.where}`);
    lines.push(`  ${check.meaning}`);
    lines.push(`  Doc: ${check.docUrl}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}
