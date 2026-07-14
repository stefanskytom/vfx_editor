import type { EmissionMaskData, EmissionMaskMode, MaskPoint } from '../types/emissionMask';

const SYMBOL_DISPLAY_SIZE = 120;

function isForeground(r: number, g: number, b: number, a: number): boolean {
  if (a < 40) return false;
  const brightness = r * 0.299 + g * 0.587 + b * 0.114;
  return brightness < 235;
}

function toLocal(px: number, py: number, cx: number, cy: number, scale: number): MaskPoint {
  return {
    x: (px - cx) * scale,
    y: (py - cy) * scale
  };
}

function toPreview(px: number, py: number, w: number, h: number): MaskPoint {
  return { x: px / w, y: py / h };
}

function sampleOutline(_data: Uint8ClampedArray, w: number, h: number, isFg: (i: number) => boolean): MaskPoint[] {
  const points: MaskPoint[] = [];
  const step = 2;

  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const idx = (y * w + x) * 4;
      if (!isFg(idx)) continue;

      const neighbors = [
        (y - 1) * w + x,
        (y + 1) * w + x,
        y * w + (x - 1),
        y * w + (x + 1)
      ];
      const isEdge = neighbors.some((n) => !isFg(n * 4));
      if (isEdge) points.push({ x, y });
    }
  }

  if (points.length < 8) {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.4;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
  }

  return points;
}

function sampleFill(_data: Uint8ClampedArray, w: number, h: number, isFg: (i: number) => boolean): MaskPoint[] {
  const points: MaskPoint[] = [];
  const step = 3;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      if (isFg(idx)) points.push({ x, y });
    }
  }

  return points.slice(0, 80);
}

function sampleHotspots(data: Uint8ClampedArray, w: number, h: number, isFg: (i: number) => boolean): MaskPoint[] {
  const candidates: { x: number; y: number; score: number }[] = [];
  const step = 2;

  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const idx = (y * w + x) * 4;
      if (!isFg(idx)) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const score = brightness * 0.7 + (sat / 255) * 0.3;

      if (score > 0.45) candidates.push({ x, y, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 12);

  if (top.length === 0) {
    return [{ x: w / 2, y: h / 2 }];
  }

  return top.map((c) => ({ x: c.x, y: c.y }));
}

function decimate(points: MaskPoint[], maxPoints: number): MaskPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const result: MaskPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.floor(i * step)]);
  }
  return result;
}

function closePolygon(points: MaskPoint[]): MaskPoint[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first.x - last.x) < 0.5 && Math.abs(first.y - last.y) < 0.5) return points;
  return [...points, { ...first }];
}

/**
 * Builds emission mask spawn points from a symbol image.
 */
export async function buildEmissionMask(
  imageInput: File | string,
  mode: EmissionMaskMode
): Promise<EmissionMaskData> {
  if (mode === 'point') {
    return { mode, polygon: [], previewPoints: [], hotspotCount: 0 };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const maxDim = 128;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let minX = w;
        let maxX = 0;
        let minY = h;
        let maxY = 0;

        const isFg = (idx: number) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (!isForeground(r, g, b, a)) return false;
          const px = (idx / 4) % w;
          const py = Math.floor(idx / 4 / w);
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          return true;
        };

        let raw: MaskPoint[] = [];
        if (mode === 'outline') raw = sampleOutline(data, w, h, isFg);
        else if (mode === 'fill') raw = sampleFill(data, w, h, isFg);
        else raw = sampleHotspots(data, w, h, isFg);

        const boxW = Math.max(1, maxX - minX + 1);
        const boxH = Math.max(1, maxY - minY + 1);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const scale = SYMBOL_DISPLAY_SIZE / Math.max(boxW, boxH);

        const maxPts = mode === 'fill' ? 60 : mode === 'hotspots' ? 12 : 36;
        raw = decimate(raw, maxPts);

        let polygon = raw.map((p) => toLocal(p.x, p.y, cx, cy, scale));
        if (mode === 'outline') polygon = closePolygon(polygon);

        const previewPoints = raw.map((p) => toPreview(p.x, p.y, w, h));

        resolve({
          mode,
          polygon,
          previewPoints,
          hotspotCount: mode === 'hotspots' ? polygon.length : 0
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for emission mask'));

    if (typeof imageInput === 'string') {
      img.src = imageInput;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) img.src = e.target.result as string;
        else reject(new Error('FileReader failed'));
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(imageInput);
    }
  });
}

/** Converts mask points to polygonalChain chains (each spawn point = degenerate 2-point chain). */
export function maskToSpawnChains(polygon: MaskPoint[]): MaskPoint[][] {
  if (polygon.length === 0) return [];
  if (polygon.length >= 3) {
    return [polygon];
  }
  return polygon.map((p) => [p, { x: p.x, y: p.y }]);
}
