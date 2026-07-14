export const EASING_OPTIONS = [
  { id: 'linear', label: 'Linear' },
  { id: 'easeIn', label: 'Ease In' },
  { id: 'easeOut', label: 'Ease Out' },
  { id: 'easeInOut', label: 'Ease In-Out' },
  { id: 'easeInQuad', label: 'Quad In' },
  { id: 'easeOutQuad', label: 'Quad Out' },
  { id: 'easeInOutQuad', label: 'Quad In-Out' },
  { id: 'easeInCubic', label: 'Cubic In' },
  { id: 'easeOutCubic', label: 'Cubic Out' },
  { id: 'easeInOutCubic', label: 'Cubic In-Out' },
  { id: 'bounceOut', label: 'Bounce Out' },
  { id: 'elasticOut', label: 'Elastic Out' }
] as const;

export type EasingType = (typeof EASING_OPTIONS)[number]['id'];

export type SimpleEaseFn = (time: number) => number;

export function getEasingFunction(type: EasingType): SimpleEaseFn {
  switch (type) {
    case 'linear':
      return (t) => t;
    case 'easeIn':
      return (t) => t * t;
    case 'easeOut':
      return (t) => t * (2 - t);
    case 'easeInOut':
      return (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    case 'easeInQuad':
      return (t) => t * t;
    case 'easeOutQuad':
      return (t) => t * (2 - t);
    case 'easeInOutQuad':
      return (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    case 'easeInCubic':
      return (t) => t * t * t;
    case 'easeOutCubic':
      return (t) => --t * t * t + 1;
    case 'easeInOutCubic':
      return (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);
    case 'bounceOut': {
      const n1 = 7.5625;
      const d1 = 2.75;
      return (t) => {
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      };
    }
    case 'elasticOut': {
      const c4 = (2 * Math.PI) / 3;
      return (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1);
    }
    default:
      return (t) => t;
  }
}

export function getEasingLabel(type: EasingType): string {
  return EASING_OPTIONS.find((o) => o.id === type)?.label ?? type;
}
