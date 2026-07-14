import type * as PIXI from 'pixi.js';

export interface PerfSnapshot {
  fps: number;
  frameMs: number;
  cpuMs: number;
  gpuMs: number;
  cpuPct: number;
  gpuPct: number;
  drawCalls: number;
  particles: number;
}

const FRAME_BUDGET_MS = 1000 / 60;
const FPS_SAMPLES = 30;

export class PerfMonitor {
  fps = 0;
  frameMs = 0;
  cpuMs = 0;
  gpuMs = 0;
  cpuPct = 0;
  gpuPct = 0;
  drawCalls = 0;
  particles = 0;

  private frameStart = 0;
  private updateEnd = 0;
  private lastTimestamp = performance.now();
  private frameDeltaSamples: number[] = [];
  private frameDrawCalls = 0;
  private flushHooked = false;

  beginFrame() {
    this.frameStart = performance.now();
    this.frameDrawCalls = 0;
  }

  endUpdate() {
    this.updateEnd = performance.now();
  }

  setParticles(count: number) {
    this.particles = count;
  }

  endFrame() {
    const now = performance.now();
    this.frameMs = now - this.frameStart;
    this.cpuMs = Math.max(0, this.updateEnd - this.frameStart);

    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;
    this.frameDeltaSamples.push(delta);
    if (this.frameDeltaSamples.length > FPS_SAMPLES) {
      this.frameDeltaSamples.shift();
    }
    const avgDelta =
      this.frameDeltaSamples.reduce((sum, value) => sum + value, 0) /
      this.frameDeltaSamples.length;
    this.fps = avgDelta > 0 ? 1000 / avgDelta : 0;

    this.gpuMs = Math.max(0, this.frameMs - this.cpuMs);
    this.cpuPct = Math.min(100, (this.cpuMs / FRAME_BUDGET_MS) * 100);
    this.gpuPct = Math.min(100, (this.gpuMs / FRAME_BUDGET_MS) * 100);
    this.drawCalls = this.frameDrawCalls;
  }

  attachToRenderer(renderer: PIXI.IRenderer) {
    if (this.flushHooked) return;
    const batch = (renderer as PIXI.IRenderer & { plugins?: { batch?: { flush?: () => void; _dcIndex?: number } } })
      .plugins?.batch;
    if (!batch?.flush) return;

    const originalFlush = batch.flush.bind(batch);
    batch.flush = () => {
      originalFlush();
      this.frameDrawCalls += batch._dcIndex ?? 0;
    };
    this.flushHooked = true;
  }

  snapshot(): PerfSnapshot {
    return {
      fps: this.fps,
      frameMs: this.frameMs,
      cpuMs: this.cpuMs,
      gpuMs: this.gpuMs,
      cpuPct: this.cpuPct,
      gpuPct: this.gpuPct,
      drawCalls: this.drawCalls,
      particles: this.particles
    };
  }
}
