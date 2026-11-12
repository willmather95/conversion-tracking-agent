/**
 * Best-effort in-memory rate limit for the Tag Health Checker.
 *
 * Per-isolate on Vercel: it slows a single instance, it is not a durable log,
 * and it does not store scanned URLs. Missing client IPs share one bucket.
 */

import {
  RATE_LIMIT_GLOBAL,
  RATE_LIMIT_PER_IP,
  RATE_LIMIT_WINDOW_MS,
} from './constants.ts';

const perIp = new Map<string, number[]>();
let globalHits: number[] = [];

function prune(times: number[], now: number): number[] {
  const floor = now - RATE_LIMIT_WINDOW_MS;
  return times.filter((time) => time > floor);
}

export function allowScan(ip: string): boolean {
  const now = Date.now();
  const key = ip.trim() || 'unknown';
  const ipHits = prune(perIp.get(key) ?? [], now);
  globalHits = prune(globalHits, now);

  if (ipHits.length >= RATE_LIMIT_PER_IP || globalHits.length >= RATE_LIMIT_GLOBAL) {
    perIp.set(key, ipHits);
    return false;
  }

  ipHits.push(now);
  globalHits.push(now);
  perIp.set(key, ipHits);
  return true;
}
