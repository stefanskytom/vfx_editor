import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ColorCurveKeyframe } from '../types/curves';
import { clampCurveTime, sortCurveKeyframes } from '../types/curves';

interface ColorGradientEditorProps {
  keyframes: ColorCurveKeyframe[];
  onChange: (keyframes: ColorCurveKeyframe[]) => void;
}

const TRACK_W = 280;
const MAX_STOPS = 8;

function buildGradientCss(stops: ColorCurveKeyframe[]): string {
  const sorted = sortCurveKeyframes(stops);
  if (sorted.length === 0) return 'linear-gradient(to right, #ffffff, #000000)';
  const parts = sorted.map((kf) => `${kf.value} ${(kf.time * 100).toFixed(1)}%`);
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

export function ColorGradientEditor({ keyframes, onChange }: ColorGradientEditorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const keyframesRef = useRef(keyframes);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null);

  const sorted = useMemo(() => sortCurveKeyframes(keyframes), [keyframes]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    keyframesRef.current = keyframes;
    if (selectedIndex >= sorted.length) {
      setSelectedIndex(Math.max(0, sorted.length - 1));
    }
  }, [keyframes, selectedIndex, sorted.length]);

  const getTimeFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return clampCurveTime((clientX - rect.left) / rect.width);
  };

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    if (index === 0 || index === sorted.length - 1) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedIndex(index);
    dragRef.current = { index, pointerId: e.pointerId };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const time = getTimeFromClientX(e.clientX);
      const current = sortCurveKeyframes(keyframesRef.current);
      const next = current.map((kf, i) => (i === drag.index ? { ...kf, time } : kf));
      onChangeRef.current(sortCurveKeyframes(next));
    };

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const addStop = () => {
    if (sorted.length >= MAX_STOPS) return;
    const midIndex = Math.floor(sorted.length / 2);
    const left = sorted[midIndex - 1] ?? sorted[0];
    const right = sorted[midIndex] ?? sorted[sorted.length - 1];
    const time = clampCurveTime((left.time + right.time) / 2);
    onChange(sortCurveKeyframes([...sorted, { time, value: left.value }]));
    setSelectedIndex(midIndex);
  };

  const removeSelected = () => {
    if (selectedIndex === 0 || selectedIndex === sorted.length - 1 || sorted.length <= 2) return;
    const next = sorted.filter((_, i) => i !== selectedIndex);
    onChange(next);
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  };

  const updateSelectedColor = (value: string) => {
    const next = sorted.map((kf, i) => (i === selectedIndex ? { ...kf, value } : kf));
    onChange(next);
  };

  const selected = sorted[selectedIndex] ?? sorted[0];

  return (
    <div className="color-gradient-editor">
      <div className="color-gradient-preview" style={{ background: buildGradientCss(sorted) }} />

      <div ref={trackRef} className="color-gradient-track" style={{ width: TRACK_W }}>
        {sorted.map((kf, index) => (
          <button
            key={`${index}-${kf.time.toFixed(3)}-${kf.value}`}
            type="button"
            className={`color-gradient-stop ${selectedIndex === index ? 'active' : ''}`}
            style={{ left: `${kf.time * 100}%`, backgroundColor: kf.value }}
            onClick={() => setSelectedIndex(index)}
            onPointerDown={startDrag(index)}
            title={`${(kf.time * 100).toFixed(0)}% · ${kf.value}`}
          />
        ))}
      </div>

      <div className="color-gradient-tools">
        <button type="button" className="icon-btn compact" onClick={addStop} disabled={sorted.length >= MAX_STOPS}>
          <Plus size={12} />
          Stop
        </button>
        <button
          type="button"
          className="icon-btn compact"
          onClick={removeSelected}
          disabled={selectedIndex === 0 || selectedIndex === sorted.length - 1 || sorted.length <= 2}
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>

      {selected && (
        <div className="color-picker-item">
          <span className="label-text">
            Stop color ({(selected.time * 100).toFixed(0)}%)
          </span>
          <div className="color-swatch-wrapper">
            <input type="color" value={selected.value} onChange={(e) => updateSelectedColor(e.target.value)} />
            <span className="color-hex">{selected.value.toUpperCase()}</span>
          </div>
        </div>
      )}

      <p className="color-gradient-hint">Drag middle stops · add up to {MAX_STOPS} colors</p>
    </div>
  );
}
