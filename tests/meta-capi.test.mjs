/**
 * Meta Conversions API lead event: one event_id per lead, hashed email only,
 * and nothing sent for a waiting list or a quarantined lead.
 */
import assert from 'node:assert/strict';
import {
  hashEmail, metaCapiConfig, metaCountsLead, metaLeadEvent, sendMetaEvent,
} from '../src/meta-capi/meta-capi.ts';

assert.equal(metaCapiConfig({}), null, 'off unless configured');
const config = metaCapiConfig({ META_PIXEL_ID: '1234567890', META_CAPI_TOKEN: 'test-token-not-real' });
assert.ok(config);

const event = metaLeadEvent({
  variant: 'audit',
  submissionId: 'sub_0001',
  email: '  Jane.Doe@Example.com ',
  attribution: { landing_page: '/audit', referrer: '', captured_at: '2026-11-12T15:00:00.000Z', fbclid: 'abc123' },
  eventTime: 1794500000,
  eventSourceUrl: 'https://example.com/audit',
});
assert.equal(event.event_id, 'sub_0001', 'event_id is the submission ID, so retries dedupe');
assert.deepEqual(event.user_data.em, [hashEmail('jane.doe@example.com')], 'email normalized then SHA-256');
assert.ok(!JSON.stringify(event).includes('Jane'), 'no raw email in the payload');
assert.equal(event.user_data.fbc, `fb.1.${Date.parse('2026-11-12T15:00:00.000Z')}.abc123`, 'fbc uses the click time');

assert.equal(metaCountsLead('early-access', null), false, 'waiting list never reaches Meta');
assert.equal(metaCountsLead('audit', { quarantine: true }), false, 'spam never trains bidding');
assert.equal(metaCountsLead('audit', null), true);

let calls = 0;
await sendMetaEvent(config, event, async (url, init) => {
  calls++;
  assert.match(String(url), /graph\.facebook\.com\/v\d+\.\d+\/1234567890\/events$/);
  assert.equal(JSON.parse(init.body).data[0].event_id, 'sub_0001');
  return new Response('{}', { status: 200 });
});
assert.equal(calls, 1);
await assert.rejects(sendMetaEvent(config, event, async () => new Response('x', { status: 500 })), /responded 500/);
console.log('meta-capi: pass');
