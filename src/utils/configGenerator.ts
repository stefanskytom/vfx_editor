import type { EmissionMaskData } from '../types/emissionMask';
import { maskToSpawnChains } from './emissionMask';
import type { ParticleSpriteType } from './spriteGenerator';
import type { EasingType } from './easing';
import { getEasingFunction } from './easing';
import type { ColorCurveKeyframe, CurveKeyframe } from '../types/curves';
import {
  createDefaultAlphaCurve,
  createDefaultColorCurve,
  createDefaultScaleCurve,
  sanitizeColorCurve,
  sanitizeNumericCurve
} from '../types/curves';

export type TextureSource = 'procedural' | 'symbol' | 'library' | 'custom';
export type PreviewBackground = 'dark' | 'light' | 'transparent' | 'reel' | 'custom';

export interface EmitterParams {
  preset: 'sparkle' | 'explosion' | 'fire' | 'orbit' | 'rain';
  spawnSpeed: number;
  lifetimeMin: number;
  lifetimeMax: number;
  startColor: string;
  endColor: string;
  colorMode: 'solid' | 'gradient';
  blendMode: 'normal' | 'add' | 'multiply' | 'screen';
  speedMin: number;
  speedMax: number;
  accelX: number;
  accelY: number;
  scaleStart: number;
  scaleEnd: number;
  alphaStart: number;
  alphaEnd: number;
  maxParticles: number;
  textureName: string;
  particleSpriteType: ParticleSpriteType;
  loopPreview: boolean;
  burstDuration: number;
  globalEase: EasingType;
  alphaEase: EasingType;
  scaleEase: EasingType;
  colorEase: EasingType;
  alphaCurve: CurveKeyframe[];
  scaleCurve: CurveKeyframe[];
  colorCurve: ColorCurveKeyframe[];
}

type PresetDefaults = Omit<
  EmitterParams,
  'preset' | 'textureName' | 'particleSpriteType' | 'alphaCurve' | 'scaleCurve' | 'colorCurve'
>;

const SHARED_ANIM_DEFAULTS: Pick<
  EmitterParams,
  'loopPreview' | 'burstDuration' | 'globalEase' | 'alphaEase' | 'scaleEase' | 'colorEase'
> = {
  loopPreview: true,
  burstDuration: 1.0,
  globalEase: 'linear',
  alphaEase: 'easeOut',
  scaleEase: 'easeInOut',
  colorEase: 'linear'
};

export const PRESET_DEFAULTS: Record<EmitterParams['preset'], PresetDefaults> = {
  sparkle: {
    ...SHARED_ANIM_DEFAULTS,
    spawnSpeed: 0.05,
    lifetimeMin: 0.4,
    lifetimeMax: 0.8,
    startColor: '#ffffff',
    endColor: '#ffd700',
    colorMode: 'solid',
    blendMode: 'add',
    speedMin: 50,
    speedMax: 150,
    accelX: 0,
    accelY: 50,
    scaleStart: 0.3,
    scaleEnd: 0.05,
    alphaStart: 1,
    alphaEnd: 0,
    maxParticles: 100
  },
  explosion: {
    ...SHARED_ANIM_DEFAULTS,
    spawnSpeed: 0.002,
    lifetimeMin: 0.5,
    lifetimeMax: 1.0,
    startColor: '#ffcc00',
    endColor: '#ff3300',
    colorMode: 'solid',
    blendMode: 'add',
    speedMin: 200,
    speedMax: 400,
    accelX: 0,
    accelY: 150,
    scaleStart: 0.4,
    scaleEnd: 0.1,
    alphaStart: 1,
    alphaEnd: 0,
    maxParticles: 200
  },
  fire: {
    ...SHARED_ANIM_DEFAULTS,
    spawnSpeed: 0.02,
    lifetimeMin: 0.6,
    lifetimeMax: 1.2,
    startColor: '#ff4500',
    endColor: '#ffcc00',
    colorMode: 'solid',
    blendMode: 'add',
    speedMin: 80,
    speedMax: 180,
    accelX: 0,
    accelY: -150,
    scaleStart: 0.5,
    scaleEnd: 0.1,
    alphaStart: 0.8,
    alphaEnd: 0,
    maxParticles: 150
  },
  orbit: {
    ...SHARED_ANIM_DEFAULTS,
    spawnSpeed: 0.01,
    lifetimeMin: 1.0,
    lifetimeMax: 1.5,
    startColor: '#a855f7',
    endColor: '#3b82f6',
    colorMode: 'solid',
    blendMode: 'screen',
    speedMin: 100,
    speedMax: 150,
    accelX: 0,
    accelY: 0,
    scaleStart: 0.3,
    scaleEnd: 0.1,
    alphaStart: 0.9,
    alphaEnd: 0,
    maxParticles: 100
  },
  rain: {
    ...SHARED_ANIM_DEFAULTS,
    spawnSpeed: 0.03,
    lifetimeMin: 1.0,
    lifetimeMax: 2.0,
    startColor: '#38bdf8',
    endColor: '#0369a1',
    colorMode: 'solid',
    blendMode: 'normal',
    speedMin: 150,
    speedMax: 250,
    accelX: 20,
    accelY: 300,
    scaleStart: 0.25,
    scaleEnd: 0.25,
    alphaStart: 0.8,
    alphaEnd: 0.2,
    maxParticles: 200
  }
};

const PRESET_SPRITE_HINTS: Record<EmitterParams['preset'], ParticleSpriteType> = {
  fire: 'flame',
  rain: 'droplet',
  orbit: 'magic_dust',
  sparkle: 'spark',
  explosion: 'ember'
};

export function getSpriteTypeForPreset(preset: EmitterParams['preset']): ParticleSpriteType {
  return PRESET_SPRITE_HINTS[preset];
}

function buildCurvesFromParams(defaults: PresetDefaults) {
  return {
    alphaCurve: createDefaultAlphaCurve(defaults.alphaStart, defaults.alphaEnd),
    scaleCurve: createDefaultScaleCurve(defaults.scaleStart, defaults.scaleEnd),
    colorCurve: createDefaultColorCurve(defaults.startColor, defaults.endColor)
  };
}

export function getRecommendedParams(
  type: 'gold' | 'fire' | 'magic' | 'standard',
  dominantHex: string,
  secondaryHex: string,
  textureName = 'particle',
  particleSpriteType: ParticleSpriteType = 'glow'
): EmitterParams {
  let preset: EmitterParams['preset'] = 'sparkle';
  if (type === 'fire') preset = 'fire';
  else if (type === 'magic') preset = 'orbit';
  else if (type === 'standard') preset = 'explosion';

  const defaults = PRESET_DEFAULTS[preset];

  return {
    preset,
    textureName,
    particleSpriteType,
    ...defaults,
    loopPreview: true,
    startColor: dominantHex,
    endColor: secondaryHex,
    ...buildCurvesFromParams({
      ...defaults,
      startColor: dominantHex,
      endColor: secondaryHex
    })
  };
}

function cleanHex(hex: string) {
  return hex.replace('#', '').toLowerCase();
}

function buildValueList<T extends number | string>(
  keyframes: { time: number; value: T }[],
  ease: EasingType
) {
  return {
    list: keyframes.map((kf) => ({ time: kf.time, value: kf.value })),
    ease: ease ?? 'linear'
  };
}

function resolveCurves(params: EmitterParams) {
  const alphaCurve = sanitizeNumericCurve(params.alphaCurve, params.alphaStart, params.alphaEnd);
  const scaleCurve = sanitizeNumericCurve(params.scaleCurve, params.scaleStart, params.scaleEnd);
  const colorCurve = sanitizeColorCurve(params.colorCurve, params.startColor, params.endColor);
  return { alphaCurve, scaleCurve, colorCurve };
}

/**
 * Generates serializable emitter config (ease stored as string keys for export).
 */
export function generateEmitterConfig(
  params: EmitterParams,
  emissionMask?: EmissionMaskData | null
) {
  const { alphaCurve, scaleCurve, colorCurve } = resolveCurves(params);

  const behaviors: any[] = [
    {
      type: 'alpha',
      config: {
        alpha: buildValueList(alphaCurve, params.alphaEase ?? 'linear')
      }
    },
    {
      type: 'scale',
      config: {
        scale: buildValueList(scaleCurve, params.scaleEase ?? 'easeInOut'),
        minMult: 0.5
      }
    },
    {
      type: 'color',
      config: {
        color: {
          list: colorCurve.map((kf) => ({
            time: kf.time,
            value: cleanHex(kf.value)
          })),
          ease: params.colorEase ?? 'linear'
        }
      }
    },
    {
      type: 'blendMode',
      config: {
        blendMode: params.blendMode
      }
    },
    {
      type: 'textureSingle',
      config: {
        texture: params.textureName
      }
    }
  ];

  const useMask =
    emissionMask &&
    emissionMask.mode !== 'point' &&
    emissionMask.polygon.length > 0;

  if (useMask) {
    const chains = maskToSpawnChains(emissionMask.polygon);
    behaviors.push(
      {
        type: 'spawnShape',
        config: {
          type: 'polygonalChain',
          data: chains.length === 1 ? chains[0] : chains
        }
      },
      {
        type: 'moveAcceleration',
        config: {
          accel: { x: params.accelX, y: params.accelY },
          minStart: params.speedMin,
          maxStart: params.speedMax,
          maxSpeed: 600,
          rotate: params.preset === 'fire' || params.preset === 'sparkle'
        }
      },
      {
        type: 'rotation',
        config: {
          minSpeed: params.preset === 'sparkle' ? 20 : 0,
          maxSpeed: params.preset === 'sparkle' ? 100 : 50,
          minStart: 0,
          maxStart: 360
        }
      }
    );
  } else if (params.preset === 'orbit') {
    behaviors.push(
      {
        type: 'spawnShape',
        config: {
          type: 'torus',
          data: {
            x: 0,
            y: 0,
            radius: 80,
            innerRadius: 75,
            affectRotation: true
          }
        }
      },
      {
        type: 'moveSpeed',
        config: {
          speed: {
            list: [
              { value: params.speedMin, time: 0 },
              { value: params.speedMax, time: 1 }
            ]
          },
          minMult: 0.8
        }
      },
      {
        type: 'rotation',
        config: {
          minSpeed: 45,
          maxSpeed: 90,
          minStart: 0,
          maxStart: 360
        }
      }
    );
  } else if (params.preset === 'rain') {
    behaviors.push(
      {
        type: 'spawnShape',
        config: {
          type: 'rect',
          data: {
            x: -150,
            y: -250,
            w: 300,
            h: 10
          }
        }
      },
      {
        type: 'moveAcceleration',
        config: {
          accel: { x: params.accelX, y: params.accelY },
          minStart: params.speedMin,
          maxStart: params.speedMax,
          maxSpeed: 800,
          rotate: true
        }
      }
    );
  } else {
    const spawnRadius = params.preset === 'fire' ? 30 : 10;
    behaviors.push(
      {
        type: 'spawnShape',
        config: {
          type: 'torus',
          data: {
            x: 0,
            y: 0,
            radius: spawnRadius,
            innerRadius: 0,
            affectRotation: true
          }
        }
      },
      {
        type: 'moveAcceleration',
        config: {
          accel: { x: params.accelX, y: params.accelY },
          minStart: params.speedMin,
          maxStart: params.speedMax,
          maxSpeed: 600,
          rotate: params.preset === 'fire'
        }
      },
      {
        type: 'rotation',
        config: {
          minSpeed: params.preset === 'sparkle' ? 20 : 0,
          maxSpeed: params.preset === 'sparkle' ? 100 : 50,
          minStart: 0,
          maxStart: 360
        }
      }
    );
  }

  const emitterLifetime = params.loopPreview ? -1 : params.burstDuration;

  return {
    lifetime: {
      min: params.lifetimeMin,
      max: params.lifetimeMax
    },
    frequency: params.spawnSpeed,
    emitterLifetime,
    maxParticles: params.maxParticles,
    addAtBack: false,
    ease: params.globalEase ?? 'linear',
    pos: { x: 0, y: 0 },
    behaviors
  };
}

const EASE_BEHAVIOR_KEYS = new Set(['alpha', 'scale', 'color']);

function resolveEaseInValueList(valueList: any) {
  if (!valueList?.ease || typeof valueList.ease === 'function') return valueList;
  return {
    ...valueList,
    ease: getEasingFunction(valueList.ease)
  };
}

/**
 * Converts exported ease string keys into runtime easing functions for Pixi emitter.
 */
export function finalizeEmitterConfig(config: any): any {
  const resolved = {
    ...config,
    ease:
      typeof config.ease === 'function'
        ? config.ease
        : getEasingFunction(config.ease ?? 'linear'),
    behaviors: config.behaviors.map((behavior: any) => {
      if (!EASE_BEHAVIOR_KEYS.has(behavior.type)) return behavior;

      const key = behavior.type;
      const valueList = behavior.config?.[key];
      if (!valueList) return behavior;

      return {
        ...behavior,
        config: {
          ...behavior.config,
          [key]: resolveEaseInValueList(valueList)
        }
      };
    })
  };

  return resolved;
}

export function buildPresetParams(
  current: EmitterParams,
  preset: EmitterParams['preset']
): EmitterParams {
  const defaults = PRESET_DEFAULTS[preset];
  return {
    ...current,
    preset,
    ...defaults,
    particleSpriteType: getSpriteTypeForPreset(preset),
    ...buildCurvesFromParams(defaults)
  };
}
