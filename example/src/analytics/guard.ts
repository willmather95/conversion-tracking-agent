import type { BeforeSendFn } from 'posthog-js';

export const PROD_HOSTS = ['mathermediasolutions.com', 'www.mathermediasolutions.com'];
export const INTERNAL_PARAM = 'mms_internal';
export const INTERNAL_KEY = 'mms_internal_traffic';

export function isProdHost(host: string): boolean {
  return PROD_HOSTS.includes(host);
}

export function resolveToken(
  envToken: string | undefined,
  host: string,
  defaultToken: string,
): string {
  if (isProdHost(host)) return envToken?.trim() || defaultToken;
  if (host === 'localhost' || host === '127.0.0.1') return envToken?.trim() || '';
  return '';
}

export function isInternal(): boolean {
  try {
    const query = new URLSearchParams(location.search).get(INTERNAL_PARAM);
    const stored = localStorage.getItem(INTERNAL_KEY);
    if (query === '1' && stored !== '1') {
      localStorage.setItem(INTERNAL_KEY, '1');
      console.info('[mms] internal traffic flag set');
    }
    if (query === '0' && stored !== null) {
      localStorage.removeItem(INTERNAL_KEY);
      console.info('[mms] internal traffic flag cleared');
    }
    return localStorage.getItem(INTERNAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function gpcOn(): boolean {
  return typeof navigator !== 'undefined' &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function postHogInitToken(
  envToken: string | undefined,
  host: string,
  defaultToken: string,
  internal: boolean,
  gpc: boolean,
): string {
  return internal || gpc ? '' : resolveToken(envToken, host, defaultToken);
}

export const dropIfInternal: BeforeSendFn = (event) => isInternal() ? null : event;
