import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dropIfInternal, postHogInitToken, gpcOn, INTERNAL_KEY, isInternal, isProdHost, resolveToken } from '../src/analytics/guard.ts';
import * as events from '../src/analytics/events.ts';
import { gtmLoaderSnippet } from '../src/analytics/gtm.ts';
import { guardLeadSubmit } from '../src/lead/submit-guard.ts';
import { reportLeadOutcome } from '../src/lead/report-outcome.ts';

let failures = 0;
function test(name, run) {
  try {
    reset();
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function define(name, value) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
let captures;
function reset() {
  const storage = new Map();
  define('location', { search: '' });
  define('localStorage', {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  });
  define('navigator', {});
  define('window', globalThis);
  captures = [];
  window.dataLayer = [];
  window.posthog = { capture: (event, params) => captures.push({ event, ...params }) };
}
function counts(expected) {
  assert.equal(window.dataLayer.filter(({ event }) => event === 'form_sent').length, expected);
  assert.equal(captures.filter(({ event }) => event === 'form_sent').length, expected);
}

test('production host allowlist is exact', () => {
  for (const host of ['mathermediasolutions.com', 'www.mathermediasolutions.com']) assert.equal(isProdHost(host), true);
  for (const host of ['x-git-feat-y.vercel.app', 'localhost', 'mathermediasolutions.com.evil.io', 'WWW.mathermediasolutions.com']) assert.equal(isProdHost(host), false);
});
test('token resolution', () => {
  assert.equal(resolveToken(undefined, 'preview.vercel.app', 'default'), '');
  assert.equal(resolveToken(undefined, 'mathermediasolutions.com', 'default'), 'default');
  for (const host of ['localhost', '127.0.0.1', 'mathermediasolutions.com']) assert.equal(resolveToken(' explicit ', host, 'default'), 'explicit');
  assert.equal(resolveToken(' explicit ', 'preview.vercel.app', 'default'), '');
  assert.equal(resolveToken(undefined, 'localhost', 'default'), '');
  assert.equal(resolveToken('  ', 'preview.vercel.app', 'default'), '');
  assert.equal(resolveToken('  ', 'mathermediasolutions.com', 'default'), 'default');
});
test('PostHog init gate covers hosts, internal traffic and GPC', () => {
  const init = (token, host, internal = false, gpc = false) =>
    postHogInitToken(token, host, 'default', internal, gpc);
  assert.equal(init(undefined, 'mathermediasolutions.com'), 'default');
  assert.equal(init('explicit', 'mathermediasolutions.com'), 'explicit');
  assert.equal(init(undefined, 'preview.vercel.app'), '');
  assert.equal(init('explicit', 'preview.vercel.app'), '');
  assert.equal(init('explicit', 'mathermediasolutions.com', true), '');
  assert.equal(init('explicit', 'mathermediasolutions.com', false, true), '');
  assert.equal(init('explicit', 'localhost'), 'explicit');
  assert.equal(init(undefined, 'localhost'), '');
});
test('before_send drops later internal traffic and clearing restores events', () => {
  const event = { event: '$pageview', properties: {} };
  assert.equal(dropIfInternal(event), event);
  location.search = '?mms_internal=1';
  assert.equal(dropIfInternal(event), null);
  location.search = '';
  assert.equal(dropIfInternal(event), null);
  location.search = '?mms_internal=0';
  assert.equal(dropIfInternal(event), event);
});
test('internal flag logs only stored changes', () => {
  const messages = [];
  const original = console.info;
  console.info = (message) => messages.push(message);
  try {
    for (const search of ['?mms_internal=0', '?mms_internal=1', '?mms_internal=1', '', '?mms_internal=0', '?mms_internal=0']) {
      location.search = search;
      isInternal();
    }
    assert.deepEqual(messages, [
      '[mms] internal traffic flag set',
      '[mms] internal traffic flag cleared',
    ]);
  } finally {
    console.info = original;
  }
});
test('internal flag persists and clears', () => {
  for (const [search, expected] of [['?mms_internal=1', true], ['', true], ['?mms_internal=0', false], ['', false]]) {
    location.search = search;
    assert.equal(isInternal(), expected);
  }
});
test('unavailable storage fails open', () => {
  define('localStorage', { getItem() { throw new Error('blocked'); } });
  assert.equal(isInternal(), false);
  location.search = '?mms_internal=1';
  define('localStorage', { setItem() { throw new Error('blocked'); } });
  assert.equal(isInternal(), false);
});
test('GPC handles true, false, undefined and missing navigator', () => {
  for (const value of [true, false, undefined]) {
    navigator.globalPrivacyControl = value;
    assert.equal(gpcOn(), value === true);
  }
  delete globalThis.navigator;
  assert.equal(gpcOn(), false);
});
test('internal flag blocks both event destinations and clearing restores them', () => {
  localStorage.setItem(INTERNAL_KEY, '1');
  events.trackFormSent({ form_variant: 'implant' });
  assert.equal(window.dataLayer.length, 0);
  assert.equal(captures.length, 0);
  location.search = '?mms_internal=0';
  events.trackFormSent({ form_variant: 'implant' });
  counts(1);
  assert.deepEqual(window.dataLayer, [{ event: 'form_sent', form_variant: 'implant' }]);
  assert.deepEqual(captures, window.dataLayer);
});
test('GPC leaves dataLayer consent to GTM', () => {
  navigator.globalPrivacyControl = true;
  delete window.posthog;
  events.trackFormSent({ form_variant: 'implant' });
  assert.equal(window.dataLayer.length, 1);
  assert.equal(captures.length, 0);
});

function runLoader() {
  const inserted = [];
  define('document', {
    createElement: () => ({}),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (el) => inserted.push(el) } }],
  });
  new Function(gtmLoaderSnippet('GTM-TEST123'))();
  return inserted.length;
}
test('internal flag stops the GTM loader, so GA4 page views stop too', () => {
  assert.equal(runLoader(), 1);
  location.search = '?mms_internal=1';
  assert.equal(runLoader(), 0);
  location.search = '';
  assert.equal(runLoader(), 0);
  location.search = '?mms_internal=0';
  assert.equal(runLoader(), 1);
});

// Double-click case: a second submit while the first is in flight is cancelled
// by the submitting ref, so the server action (and its outcome) runs once.
// The browser run of this case is acceptance 6 on prod.
test('double submit is blocked before the action runs', () => {
  // In the site repo this test also asserts LeadForm.tsx calls guardLeadSubmit; the form is not part of this example.
  const submitting = { current: false };
  let prevented = 0;
  let first = 0;
  const event = { preventDefault: () => prevented++ };
  const onFirst = () => first++;
  guardLeadSubmit(submitting, event, onFirst);
  assert.equal(prevented, 0);
  assert.equal(first, 1);
  guardLeadSubmit(submitting, event, onFirst);
  assert.equal(prevented, 1);
  assert.equal(first, 1);
  submitting.current = false;
  guardLeadSubmit(submitting, event, onFirst);
  assert.equal(prevented, 1);
  assert.equal(first, 2);
});

// The real outcome reporter LeadForm calls from its [state, variant] effect.
test('4-case lead test: failure 0, success 1, same outcome again 0 more, distinct success 1 more', () => {
  const report = (state) => reportLeadOutcome(state, 'implant', false);
  report({ status: 'idle' });
  report({ status: 'invalid', values: {}, fieldErrors: { email: 'Invalid' } });
  report({ status: 'undelivered', values: {}, submissionId: 'x', reason: 'offline' });
  counts(0);
  const success = { status: 'sent' };
  report(success);
  counts(1);
  report(success);
  report(success);
  counts(1);
  report({ status: 'sent' });
  counts(2);
  report({ status: 'idle' });
  counts(2);
});
process.exitCode = failures ? 1 : 0;
