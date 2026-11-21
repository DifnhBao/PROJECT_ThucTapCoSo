import test from 'node:test';
import assert from 'node:assert/strict';
import { ActivityDelivery } from '../../app/features/player/activityDelivery.ts';
import { subscribeRecentActivity } from '../../app/features/player/recentActivity.ts';
import { beginAuthChange, getAuth } from '../../app/lib/auth-state.ts';
const event = { session_id: 'receipt-event' };
const receipt = () => new Response(JSON.stringify({ data: { event_id: event.session_id, activity_id: '1' } }), { status: 201 });
test('recent activity refresh emits once after retry/ACK and never for failed or stale-account receipts', async () => {
  const epochs = []; const unsubscribe = subscribeRecentActivity((epoch) => epochs.push(epoch));
  try {
    let calls = 0;
    const delivery = new ActivityDelivery(async () => { if (++calls === 1) throw new Error('offline'); return receipt(); }, async () => {});
    assert.equal(await delivery.send(event), true);
    assert.deepEqual(epochs, [getAuth('user').epoch]);
    await new ActivityDelivery(async () => new Response('{}', { status: 400 })).send(event);
    assert.equal(epochs.length, 1);
    let release;
    const pending = new ActivityDelivery(() => new Promise((resolve) => { release = resolve; })).send(event);
    beginAuthChange('user'); release(receipt()); await pending;
    assert.equal(epochs.length, 1);
  } finally { unsubscribe(); }
});
