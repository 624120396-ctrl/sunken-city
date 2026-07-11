import test from 'node:test';
import assert from 'node:assert/strict';
import { fromZonedDateTimeInput, toZonedDateTimeInput } from '../src/pages/rooms/components/room-schedule-time.ts';

test('schedule wall time converts with the selected IANA timezone rather than device timezone', () => {
  assert.equal(fromZonedDateTimeInput('2026-07-18T20:00', 'America/New_York'), '2026-07-19T00:00:00.000Z');
  assert.equal(fromZonedDateTimeInput('2026-07-18T20:00', 'Asia/Shanghai'), '2026-07-18T12:00:00.000Z');
  assert.equal(toZonedDateTimeInput('2026-07-19T00:00:00.000Z', 'America/New_York'), '2026-07-18T20:00');
});

test('schedule wall time rejects nonexistent and ambiguous DST values', () => {
  assert.throws(() => fromZonedDateTimeInput('2026-03-08T02:30', 'America/New_York'), /不存在/);
  assert.throws(() => fromZonedDateTimeInput('2026-11-01T01:30', 'America/New_York'), /重复/);
});
