export interface CurveKeyframe {
  time: number;
  value: number;
}

export interface ColorCurveKeyframe {
  time: number;
  value: string;
}

export function sortCurveKeyframes<T extends { time: number }>(keyframes: T[]): T[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

export function clampCurveTime(time: number): number {
  return Math.min(1, Math.max(0, time));
}

export function createDefaultAlphaCurve(start: number, end: number): CurveKeyframe[] {
  return [
    { time: 0, value: start },
    { time: 1, value: end }
  ];
}

export function createDefaultScaleCurve(start: number, end: number): CurveKeyframe[] {
  return [
    { time: 0, value: start },
    { time: 1, value: end }
  ];
}

export function createDefaultColorCurve(start: string, end: string): ColorCurveKeyframe[] {
  return [
    { time: 0, value: start },
    { time: 1, value: end }
  ];
}

export function updateCurveEndpoint(
  keyframes: CurveKeyframe[],
  endpoint: 'start' | 'end',
  value: number
): CurveKeyframe[] {
  const sorted = sortCurveKeyframes(keyframes);
  if (sorted.length === 0) {
    return endpoint === 'start'
      ? [{ time: 0, value }, { time: 1, value }]
      : [{ time: 0, value }, { time: 1, value }];
  }

  return sorted.map((kf, index) => {
    if (endpoint === 'start' && index === 0) return { ...kf, value };
    if (endpoint === 'end' && index === sorted.length - 1) return { ...kf, value };
    return kf;
  });
}

export function updateColorCurveEndpoint(
  keyframes: ColorCurveKeyframe[],
  endpoint: 'start' | 'end',
  value: string
): ColorCurveKeyframe[] {
  const sorted = sortCurveKeyframes(keyframes);
  if (sorted.length === 0) {
    return endpoint === 'start'
      ? [{ time: 0, value }, { time: 1, value }]
      : [{ time: 0, value }, { time: 1, value }];
  }

  return sorted.map((kf, index) => {
    if (endpoint === 'start' && index === 0) return { ...kf, value };
    if (endpoint === 'end' && index === sorted.length - 1) return { ...kf, value };
    return kf;
  });
}

/** Ensures a valid curve for @pixi/particle-emitter (needs endpoints at t=0 and t=1). */
export function sanitizeNumericCurve(
  keyframes: CurveKeyframe[] | undefined,
  fallbackStart: number,
  fallbackEnd: number
): CurveKeyframe[] {
  if (!keyframes?.length) {
    return createDefaultAlphaCurve(fallbackStart, fallbackEnd);
  }

  const sorted = sortCurveKeyframes(
    keyframes.map((kf) => ({
      time: clampCurveTime(kf.time),
      value: kf.value
    }))
  );

  const deduped: CurveKeyframe[] = [];
  for (const kf of sorted) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.time - kf.time) < 0.001) {
      deduped[deduped.length - 1] = kf;
    } else {
      deduped.push(kf);
    }
  }

  if (deduped.length === 1) {
    return [
      { time: 0, value: deduped[0].value },
      { time: 1, value: fallbackEnd }
    ];
  }

  deduped[0] = { ...deduped[0], time: 0 };
  deduped[deduped.length - 1] = { ...deduped[deduped.length - 1], time: 1 };

  return deduped;
}

export function sanitizeColorCurve(
  keyframes: ColorCurveKeyframe[] | undefined,
  fallbackStart: string,
  fallbackEnd: string
): ColorCurveKeyframe[] {
  if (!keyframes?.length) {
    return createDefaultColorCurve(fallbackStart, fallbackEnd);
  }

  const sorted = sortCurveKeyframes(
    keyframes.map((kf) => ({
      time: clampCurveTime(kf.time),
      value: kf.value
    }))
  );

  const deduped: ColorCurveKeyframe[] = [];
  for (const kf of sorted) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.time - kf.time) < 0.001) {
      deduped[deduped.length - 1] = kf;
    } else {
      deduped.push(kf);
    }
  }

  if (deduped.length === 1) {
    return [
      { time: 0, value: deduped[0].value },
      { time: 1, value: fallbackEnd }
    ];
  }

  deduped[0] = { ...deduped[0], time: 0 };
  deduped[deduped.length - 1] = { ...deduped[deduped.length - 1], time: 1 };

  return deduped;
}
