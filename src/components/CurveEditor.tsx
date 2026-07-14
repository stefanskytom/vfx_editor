import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurveKeyframe } from '../types/curves';
import { clampCurveTime, sortCurveKeyframes } from '../types/curves';

interface CurveEditorProps {
  label: string;
  keyframes: CurveKeyframe[];
  minValue?: number;
  maxValue?: number;
  onChange: (keyframes: CurveKeyframe[]) => void;
}

const WIDTH = 220;
const HEIGHT = 100;
const PAD = 12;

function valueToY(value: number, min: number, max: number): number {
  const range = max - min || 1;
  return PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2);
}

function yToValue(y: number, min: number, max: number): number {
  const range = max - min || 1;
  return min + (1 - (y - PAD) / (HEIGHT - PAD * 2)) * range;
}

export function CurveEditor({
  label,
  keyframes,
  minValue = 0,
  maxValue = 1,
  onChange
}: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [localKeyframes, setLocalKeyframes] = useState<CurveKeyframe[]>(keyframes);

  useEffect(() => {
    if (dragIndex === null) {
      setLocalKeyframes(keyframes);
    }
  }, [keyframes, dragIndex]);

  const sorted = sortCurveKeyframes(localKeyframes);

  const getLocalCoords = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT
    };
  }, []);

  const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragIndex(index);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null) return;

    const { x, y } = getLocalCoords(e.clientX, e.clientY);
    const time = clampCurveTime((x - PAD) / (WIDTH - PAD * 2));
    const value = Math.min(maxValue, Math.max(minValue, yToValue(y, minValue, maxValue)));

    const isEndpoint = dragIndex === 0 || dragIndex === sorted.length - 1;
    const newTime = isEndpoint ? sorted[dragIndex].time : time;

    const updated = sorted.map((kf, i) =>
      i === dragIndex ? { time: newTime, value } : kf
    );
    setLocalKeyframes(sortCurveKeyframes(updated));
  };

  const handlePointerUp = () => {
    if (dragIndex !== null) {
      setLocalKeyframes((current) => {
        const next = sortCurveKeyframes(current);
        onChange(next);
        return next;
      });
    }
    setDragIndex(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (sorted.length >= 6) return;
    const { x, y } = getLocalCoords(e.clientX, e.clientY);
    const time = clampCurveTime((x - PAD) / (WIDTH - PAD * 2));
    const value = Math.min(maxValue, Math.max(minValue, yToValue(y, minValue, maxValue)));
    onChange(sortCurveKeyframes([...sorted, { time, value }]));
  };

  const handleContextMenu = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (index === 0 || index === sorted.length - 1) return;
    onChange(sorted.filter((_, i) => i !== index));
  };

  const polylinePoints = sorted
    .map((kf) => {
      const x = PAD + kf.time * (WIDTH - PAD * 2);
      const y = valueToY(kf.value, minValue, maxValue);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="curve-editor">
      <div className="curve-editor-header">
        <span className="control-label">{label}</span>
        <span className="curve-editor-hint">dbl-click add · r-click remove</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="curve-editor-svg"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <rect x={PAD} y={PAD} width={WIDTH - PAD * 2} height={HEIGHT - PAD * 2} className="curve-grid-bg" />
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={`v-${t}`}
            x1={PAD + t * (WIDTH - PAD * 2)}
            y1={PAD}
            x2={PAD + t * (WIDTH - PAD * 2)}
            y2={HEIGHT - PAD}
            className="curve-grid-line"
          />
        ))}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={`h-${t}`}
            x1={PAD}
            y1={PAD + t * (HEIGHT - PAD * 2)}
            x2={WIDTH - PAD}
            y2={PAD + t * (HEIGHT - PAD * 2)}
            className="curve-grid-line"
          />
        ))}
        <polyline points={polylinePoints} className="curve-line" />
        {sorted.map((kf, index) => {
          const x = PAD + kf.time * (WIDTH - PAD * 2);
          const y = valueToY(kf.value, minValue, maxValue);
          return (
            <circle
              key={`${index}-${kf.time.toFixed(3)}`}
              cx={x}
              cy={y}
              r={5}
              className="curve-handle"
              onPointerDown={handlePointerDown(index)}
              onContextMenu={handleContextMenu(index)}
            />
          );
        })}
      </svg>
    </div>
  );
}
