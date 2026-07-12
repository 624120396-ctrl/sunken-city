import type { StageActorProjection, StageZone } from '../../../../shared/stage/stage-contract';

export type StageViewport = 'desktop' | 'mobile';
export type StageLayoutActor = StageActorProjection & { preferredZone: StageZone };
export type StageLayout = { foreground: StageLayoutActor[]; background: StageActorProjection[] };

const zones: Exclude<StageZone, 'backstage'>[] = ['far-left', 'left', 'center', 'right', 'far-right'];

function nearestFree(preferred: StageZone, occupied: Set<StageZone>) {
  const preferredIndex = Math.max(0, zones.indexOf(preferred as Exclude<StageZone, 'backstage'>));
  return zones.filter((zone) => !occupied.has(zone)).sort((left, right) =>
    Math.abs(zones.indexOf(left) - preferredIndex) - Math.abs(zones.indexOf(right) - preferredIndex),
  )[0];
}

export function resolveStageLayout(actors: StageActorProjection[], viewport: StageViewport): StageLayout {
  const cap = viewport === 'mobile' ? 3 : 6;
  const occupied = new Set<StageZone>();
  const foreground: StageLayoutActor[] = [];
  const background: StageActorProjection[] = [];
  for (const actor of actors.filter((entry) => entry.entered && entry.zone !== 'backstage')) {
    const freeZone = foreground.length < cap ? nearestFree(actor.zone, occupied) : undefined;
    if (foreground.length >= cap) {
      background.push(actor);
      continue;
    }
    const zone = freeZone ?? (actor.zone === 'backstage' ? 'center' : actor.zone);
    occupied.add(zone);
    foreground.push({ ...actor, zone, preferredZone: actor.zone });
  }
  return { foreground, background };
}
