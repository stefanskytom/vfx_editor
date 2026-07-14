import * as PIXI from 'pixi.js';

export type ParticleSpriteType =
  | 'spark'
  | 'flame'
  | 'ember'
  | 'droplet'
  | 'bubble'
  | 'snowflake'
  | 'smoke'
  | 'leaf'
  | 'magic_dust'
  | 'gold_sparkle'
  | 'glow'
  | 'lightning';

export const SPRITE_TYPE_LABELS: Record<ParticleSpriteType, string> = {
  spark: 'Spark / Iskra',
  flame: 'Flame / Ogień',
  ember: 'Ember / Żar',
  droplet: 'Water Droplet / Kropla',
  bubble: 'Bubble / Bańka',
  snowflake: 'Snowflake / Płatek śniegu',
  smoke: 'Smoke / Dym',
  leaf: 'Leaf / Liść',
  magic_dust: 'Magic Dust / Pył magiczny',
  gold_sparkle: 'Gold Sparkle / Złoty blask',
  glow: 'Soft Glow / Poświata',
  lightning: 'Lightning / Błyskawica'
};

const textureCache = new Map<string, PIXI.Texture>();

function createCanvas(size = 64): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');
  return [canvas, ctx];
}

function drawSpark(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.beginPath();
  ctx.moveTo(c, size * 0.06);
  ctx.quadraticCurveTo(c, c, size * 0.94, c);
  ctx.quadraticCurveTo(c, c, c, size * 0.94);
  ctx.quadraticCurveTo(c, c, size * 0.06, c);
  ctx.quadraticCurveTo(c, c, c, size * 0.06);
  ctx.closePath();
  ctx.fill();
}

function drawFlame(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, size * 0.7, 2, c, size * 0.55, size * 0.45);
  grad.addColorStop(0, 'rgba(255, 255, 220, 1)');
  grad.addColorStop(0.35, 'rgba(255, 200, 80, 0.95)');
  grad.addColorStop(0.7, 'rgba(255, 90, 20, 0.7)');
  grad.addColorStop(1, 'rgba(255, 40, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(c, size * 0.08);
  ctx.bezierCurveTo(size * 0.78, size * 0.35, size * 0.72, size * 0.72, c, size * 0.92);
  ctx.bezierCurveTo(size * 0.28, size * 0.72, size * 0.22, size * 0.35, c, size * 0.08);
  ctx.closePath();
  ctx.fill();
}

function drawEmber(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 1, c, c, size * 0.38);
  grad.addColorStop(0, 'rgba(255, 240, 180, 1)');
  grad.addColorStop(0.4, 'rgba(255, 140, 40, 0.9)');
  grad.addColorStop(1, 'rgba(200, 40, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

function drawDroplet(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createLinearGradient(c, size * 0.1, c, size * 0.95);
  grad.addColorStop(0, 'rgba(220, 245, 255, 1)');
  grad.addColorStop(0.5, 'rgba(120, 200, 255, 0.85)');
  grad.addColorStop(1, 'rgba(40, 120, 220, 0.6)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(c, size * 0.1);
  ctx.bezierCurveTo(size * 0.82, size * 0.42, size * 0.78, size * 0.78, c, size * 0.92);
  ctx.bezierCurveTo(size * 0.22, size * 0.78, size * 0.18, size * 0.42, c, size * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(c - size * 0.12, size * 0.38, size * 0.07, size * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBubble(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const r = size * 0.36;
  const grad = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, 1, c, c, r);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.45, 'rgba(180, 230, 255, 0.45)');
  grad.addColorStop(1, 'rgba(80, 160, 255, 0.15)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(200, 240, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSnowflake(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x2 = c + Math.cos(angle) * size * 0.38;
    const y2 = c + Math.sin(angle) * size * 0.38;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const branchLen = size * 0.1;
    const bx = c + Math.cos(angle) * size * 0.22;
    const by = c + Math.sin(angle) * size * 0.22;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(angle + 0.6) * branchLen, by + Math.sin(angle + 0.6) * branchLen);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(angle - 0.6) * branchLen, by + Math.sin(angle - 0.6) * branchLen);
    ctx.stroke();
  }
}

function drawSmoke(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 4, c, c, size * 0.42);
  grad.addColorStop(0, 'rgba(240, 240, 245, 0.55)');
  grad.addColorStop(0.5, 'rgba(200, 200, 210, 0.35)');
  grad.addColorStop(1, 'rgba(160, 160, 170, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(c, c, size * 0.38, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c - size * 0.14, c - size * 0.1, size * 0.2, size * 0.16, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c + size * 0.12, c + size * 0.08, size * 0.18, size * 0.14, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeaf(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createLinearGradient(size * 0.2, size * 0.2, size * 0.8, size * 0.8);
  grad.addColorStop(0, 'rgba(180, 255, 120, 1)');
  grad.addColorStop(0.6, 'rgba(60, 180, 50, 0.9)');
  grad.addColorStop(1, 'rgba(30, 100, 30, 0.7)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(c, size * 0.12);
  ctx.bezierCurveTo(size * 0.85, size * 0.25, size * 0.8, size * 0.75, c, size * 0.9);
  ctx.bezierCurveTo(size * 0.2, size * 0.75, size * 0.15, size * 0.25, c, size * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(40, 100, 30, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(c, size * 0.12);
  ctx.lineTo(c, size * 0.9);
  ctx.stroke();
}

function drawMagicDust(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 1, c, c, size * 0.4);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(220, 180, 255, 0.9)');
  grad.addColorStop(1, 'rgba(140, 80, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const x = c + Math.cos(angle) * size * 0.32;
    const y = c + Math.sin(angle) * size * 0.32;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGoldSparkle(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 1, c, c, size * 0.42);
  grad.addColorStop(0, 'rgba(255, 255, 220, 1)');
  grad.addColorStop(0.25, 'rgba(255, 220, 80, 0.95)');
  grad.addColorStop(1, 'rgba(255, 180, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const radius = i % 2 === 0 ? size * 0.4 : size * 0.16;
    const x = c + Math.cos(angle) * radius;
    const y = c + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGlow(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 2, c, c, size * 0.5);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

function drawLightning(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = 'rgba(255, 255, 220, 1)';
  ctx.shadowColor = 'rgba(200, 220, 255, 0.9)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(size * 0.52, size * 0.08);
  ctx.lineTo(size * 0.34, size * 0.48);
  ctx.lineTo(size * 0.5, size * 0.48);
  ctx.lineTo(size * 0.38, size * 0.92);
  ctx.lineTo(size * 0.68, size * 0.42);
  ctx.lineTo(size * 0.5, size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

const DRAWERS: Record<ParticleSpriteType, (ctx: CanvasRenderingContext2D, size: number) => void> = {
  spark: drawSpark,
  flame: drawFlame,
  ember: drawEmber,
  droplet: drawDroplet,
  bubble: drawBubble,
  snowflake: drawSnowflake,
  smoke: drawSmoke,
  leaf: drawLeaf,
  magic_dust: drawMagicDust,
  gold_sparkle: drawGoldSparkle,
  glow: drawGlow,
  lightning: drawLightning
};

/**
 * Generates a procedural particle texture for the given sprite type.
 * Textures are cached per type and size.
 */
export function generateParticleTexture(
  spriteType: ParticleSpriteType,
  size = 64
): PIXI.Texture {
  const cacheKey = `${spriteType}_${size}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const [canvas, ctx] = createCanvas(size);
  ctx.clearRect(0, 0, size, size);
  DRAWERS[spriteType](ctx, size);

  const texture = PIXI.Texture.from(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

export function getSpriteTypeLabel(spriteType: ParticleSpriteType): string {
  return SPRITE_TYPE_LABELS[spriteType];
}
