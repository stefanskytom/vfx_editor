import { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, Plus, Trash2 } from 'lucide-react';
import type { SceneTimeline, TimelineKeyframe } from '../utils/timeline';
import { createKeyframe, snapTimeToBeat, sortTimelineKeyframes } from '../utils/timeline';

interface TimelineEditorProps {
  timeline: SceneTimeline;
  sceneTime: number;
  isPlaying: boolean;
  onChange: (timeline: SceneTimeline) => void;
  onPlayToggle: () => void;
  onSceneTimeChange: (time: number) => void;
}

const TRACK_W = 520;
const TRACK_H = 56;

function clampTimeRatio(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function TimelineEditor({
  timeline,
  sceneTime,
  isPlaying,
  onChange,
  onPlayToggle,
  onSceneTimeChange
}: TimelineEditorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef(timeline);
  const onChangeRef = useRef(onChange);
  const dragRef = useRef<{ kind: 'keyframe' | 'playhead'; keyframeId?: string; pointerId: number } | null>(null);
  const [draggingKeyframeId, setDraggingKeyframeId] = useState<string | null>(null);

  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const getTimeRatioFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;

    let ratio = (clientX - rect.left) / rect.width;
    ratio = clampTimeRatio(ratio);

    const currentTimeline = timelineRef.current;
    if (currentTimeline.snapToBeat) {
      const elapsed = ratio * currentTimeline.duration;
      const snapped = snapTimeToBeat(elapsed, currentTimeline.bpm, currentTimeline.duration);
      ratio = currentTimeline.duration > 0 ? snapped / currentTimeline.duration : 0;
    }

    return ratio;
  }, []);

  const updateTimeline = (patch: Partial<SceneTimeline>) => {
    onChange({ ...timeline, ...patch });
  };

  const updateKeyframe = (id: string, patch: Partial<TimelineKeyframe>) => {
    const keyframes = timeline.keyframes.map((kf) => (kf.id === id ? { ...kf, ...patch } : kf));
    onChange({ ...timeline, keyframes });
  };

  const addKeyframe = () => {
    if (timeline.keyframes.length >= 8) return;
    const time = timeline.duration > 0 ? (sceneTime % timeline.duration) / timeline.duration : 0.5;
    onChange({
      ...timeline,
      keyframes: sortTimelineKeyframes([
        ...timeline.keyframes,
        createKeyframe({ time })
      ])
    });
  };

  const removeKeyframe = (id: string) => {
    if (timeline.keyframes.length <= 2) return;
    onChange({
      ...timeline,
      keyframes: timeline.keyframes.filter((kf) => kf.id !== id)
    });
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (dragRef.current || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.timeline-keyframe')) return;

    const ratio = getTimeRatioFromClientX(e.clientX);
    onSceneTimeChange(ratio * timeline.duration);
    dragRef.current = { kind: 'playhead', pointerId: e.pointerId };
    trackRef.current?.setPointerCapture(e.pointerId);
  };

  const handleKeyframePointerDown = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.timeline-kf-delete')) return;

    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { kind: 'keyframe', keyframeId: id, pointerId: e.pointerId };
    setDraggingKeyframeId(id);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const ratio = getTimeRatioFromClientX(e.clientX);
      const currentTimeline = timelineRef.current;

      if (drag.kind === 'playhead') {
        onSceneTimeChange(ratio * currentTimeline.duration);
        return;
      }

      if (drag.kind === 'keyframe' && drag.keyframeId) {
        const keyframes = currentTimeline.keyframes.map((kf) =>
          kf.id === drag.keyframeId ? { ...kf, time: ratio } : kf
        );
        onChangeRef.current({ ...currentTimeline, keyframes });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      if (drag.kind === 'keyframe') {
        onChangeRef.current({
          ...timelineRef.current,
          keyframes: sortTimelineKeyframes(timelineRef.current.keyframes)
        });
      }

      dragRef.current = null;
      setDraggingKeyframeId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [getTimeRatioFromClientX, onSceneTimeChange]);

  const playheadX = timeline.duration > 0 ? (sceneTime / timeline.duration) * 100 : 0;

  return (
    <div className="timeline-editor">
      <div className="timeline-toolbar">
        <button type="button" className="icon-btn compact" onClick={onPlayToggle}>
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div className="timeline-meta">
          <label>
            Duration
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.1}
              value={timeline.duration}
              onChange={(e) => updateTimeline({ duration: parseFloat(e.target.value) || 2 })}
            />
            s
          </label>
          <label>
            <Music2 size={12} />
            BPM
            <input
              type="number"
              min={60}
              max={200}
              step={1}
              value={timeline.bpm}
              onChange={(e) => updateTimeline({ bpm: parseInt(e.target.value) || 120 })}
            />
          </label>
          <label className="toggle-container compact">
            <input
              type="checkbox"
              checked={timeline.snapToBeat}
              onChange={(e) => updateTimeline({ snapToBeat: e.target.checked })}
            />
            <span className="toggle-label">Snap to beat</span>
          </label>
        </div>

        <button type="button" className="icon-btn compact" onClick={addKeyframe}>
          <Plus size={12} />
          Keyframe
        </button>
      </div>

      <div
        ref={trackRef}
        className="timeline-track"
        style={{ width: TRACK_W, height: TRACK_H }}
        onPointerDown={handleTrackPointerDown}
      >
        {timeline.snapToBeat &&
          Array.from({ length: Math.ceil((timeline.duration * timeline.bpm) / 60) + 1 }).map((_, i) => {
            const beatTime = (i * 60) / timeline.bpm;
            if (beatTime > timeline.duration) return null;
            const x = (beatTime / timeline.duration) * 100;
            return (
              <div
                key={`beat-${i}`}
                className="timeline-beat"
                style={{ left: `${x}%` }}
              />
            );
          })}

        {timeline.keyframes.map((kf) => (
          <div
            key={kf.id}
            className={`timeline-keyframe ${draggingKeyframeId === kf.id ? 'dragging' : ''}`}
            style={{ left: `${kf.time * 100}%`, bottom: `${kf.intensity * 80 + 8}%` }}
            onPointerDown={handleKeyframePointerDown(kf.id)}
            title={`t=${(kf.time * timeline.duration).toFixed(2)}s · intensity ${(kf.intensity * 100).toFixed(0)}% · drag horizontally`}
          >
            <button
              type="button"
              className="timeline-kf-delete"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                removeKeyframe(kf.id);
              }}
            >
              <Trash2 size={8} />
            </button>
          </div>
        ))}

        <div
          className="timeline-playhead"
          style={{ left: `${playheadX}%` }}
          title="Drag track to scrub"
        />
      </div>

      {timeline.keyframes.length > 0 && (
        <div className="timeline-kf-editor">
          {sortTimelineKeyframes(timeline.keyframes).map((kf) => (
            <div key={`edit-${kf.id}`} className="timeline-kf-row">
              <span className="timeline-kf-time">{(kf.time * timeline.duration).toFixed(2)}s</span>
              <label>
                Time
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={timeline.snapToBeat ? 0.001 : 0.01}
                  value={kf.time}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    updateKeyframe(kf.id, { time });
                  }}
                  onPointerUp={() =>
                    onChange({ ...timeline, keyframes: sortTimelineKeyframes(timeline.keyframes) })
                  }
                />
              </label>
              <label>
                Spawn ×
                <input
                  type="range"
                  min={0.1}
                  max={4}
                  step={0.1}
                  value={kf.spawnSpeedMult}
                  onChange={(e) => updateKeyframe(kf.id, { spawnSpeedMult: parseFloat(e.target.value) })}
                />
              </label>
              <label>
                Intensity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={kf.intensity}
                  onChange={(e) => updateKeyframe(kf.id, { intensity: parseFloat(e.target.value) })}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
