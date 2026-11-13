import test from 'node:test';
import assert from 'node:assert/strict';
import { ListeningSession } from '../../app/features/player/listeningSession.ts';
import { ActivityDelivery } from '../../app/features/player/activityDelivery.ts';
const setup = () => {
  let now = 0, id = 0; const events = [];
  const session = new ListeningSession((event) => events.push(event), () => now, () => `uuid-${++id}`);
  return { session, events, advance: (seconds) => { now += seconds * 1000; } };
};
test('source is snapshotted before switching tracks; paused/buffering time cannot accrue', () => {
  const { session: s, events, advance } = setup();
  s.start(1, 100, 'search'); s.play(0); advance(5); s.tick(5); s.suspend(5, true);
  advance(20); s.tick(5); s.play(5); advance(3); s.tick(8); s.suspend(8);
  advance(40); s.play(8); advance(2); s.tick(10); s.start(2, 100, 'recommendation');
  assert.equal(events.length, 1); assert.equal(events[0].source, 'search'); assert.equal(events[0].song_id, 1); assert.equal(events[0].total_listened_time, 10);
  s.play(0); advance(2); s.tick(2); s.finish('ended', 2);
  assert.equal(events[1].source, 'recommendation'); assert.equal(events[1].song_id, 2); assert.ok(Object.isFrozen(events[0]));
});
test('pause/resume uses one UUID, finalized repeat creates another; double flush is inert', () => {
  const { session: s, events, advance } = setup();
  s.start(1, 60, 'radio'); s.play(0); advance(5); s.suspend(5, true); s.play(5); advance(5); s.finish('ended', 10); s.finish('tab_closed');
  s.play(0); advance(1); s.finish('ended', 1);
  assert.deepEqual(events.map((e) => e.session_id), ['uuid-1', 'uuid-2']); assert.equal(events[0].total_listened_time, 10);
});
test('seeking forward/backward and stale position jumps do not grant listened time', () => {
  const { session: s, events, advance } = setup();
  s.start(1, 180, 'playlist'); s.play(0); advance(1); s.tick(1);
  s.seekingStart(); advance(10); s.tick(179); s.seeked(179); advance(.1); s.finish('ended', 180);
  assert.equal(events[0].total_listened_time, 1.1); assert.equal(events[0].seek_count, 1);
  s.start(1, 180, 'playlist'); s.play(0); advance(.2); s.tick(170); s.suspend(170); advance(10); s.seeked(0); s.finish('skipped');
  assert.equal(events[1].total_listened_time, .2);
});
test('metadata duration replaces unknown; never-played track emits nothing; stopped track cannot resume', () => {
  const { session: s, events, advance } = setup();
  s.start(1, 0, 'playlist'); advance(30); s.finish('ended'); assert.equal(events.length, 0);
  s.start(2, 0, 'search'); s.duration(40); s.play(0); advance(2); s.tick(2); s.stop(); s.play(2); s.finish('ended');
  assert.equal(events.length, 1); assert.equal(events[0].song_duration, 40); assert.equal(events[0].total_listened_time, 2);
});
const event = { event_version: 1, session_id: 'synthetic-uuid', song_id: 1, source: 'search', exit_reason: 'ended', song_duration: 60, total_listened_time: 25, max_position_reached: 25, play_pause_count: 1, seek_count: 0 };
const ack = (status = 201) => new Response(JSON.stringify({ data: { event_id: event.session_id, activity_id: '42' } }), { status });
test('delivery retries exact immutable UUID/body after lost response; ACK recognized only by receipt', async () => {
  const calls = [], waits = [];
  const d = new ActivityDelivery(async (url, options) => { calls.push([url, options]); if (calls.length === 1) throw new Error('lost ack'); if (calls.length === 2) return new Response('{}', { status: 500 }); return ack(200); }, async (ms) => { waits.push(ms); });
  assert.equal(await d.send(event), true); assert.equal(calls.length, 3); assert.deepEqual(waits, [250, 750]);
  assert.ok(calls.every(([url, o]) => url === '/api/activity' && o.credentials === 'include' && o.body === calls[0][1].body));
});
test('permanent auth/schema/conflict/quota errors do not retry; offline stops after3 attempts', async () => {
  for (const status of [400, 401, 409, 429]) {
    let calls = 0; const d = new ActivityDelivery(async () => { calls++; return new Response('{}', { status }); }, async () => {});
    assert.equal(await d.send(event), false); assert.equal(calls, 1);
  }
  let calls = 0; const d = new ActivityDelivery(async () => { calls++; throw new Error('offline'); }, async () => {});
  assert.equal(await d.send(event), false); assert.equal(calls, 3);
  assert.equal(await new ActivityDelivery(async () => new Response(JSON.stringify({ data: { status: 'queued' } }))).send(event), false);
});
test('pagehide beacon false falls back to identical keepalive; queued beacon is not ACK', async () => {
  const calls = []; let release;
  const d = new ActivityDelivery((url, options) => { calls.push(options); if (options.keepalive) return Promise.resolve(ack()); return new Promise((resolve) => { release = resolve; }); });
  const sent = d.send(event); const beacons = [];
  d.pagehide((url, data) => { beacons.push([url, data]); return false; });
  d.pagehide(() => { throw new Error('must not enqueue the same beacon twice'); });
  assert.equal(beacons.length, 1); assert.equal(calls.length, 2); assert.equal(calls[1].keepalive, true); assert.equal(calls[0].body, calls[1].body); assert.equal(await beacons[0][1].text(), calls[0].body);
  release(ack()); assert.equal(await sent, true);
});
test('pending RAM is bounded at20; beacon admission does not settle delivery promises', async () => {
  const releases = []; let settled = false, beacons = 0;
  const d = new ActivityDelivery((url, options) => new Promise((resolve) => {
    const body = JSON.parse(options.body);
    releases.push(() => resolve(new Response(JSON.stringify({ data: { event_id: body.session_id, activity_id: '42' } }), { status: 201 })));
  }));
  const sending = Array.from({ length: 20 }, (_, id) => d.send({ ...event, session_id: `id-${id}` }));
  sending[0].then(() => { settled = true; });
  assert.equal(await d.send({ ...event, session_id: 'over-cap' }), false);
  d.pagehide(() => { beacons++; return true; }); await Promise.resolve();
  assert.equal(beacons, 20); assert.equal(releases.length, 20); assert.equal(settled, false);
  releases.forEach((release) => release()); assert.ok((await Promise.all(sending)).every(Boolean));
});
