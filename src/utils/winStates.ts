import type { AnalysisResult } from './imageAnalyser';
import type { EmitterParams } from './configGenerator';
import { PRESET_DEFAULTS, getSpriteTypeForPreset } from './configGenerator';
import {
  createDefaultAlphaCurve,
  createDefaultColorCurve,
  createDefaultScaleCurve
} from '../types/curves';

export type WinStateId = 'idle' | 'winSmall' | 'winBig' | 'jackpot' | 'nearMiss';

export const WIN_STATE_LABELS: Record<WinStateId, string> = {
  idle: 'Idle Loop',
  winSmall: 'Win Small',
  winBig: 'Win Big',
  jackpot: 'Jackpot',
  nearMiss: 'Near Miss'
};

export type WinStatePack = Record<WinStateId, EmitterParams>;

function withCurves(partial: Partial<EmitterParams> & Pick<EmitterParams, 'preset'>): EmitterParams {
  const defaults = PRESET_DEFAULTS[partial.preset];
  const merged = { ...defaults, ...partial } as EmitterParams;
  return {
    ...merged,
    particleSpriteType: partial.particleSpriteType ?? getSpriteTypeForPreset(partial.preset),
    alphaCurve: createDefaultAlphaCurve(merged.alphaStart, merged.alphaEnd),
    scaleCurve: createDefaultScaleCurve(merged.scaleStart, merged.scaleEnd),
    colorCurve: createDefaultColorCurve(merged.startColor, merged.endColor)
  };
}

/**
 * Generates a full win-state parameter pack from base analysis.
 */
export function generateWinStatePack(
  base: EmitterParams,
  analysis: AnalysisResult
): WinStatePack {
  const { dominantColor, secondaryColor, accentColor, particleSpriteType } = analysis;

  return {
    idle: withCurves({
      ...base,
      preset: 'sparkle',
      textureName: base.textureName,
      particleSpriteType,
      loopPreview: true,
      spawnSpeed: 0.08,
      maxParticles: 60,
      speedMin: 30,
      speedMax: 90,
      scaleStart: 0.2,
      scaleEnd: 0.04,
      alphaStart: 0.7,
      alphaEnd: 0,
      startColor: dominantColor,
      endColor: secondaryColor
    }),
    winSmall: withCurves({
      ...base,
      preset: 'sparkle',
      textureName: base.textureName,
      particleSpriteType,
      loopPreview: true,
      spawnSpeed: 0.035,
      maxParticles: 120,
      speedMin: 60,
      speedMax: 160,
      scaleStart: 0.35,
      scaleEnd: 0.06,
      alphaStart: 1,
      alphaEnd: 0,
      accelY: 40,
      startColor: dominantColor,
      endColor: accentColor
    }),
    winBig: withCurves({
      ...base,
      preset: 'explosion',
      textureName: base.textureName,
      particleSpriteType: analysis.vfxTheme === 'fire' ? 'flame' : particleSpriteType,
      loopPreview: false,
      burstDuration: 1.2,
      spawnSpeed: 0.004,
      maxParticles: 200,
      speedMin: 180,
      speedMax: 350,
      scaleStart: 0.5,
      scaleEnd: 0.08,
      alphaStart: 1,
      alphaEnd: 0,
      accelY: 120,
      startColor: dominantColor,
      endColor: secondaryColor
    }),
    jackpot: withCurves({
      ...base,
      preset: 'fire',
      textureName: base.textureName,
      particleSpriteType: 'gold_sparkle',
      loopPreview: true,
      spawnSpeed: 0.012,
      maxParticles: 300,
      speedMin: 100,
      speedMax: 220,
      scaleStart: 0.55,
      scaleEnd: 0.1,
      alphaStart: 1,
      alphaEnd: 0,
      accelY: -120,
      blendMode: 'add',
      startColor: accentColor,
      endColor: dominantColor
    }),
    nearMiss: withCurves({
      ...base,
      preset: 'orbit',
      textureName: base.textureName,
      particleSpriteType: 'magic_dust',
      loopPreview: true,
      spawnSpeed: 0.025,
      maxParticles: 80,
      speedMin: 70,
      speedMax: 110,
      scaleStart: 0.25,
      scaleEnd: 0.08,
      alphaStart: 0.85,
      alphaEnd: 0,
      blendMode: 'screen',
      startColor: secondaryColor,
      endColor: dominantColor
    })
  };
}

export function exportWinStatePackage(
  pack: WinStatePack,
  particleName: string,
  generateConfig: (params: EmitterParams) => object
) {
  const states: Record<string, object> = {};
  for (const id of Object.keys(WIN_STATE_LABELS) as WinStateId[]) {
    states[id] = {
      label: WIN_STATE_LABELS[id],
      params: pack[id],
      emitterConfig: generateConfig({ ...pack[id], textureName: particleName })
    };
  }
  return {
    symbol: particleName,
    version: '1.0',
    states
  };
}
