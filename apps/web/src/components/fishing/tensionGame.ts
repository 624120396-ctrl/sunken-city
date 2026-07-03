export type TensionZone = 'slack' | 'safe' | 'snap';

export interface TensionSnapshotInput {
  previous: number;
  elapsedMs: number;
  isReeling: boolean;
  phaseMs: number;
}

export interface TensionSnapshot {
  value: number;
  zone: TensionZone;
  safeStart: number;
  safeEnd: number;
}

const SAFE_START = 38;
const SAFE_END = 72;
const SLACK_LIMIT = 25;
const SNAP_LIMIT = 88;
const RISE_PER_SECOND = 40;
const FALL_PER_SECOND = 30;
const MIN_SAFE_MS = 1800;
const MIN_REEL_MS = 2500;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getZone(value: number): TensionZone {
  if (value <= SLACK_LIMIT) return 'slack';
  if (value >= SNAP_LIMIT) return 'snap';
  return 'safe';
}

export function createTensionSnapshot({ previous, elapsedMs, isReeling }: TensionSnapshotInput): TensionSnapshot {
  const delta = (elapsedMs / 1000) * (isReeling ? RISE_PER_SECOND : -FALL_PER_SECOND);
  const value = Math.round(clamp(previous + delta, 0, 100));

  return {
    value,
    zone: getZone(value),
    safeStart: SAFE_START,
    safeEnd: SAFE_END,
  };
}

export function isTensionCatchReady({ safeMs, elapsedMs }: { safeMs: number; elapsedMs: number }) {
  return safeMs >= MIN_SAFE_MS && elapsedMs >= MIN_REEL_MS;
}
