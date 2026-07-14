import type { ParticleSpriteType } from './spriteGenerator';

export type VfxTheme =
  | 'fire'
  | 'water'
  | 'ice'
  | 'magic'
  | 'gold'
  | 'nature'
  | 'smoke'
  | 'electric'
  | 'spark'
  | 'neutral';

export interface AnalysisResult {
  dominantColor: string;
  secondaryColor: string;
  accentColor: string;
  brightness: number;
  symbolType: 'gold' | 'fire' | 'magic' | 'standard';
  shape: 'circular' | 'rectangular' | 'irregular';
  vfxTheme: VfxTheme;
  particleSpriteType: ParticleSpriteType;
  logs: string[];
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, l };
}

function detectVfxTheme(
  dom: { r: number; g: number; b: number },
  sec: { r: number; g: number; b: number },
  brightness: number,
  symbolType: AnalysisResult['symbolType']
): VfxTheme {
  const domHsl = rgbToHsl(dom.r, dom.g, dom.b);
  const secHsl = rgbToHsl(sec.r, sec.g, sec.b);
  const avgSat = (domHsl.s + secHsl.s) / 2;
  const hue = domHsl.h;

  if (avgSat < 0.12 && brightness < 0.55) return 'smoke';
  if (brightness > 0.82 && avgSat < 0.2) return 'ice';
  if (hue >= 35 && hue <= 75 && dom.r > 150 && dom.g > 120) return 'gold';
  if (hue >= 0 && hue <= 45 && dom.r > dom.g && dom.r > dom.b) return 'fire';
  if (hue >= 180 && hue <= 220 && dom.b > dom.r) return 'water';
  if (hue >= 90 && hue <= 160 && dom.g > dom.r && dom.g > dom.b) return 'nature';
  if ((hue >= 240 && hue <= 300) || (dom.r > 120 && dom.b > 120 && dom.g < 110)) return 'magic';
  if (hue >= 45 && hue <= 65 && brightness > 0.7) return 'electric';
  if (brightness > 0.65 && avgSat > 0.25) return 'spark';

  if (symbolType === 'gold') return 'gold';
  if (symbolType === 'fire') return 'fire';
  if (symbolType === 'magic') return 'magic';
  return 'neutral';
}

function mapThemeToSprite(
  theme: VfxTheme,
  brightness: number,
  shape: AnalysisResult['shape']
): ParticleSpriteType {
  switch (theme) {
    case 'fire':
      return brightness > 0.7 ? 'flame' : 'ember';
    case 'water':
      return shape === 'circular' ? 'bubble' : 'droplet';
    case 'ice':
      return 'snowflake';
    case 'magic':
      return 'magic_dust';
    case 'gold':
      return brightness > 0.6 ? 'gold_sparkle' : 'spark';
    case 'nature':
      return 'leaf';
    case 'smoke':
      return 'smoke';
    case 'electric':
      return 'lightning';
    case 'spark':
      return 'spark';
    default:
      return 'glow';
  }
}

/**
 * Utility to analyze an image (File or URL) using an HTML Canvas.
 * Extracts dominant, secondary, and accent colors, calculates brightness, and guesses shape/type.
 */
export async function analyzeImage(imageInput: File | string): Promise<AnalysisResult> {
  const logs: string[] = [];
  logs.push(`Starting image analysis for ${typeof imageInput === 'string' ? 'default symbol' : imageInput.name}...`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2D context for canvas');
        }

        // Limit dimensions for faster analysis
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

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Color buckets and pixel counters
        const colors: { r: number; g: number; b: number; count: number }[] = [];
        let totalPixels = 0;
        let opaquePixels = 0;
        let totalBrightness = 0;

        // Bounding box detection for shape
        let minX = w;
        let maxX = 0;
        let minY = h;
        let maxY = 0;

        // Sample pixels
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          const pixelIdx = i / 4;
          const px = pixelIdx % w;
          const py = Math.floor(pixelIdx / w);

          totalPixels++;

          // Skip highly transparent pixels
          if (a < 50) continue;

          opaquePixels++;
          totalBrightness += (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          // Track bounding box of non-transparent part
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;

          // Color quantization (grouping colors to nearest 16 values)
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;

          // Don't include pure white or black as dominant color if we can avoid it
          const isNeutral = Math.abs(qr - qg) < 15 && Math.abs(qg - qb) < 15;
          const isExtreme = (qr < 30 && qg < 30 && qb < 30) || (qr > 225 && qg > 225 && qb > 225);

          let bucket = colors.find(
            (c) => Math.abs(c.r - qr) < 20 && Math.abs(c.g - qg) < 20 && Math.abs(c.b - qb) < 20
          );

          if (bucket) {
            // Adjust average slightly
            bucket.count++;
            // Give preference to saturated colors
            if (!isNeutral || !isExtreme) {
              bucket.count += 0.5;
            }
          } else {
            colors.push({ r: qr, g: qg, b: qb, count: isNeutral && isExtreme ? 0.5 : 1 });
          }
        }

        // Sort colors by weight (count)
        colors.sort((a, b) => b.count - a.count);

        logs.push(`Processed ${opaquePixels} non-transparent pixels.`);

        // Pick dominant colors
        let dom = colors[0] || { r: 255, g: 215, b: 0 }; // Default Gold
        let sec = colors[1] || { r: 255, g: 140, b: 0 }; // Default Orange/Fire
        let acc = colors[2] || { r: 255, g: 255, b: 255 }; // Default White

        // Convert to HEX
        const toHex = (r: number, g: number, b: number) => {
          return '#' + [r, g, b].map(x => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('');
        };

        const dominantColor = toHex(dom.r, dom.g, dom.b);
        const secondaryColor = toHex(sec.r, sec.g, sec.b);
        const accentColor = toHex(acc.r, acc.g, acc.b);

        logs.push(`Dominant color detected: ${dominantColor}`);
        logs.push(`Secondary color detected: ${secondaryColor}`);
        logs.push(`Accent color detected: ${accentColor}`);

        // Brightness
        const avgBrightness = opaquePixels > 0 ? totalBrightness / opaquePixels : 0.5;
        logs.push(`Average brightness: ${avgBrightness.toFixed(2)}`);

        // Type prediction based on color hues
        let symbolType: 'gold' | 'fire' | 'magic' | 'standard' = 'standard';
        
        // Calculate basic color differences to classify
        const r = dom.r;
        const g = dom.g;
        const b = dom.b;

        if (r > 200 && g > 150 && b < 100) {
          symbolType = 'gold';
          logs.push('Classification: Gold symbol (high yellow/gold content)');
        } else if (r > 180 && g < 120 && b < 80) {
          symbolType = 'fire';
          logs.push('Classification: Fire/Red symbol (high red/orange content)');
        } else if (b > 150 && r < 150) {
          symbolType = 'magic';
          logs.push('Classification: Magic/Blue symbol (high blue/purple content)');
        } else if (r > 120 && b > 120 && g < 100) {
          symbolType = 'magic';
          logs.push('Classification: Magic/Purple symbol (high magenta/purple content)');
        } else {
          symbolType = 'standard';
          logs.push('Classification: Standard symbol (balanced/mixed colors)');
        }

        // Shape prediction based on bounding box and fill ratio
        let shape: 'circular' | 'rectangular' | 'irregular' = 'irregular';
        if (opaquePixels > 0) {
          const boxWidth = maxX - minX + 1;
          const boxHeight = maxY - minY + 1;
          const boxArea = boxWidth * boxHeight;
          const fillRatio = opaquePixels / boxArea;
          const aspect = boxWidth / boxHeight;

          logs.push(`Aspect ratio: ${aspect.toFixed(2)}, Fill ratio: ${fillRatio.toFixed(2)}`);

          if (Math.abs(aspect - 1) < 0.15 && fillRatio > 0.65 && fillRatio < 0.82) {
            shape = 'circular';
            logs.push('Shape detection: Circular contour');
          } else if (fillRatio > 0.82) {
            shape = 'rectangular';
            logs.push('Shape detection: Rectangular solid fill');
          } else {
            shape = 'irregular';
            logs.push('Shape detection: Irregular shape or high transparency');
          }
        }

        const vfxTheme = detectVfxTheme(dom, sec, avgBrightness, symbolType);
        logs.push(`VFX theme inferred: ${vfxTheme.toUpperCase()}`);

        const particleSpriteType = mapThemeToSprite(vfxTheme, avgBrightness, shape);
        logs.push(`Particle sprite selected: ${particleSpriteType} (procedural asset will be generated)`);

        resolve({
          dominantColor,
          secondaryColor,
          accentColor,
          brightness: avgBrightness,
          symbolType,
          shape,
          vfxTheme,
          particleSpriteType,
          logs
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for canvas analysis'));
    };

    if (typeof imageInput === 'string') {
      img.src = imageInput;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('FileReader failed'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(imageInput);
    }
  });
}
