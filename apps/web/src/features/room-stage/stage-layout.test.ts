import assert from 'node:assert/strict';
import test from 'node:test';
import type { StageActorProjection } from '../../../../shared/stage/stage-contract.ts';
import { resolveStageLayout } from './stage-layout.ts';

const actor = (actorId: string, zone: StageActorProjection['zone']): StageActorProjection => ({ actorId, actorKind: 'NPC', name: actorId, zone, entered: true, visibility: 'PUBLIC' });

test('caps the foreground and retains overflow actors', () => {
  const layout = resolveStageLayout([actor('a', 'left'), actor('b', 'left'), actor('c', 'center'), actor('d', 'right'), actor('e', 'far-left'), actor('f', 'far-right'), actor('g', 'center')], 'desktop');
  assert.equal(layout.foreground.length, 6);
  assert.deepEqual(layout.background.map((entry) => entry.actorId), ['g']);
});

test('limits mobile to three actors and assigns nearest free zones', () => {
  const layout = resolveStageLayout([actor('first', 'center'), actor('second', 'center'), actor('third', 'center'), actor('fourth', 'right')], 'mobile');
  assert.deepEqual(layout.foreground.map((entry) => [entry.actorId, entry.zone]), [['first', 'center'], ['second', 'left'], ['third', 'right']]);
  assert.deepEqual(layout.background.map((entry) => entry.actorId), ['fourth']);
});
