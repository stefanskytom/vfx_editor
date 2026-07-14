import type { EmitterParams } from './configGenerator';

export interface TimelineKeyframe {
  id: string;
  time: number;
  spawnSpeedMult: number;
  maxParticlesMult: number;
  scaleStartMult: number;
  intensity: number;
}

export interface SceneTimeline {
  duration: number;
  bpm: number;
  snapToBeat: boolean;
  loop: boolean;
  keyframes: TimelineKeyframe[];
}

export interface TimelineModifiers {
  spawnSpeedMult: number;
  maxParticlesMult: number;
  scaleStartMult: number;
  intensity: number;
}

let keyframeIdCounter = 0;

export function createKeyframe(
  partial: Partial<TimelineKeyframe> & Pick<TimelineKeyframe, 'time'>
): TimelineKeyframe {
  keyframeIdCounter += 1;
  return {
    id: partial.id ?? `kf-${keyframeIdCounter}`,
    time: partial.time,
    spawnSpeedMult: partial.spawnSpeedMult ?? 1,
    maxParticlesMult: partial.maxParticlesMult ?? 1,
    scaleStartMult: partial.scaleStartMult ?? 1,
    intensity: partial.intensity ?? 0.8
  };
}

export function sortTimelineKeyframes(keyframes: TimelineKeyframe[]) {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

export function createDefaultTimeline(): SceneTimeline {
  return {
    duration: 2.0,
    bpm: 120,
    snapToBeat: true,
    loop: true,
    keyframes: [
      createKeyframe({ id: 'kf-idle-start', time: 0, spawnSpeedMult: 0.5, maxParticlesMult: 0.4, scaleStartMult: 0.8, intensity: 0.3 }),
      createKeyframe({ id: 'kf-burst', time: 0.35, spawnSpeedMult: 2.5, maxParticlesMult: 1.8, scaleStartMult: 1.4, intensity: 1.0 }),
      createKeyframe({ id: 'kf-settle', time: 0.7, spawnSpeedMult: 1.2, maxParticlesMult: 1.0, scaleStartMult: 1.0, intensity: 0.6 }),
      createKeyframe({ id: 'kf-idle-end', time: 1, spawnSpeedMult: 0.6, maxParticlesMult: 0.5, scaleStartMult: 0.9, intensity: 0.2 })
    ]
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sortKeyframes(keyframes: TimelineKeyframe[]) {
  return sortTimelineKeyframes(keyframes);
}

export function snapTimeToBeat(time: number, bpm: number, duration: number): number {
  const beatSec = 60 / bpm;
  const snapped = Math.round(time / beatSec) * beatSec;
  return Math.min(duration, Math.max(0, snapped));
}

export function getTimelineModifiers(timeline: SceneTimeline, elapsedSec: number): TimelineModifiers {
  const normalized = timeline.duration > 0 ? (elapsedSec % timeline.duration) / timeline.duration : 0;
  const sorted = sortKeyframes(timeline.keyframes);

  if (sorted.length === 0) {
    return { spawnSpeedMult: 1, maxParticlesMult: 1, scaleStartMult: 1, intensity: 1 };
  }

  if (normalized <= sorted[0].time) return pickMods(sorted[0]);
  if (normalized >= sorted[sorted.length - 1].time) return pickMods(sorted[sorted.length - 1]);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (normalized >= a.time && normalized <= b.time) {
      const range = b.time - a.time || 1;
      const t = (normalized - a.time) / range;
      return {
        spawnSpeedMult: lerp(a.spawnSpeedMult, b.spawnSpeedMult, t),
        maxParticlesMult: lerp(a.maxParticlesMult, b.maxParticlesMult, t),
        scaleStartMult: lerp(a.scaleStartMult, b.scaleStartMult, t),
        intensity: lerp(a.intensity, b.intensity, t)
      };
    }
  }

  return pickMods(sorted[sorted.length - 1]);
}

function pickMods(kf: TimelineKeyframe): TimelineModifiers {
  return {
    spawnSpeedMult: kf.spawnSpeedMult,
    maxParticlesMult: kf.maxParticlesMult,
    scaleStartMult: kf.scaleStartMult,
    intensity: kf.intensity
  };
}

/** Applies timeline modifiers to base emitter params for preview/export. */
export function applyTimelineToParams(
  base: EmitterParams,
  mods: TimelineModifiers
): EmitterParams {
  return {
    ...base,
    spawnSpeed: Math.max(0.001, base.spawnSpeed / Math.max(0.1, mods.spawnSpeedMult)),
    maxParticles: Math.round(base.maxParticles * mods.maxParticlesMult),
    scaleStart: base.scaleStart * mods.scaleStartMult,
    alphaStart: Math.min(1, base.alphaStart * mods.intensity)
  };
}

export function exportTimelinePatches(
  timeline: SceneTimeline,
  baseParams: EmitterParams,
  generateConfig: (params: EmitterParams) => object,
  particleName: string,
  steps = 20
) {
  const patches: { time: number; configPatch: object; modifiers: TimelineModifiers }[] = [];

  for (let i = 0; i <= steps; i++) {
    const elapsed = (i / steps) * timeline.duration;
    const mods = getTimelineModifiers(timeline, elapsed);
    const patched = applyTimelineToParams(baseParams, mods);
    patches.push({
      time: parseFloat(elapsed.toFixed(3)),
      modifiers: mods,
      configPatch: generateConfig({ ...patched, textureName: particleName })
    });
  }

  return {
    duration: timeline.duration,
    bpm: timeline.bpm,
    snapToBeat: timeline.snapToBeat,
    loop: timeline.loop,
    keyframes: timeline.keyframes,
    patches
  };
}
