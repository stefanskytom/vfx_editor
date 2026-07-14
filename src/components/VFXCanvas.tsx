import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Emitter } from '@pixi/particle-emitter';
import { generateParticleTexture } from '../utils/spriteGenerator';
import type { ParticleSpriteType } from '../utils/spriteGenerator';
import { finalizeEmitterConfig } from '../utils/configGenerator';
import type { TextureSource } from '../utils/configGenerator';
import type { EmissionMaskData } from '../types/emissionMask';
import type { SceneTimeline } from '../utils/timeline';
import { getTimelineModifiers } from '../utils/timeline';
import { BackgroundTransformBox } from './BackgroundTransformBox';
import type { BackgroundTransform } from '../types/backgroundTransform';
import type { PreviewBackground } from '../utils/configGenerator';
import { PerfMonitor } from '../utils/perfMonitor';
import type { PerfSnapshot } from '../utils/perfMonitor';

interface VFXCanvasProps {
  emitterConfig: any;
  particleImageUrl: string | null;
  textureSource: TextureSource;
  customParticleSpriteUrl: string | null;
  libraryParticleTextureUrl: string | null;
  particleSpriteType: ParticleSpriteType;
  blendMode: 'normal' | 'add' | 'multiply' | 'screen';
  loopPreview: boolean;
  bgColor: PreviewBackground;
  customBackgroundUrl: string | null;
  backgroundTransform: BackgroundTransform | null;
  onBackgroundTransformChange: (transform: BackgroundTransform) => void;
  showSymbol: boolean;
  emissionMask: EmissionMaskData | null;
  showMaskOverlay: boolean;
  timeline: SceneTimeline | null;
  timelinePlaying: boolean;
  sceneTime: number;
  baseSpawnSpeed: number;
  baseMaxParticles: number;
  onSceneTimeChange: (time: number) => void;
}

const REBUILD_DEBOUNCE_MS = 120;
const CANVAS_W = 600;
const CANVAS_H = 500;
const SYMBOL_SIZE = 120;

function resolvePixiBlendMode(mode: string | undefined): PIXI.BLEND_MODES {
  if (!mode) return PIXI.BLEND_MODES.NORMAL;
  const key = mode.toUpperCase().replace(/ /g, '_') as keyof typeof PIXI.BLEND_MODES;
  return PIXI.BLEND_MODES[key] ?? PIXI.BLEND_MODES.NORMAL;
}

function destroyEmitterSafe(emitter: Emitter | null) {
  if (!emitter) return;
  try {
    emitter.emit = false;
    emitter.destroy();
  } catch {
    // already destroyed
  }
}

export const VFXCanvas: React.FC<VFXCanvasProps> = ({
  emitterConfig,
  particleImageUrl,
  textureSource,
  customParticleSpriteUrl,
  libraryParticleTextureUrl,
  particleSpriteType,
  blendMode,
  loopPreview,
  bgColor,
  customBackgroundUrl,
  backgroundTransform,
  onBackgroundTransformChange,
  showSymbol,
  emissionMask,
  showMaskOverlay,
  timeline,
  timelinePlaying,
  sceneTime,
  baseSpawnSpeed,
  baseMaxParticles,
  onSceneTimeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const emitterRef = useRef<Emitter | null>(null);
  const particleContainerRef = useRef<PIXI.ParticleContainer | null>(null);
  const symbolSpriteRef = useRef<PIXI.Sprite | null>(null);
  const emitPositionRef = useRef<{ x: number; y: number }>({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const sceneTimeRef = useRef(sceneTime);
  const timelineRef = useRef(timeline);
  const timelinePlayingRef = useRef(timelinePlaying);
  const baseSpawnRef = useRef(baseSpawnSpeed);
  const baseMaxRef = useRef(baseMaxParticles);
  const isDraggingRef = useRef(false);
  const isRebuildingRef = useRef(false);
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rebuildIdRef = useRef(0);
  const onSceneTimeChangeRef = useRef(onSceneTimeChange);
  const perfMonitorRef = useRef(new PerfMonitor());

  const [emitPos, setEmitPos] = useState({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const [symbolDisplaySize, setSymbolDisplaySize] = useState({ w: SYMBOL_SIZE, h: SYMBOL_SIZE });
  const [perfStats, setPerfStats] = useState<PerfSnapshot>(() => perfMonitorRef.current.snapshot());
  const perfUiTimerRef = useRef(0);

  useEffect(() => { sceneTimeRef.current = sceneTime; }, [sceneTime]);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => { timelinePlayingRef.current = timelinePlaying; }, [timelinePlaying]);
  useEffect(() => { baseSpawnRef.current = baseSpawnSpeed; }, [baseSpawnSpeed]);
  useEffect(() => { baseMaxRef.current = baseMaxParticles; }, [baseMaxParticles]);
  useEffect(() => { onSceneTimeChangeRef.current = onSceneTimeChange; }, [onSceneTimeChange]);

  const bgStyles = {
    dark: { backgroundColor: '#0f172a' },
    light: { backgroundColor: '#f8fafc' },
    transparent: {
      backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                        linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                        linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundColor: '#0f172a'
    },
    reel: {
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f0b26 100%)',
      borderLeft: '4px solid #f59e0b',
      borderRight: '4px solid #f59e0b',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
    }
  };

  useEffect(() => {
    if (!canvasMountRef.current) return;

    const app = new PIXI.Application({
      width: CANVAS_W,
      height: CANVAS_H,
      antialias: true,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1
    });

    pixiAppRef.current = app;
    canvasMountRef.current.appendChild(app.view as HTMLCanvasElement);
    perfMonitorRef.current.attachToRenderer(app.renderer);

    const particleContainer = new PIXI.ParticleContainer(2000, {
      vertices: false,
      position: true,
      rotation: true,
      uvs: true,
      tint: true,
      alpha: true
    });

    const symbolSprite = new PIXI.Sprite();
    symbolSprite.anchor.set(0.5);
    symbolSprite.x = CANVAS_W / 2;
    symbolSprite.y = CANVAS_H / 2;
    symbolSprite.width = SYMBOL_SIZE;
    symbolSprite.height = SYMBOL_SIZE;

    app.stage.addChild(symbolSprite);
    app.stage.addChild(particleContainer);
    particleContainerRef.current = particleContainer;
    symbolSpriteRef.current = symbolSprite;

    const updateLoop = (delta: number) => {
      if (isRebuildingRef.current) return;

      const monitor = perfMonitorRef.current;
      monitor.beginFrame();
      const dt = delta * 0.016;
      const emitter = emitterRef.current;

      if (emitter) {
        const tl = timelineRef.current;

        if (tl && timelinePlayingRef.current) {
          let next = sceneTimeRef.current + dt;
          if (next >= tl.duration) {
            next = tl.loop ? next % tl.duration : tl.duration;
          }
          sceneTimeRef.current = next;
          onSceneTimeChangeRef.current(next);
        }

        if (tl && tl.keyframes.length > 0) {
          const mods = getTimelineModifiers(tl, sceneTimeRef.current);
          emitter.frequency = Math.max(0.001, baseSpawnRef.current / Math.max(0.1, mods.spawnSpeedMult));
          emitter.maxParticles = Math.max(10, Math.round(baseMaxRef.current * mods.maxParticlesMult));

          if (particleContainerRef.current) {
            particleContainerRef.current.alpha = mods.intensity;
            particleContainerRef.current.scale.set(mods.scaleStartMult);
          }
        } else if (particleContainerRef.current) {
          particleContainerRef.current.alpha = 1;
          particleContainerRef.current.scale.set(1);
        }

        try {
          emitter.update(dt);
          monitor.setParticles(emitter.particleCount ?? 0);
        } catch {
          destroyEmitterSafe(emitterRef.current);
          emitterRef.current = null;
          monitor.setParticles(0);
        }
      } else {
        monitor.setParticles(0);
      }

      monitor.endUpdate();
      monitor.endFrame();

      perfUiTimerRef.current += dt;
      if (perfUiTimerRef.current >= 0.2) {
        perfUiTimerRef.current = 0;
        setPerfStats(monitor.snapshot());
      }
    };
    app.ticker.add(updateLoop);

    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
      app.ticker.remove(updateLoop);
      isRebuildingRef.current = true;
      destroyEmitterSafe(emitterRef.current);
      emitterRef.current = null;
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      pixiAppRef.current = null;
      particleContainerRef.current = null;
      symbolSpriteRef.current = null;
      isRebuildingRef.current = false;
    };
  }, []);

  useEffect(() => {
    const particleContainer = particleContainerRef.current;
    const symbolSprite = symbolSpriteRef.current;
    if (!particleContainer || !symbolSprite) return;

    particleContainer.blendMode = resolvePixiBlendMode(blendMode);

    let symbolTexture: PIXI.Texture | null = null;
    if (particleImageUrl) {
      symbolTexture = PIXI.Texture.from(particleImageUrl);
    }

    if (symbolTexture && showSymbol) {
      symbolSprite.texture = symbolTexture;
      symbolSprite.visible = true;
      const aspect = symbolTexture.width / symbolTexture.height;
      let displayW = SYMBOL_SIZE;
      let displayH = SYMBOL_SIZE;
      if (aspect > 1) {
        symbolSprite.width = SYMBOL_SIZE;
        symbolSprite.height = SYMBOL_SIZE / aspect;
        displayH = SYMBOL_SIZE / aspect;
      } else {
        symbolSprite.width = SYMBOL_SIZE * aspect;
        symbolSprite.height = SYMBOL_SIZE;
        displayW = SYMBOL_SIZE * aspect;
      }
      setSymbolDisplaySize({ w: displayW, h: displayH });
    } else {
      symbolSprite.visible = false;
      setSymbolDisplaySize({ w: SYMBOL_SIZE, h: SYMBOL_SIZE });
    }

    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    const rebuildId = ++rebuildIdRef.current;

    rebuildTimerRef.current = setTimeout(() => {
      if (rebuildId !== rebuildIdRef.current || !particleContainerRef.current) return;

      isRebuildingRef.current = true;
      destroyEmitterSafe(emitterRef.current);
      emitterRef.current = null;

      let particleTexture: PIXI.Texture;
      if (textureSource === 'custom' && customParticleSpriteUrl) {
        particleTexture = PIXI.Texture.from(customParticleSpriteUrl);
      } else if (textureSource === 'library' && libraryParticleTextureUrl) {
        particleTexture = PIXI.Texture.from(libraryParticleTextureUrl);
      } else if (textureSource === 'symbol' && symbolTexture) {
        particleTexture = symbolTexture;
      } else {
        particleTexture = generateParticleTexture(particleSpriteType);
      }

      try {
        const runtimeConfig = finalizeEmitterConfig({
          ...emitterConfig,
          behaviors: emitterConfig.behaviors.map((b: any) => {
            if (b.type === 'textureSingle') {
              return { ...b, config: { texture: particleTexture } };
            }
            return b;
          })
        });

        const emitter = new Emitter(particleContainerRef.current, runtimeConfig);
        emitter.updateSpawnPos(emitPositionRef.current.x, emitPositionRef.current.y);
        emitter.emit = true;
        emitterRef.current = emitter;

        if (timelineRef.current?.keyframes.length) {
          const mods = getTimelineModifiers(timelineRef.current, sceneTimeRef.current);
          emitter.frequency = Math.max(0.001, baseSpawnRef.current / Math.max(0.1, mods.spawnSpeedMult));
          emitter.maxParticles = Math.max(10, Math.round(baseMaxRef.current * mods.maxParticlesMult));
          if (particleContainerRef.current) {
            particleContainerRef.current.alpha = mods.intensity;
            particleContainerRef.current.scale.set(mods.scaleStartMult);
          }
        }
      } catch (e) {
        console.error('Failed to parse or create emitter config:', e);
      } finally {
        isRebuildingRef.current = false;
      }
    }, REBUILD_DEBOUNCE_MS);

    return () => {
      if (rebuildTimerRef.current) {
        clearTimeout(rebuildTimerRef.current);
        rebuildTimerRef.current = null;
      }
    };
  }, [
    emitterConfig,
    particleImageUrl,
    textureSource,
    customParticleSpriteUrl,
    libraryParticleTextureUrl,
    particleSpriteType,
    blendMode,
    loopPreview,
    showSymbol
  ]);

  const updateEmitPos = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.bg-transform-box, .bg-transform-handle')) return;

    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas || !pixiAppRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;

    emitPositionRef.current = { x, y };
    setEmitPos({ x, y });
    emitterRef.current?.updateSpawnPos(x, y);

    if (symbolSpriteRef.current && showSymbol) {
      symbolSpriteRef.current.x = x;
      symbolSpriteRef.current.y = y;
    }
  };

  const symbolW = showSymbol ? symbolDisplaySize.w : 0;
  const symbolH = showSymbol ? symbolDisplaySize.h : 0;
  const showCustomBg = bgColor === 'custom' && customBackgroundUrl && backgroundTransform;
  const containerBgStyle = bgColor === 'custom' ? bgStyles.dark : bgStyles[bgColor];

  return (
    <div className="vfx-preview-stack">
      <div className="preview-stats-bar" aria-live="polite">
        <span className="preview-stats-title">Performance</span>
        <span className={`perf-chip ${perfStats.fps > 0 && perfStats.fps < 50 ? 'warn' : ''}`}>
          FPS {perfStats.fps > 0 ? perfStats.fps.toFixed(0) : '—'}
        </span>
        <span className="perf-chip">Frame {perfStats.frameMs.toFixed(1)} ms</span>
        <span className="perf-chip">CPU {perfStats.cpuMs.toFixed(1)} ms ({perfStats.cpuPct.toFixed(0)}%)</span>
        <span className="perf-chip">GPU est. {perfStats.gpuMs.toFixed(1)} ms ({perfStats.gpuPct.toFixed(0)}%)</span>
        <span className="perf-chip">Draw calls {perfStats.drawCalls}</span>
        <span className="perf-chip">Particles {perfStats.particles}</span>
      </div>

      <div className="vfx-canvas-wrapper">
        <div
          ref={containerRef}
          className="vfx-canvas-container"
          style={{
            ...containerBgStyle,
            position: 'relative',
            width: `${CANVAS_W}px`,
            height: `${CANVAS_H}px`,
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: showCustomBg ? 'default' : 'crosshair',
            touchAction: 'none'
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('.bg-transform-box, .bg-transform-handle')) return;
            isDraggingRef.current = true;
            updateEmitPos(e);
          }}
          onPointerMove={(e) => {
            if (!isDraggingRef.current) return;
            updateEmitPos(e);
          }}
          onPointerUp={() => { isDraggingRef.current = false; }}
          onPointerLeave={() => { isDraggingRef.current = false; }}
        >
          {showCustomBg && (
            <BackgroundTransformBox
              imageUrl={customBackgroundUrl}
              transform={backgroundTransform}
              onChange={onBackgroundTransformChange}
            />
          )}

          <div ref={canvasMountRef} className="pixi-canvas-mount" />

          {showMaskOverlay && emissionMask && emissionMask.mode !== 'point' && (
            <div className="mask-overlay" aria-hidden>
              {emissionMask.previewPoints.map((p, i) => (
                <div
                  key={i}
                  className={`mask-dot mask-dot-${emissionMask.mode}`}
                  style={{
                    left: emitPos.x - symbolW / 2 + p.x * symbolW,
                    top: emitPos.y - symbolH / 2 + p.y * symbolH
                  }}
                />
              ))}
            </div>
          )}

          <div className="canvas-hud-mini">
            {loopPreview ? '∞ Loop' : 'Burst'}
            {timelinePlaying ? ' · Timeline ▶' : ''}
            {emissionMask && emissionMask.mode !== 'point' ? ` · Mask: ${emissionMask.mode}` : ''}
            {showCustomBg ? ' · Edit BG: drag box / corners' : ' · Drag to move emitter'}
          </div>
        </div>
      </div>
    </div>
  );
};
