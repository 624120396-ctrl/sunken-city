import assert from 'node:assert/strict';
import test from 'node:test';
import { getFishingRenderProfile } from '../src/components/fishing/fishingRenderProfile.ts';

test('desktop profile keeps full harbor effects', () => {
  assert.deepEqual(getFishingRenderProfile({ isMobile: false, prefersReducedMotion: false, lowPower: false }), {
    dprMax: 1.75,
    particleCount: 28,
    animateParticles: true,
  });
});

test('mobile profile lowers WebGL cost while keeping the scene alive', () => {
  assert.deepEqual(getFishingRenderProfile({ isMobile: true, prefersReducedMotion: false, lowPower: false }), {
    dprMax: 1.25,
    particleCount: 16,
    animateParticles: true,
  });
});

test('reduced motion profile disables nonessential particle drift', () => {
  assert.deepEqual(getFishingRenderProfile({ isMobile: false, prefersReducedMotion: true, lowPower: false }), {
    dprMax: 1,
    particleCount: 8,
    animateParticles: false,
  });
});
