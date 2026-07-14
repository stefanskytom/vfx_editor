import { useEffect, useRef } from 'react';
import type { BackgroundTransform } from '../types/backgroundTransform';

type HandleId = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface BackgroundTransformBoxProps {
  imageUrl: string;
  transform: BackgroundTransform;
  onChange: (transform: BackgroundTransform) => void;
}

const MIN_SIZE = 24;

export function BackgroundTransformBox({
  imageUrl,
  transform,
  onChange
}: BackgroundTransformBoxProps) {
  const transformRef = useRef(transform);
  const onChangeRef = useRef(onChange);
  const dragRef = useRef<{
    handle: HandleId;
    pointerId: number;
    startX: number;
    startY: number;
    startTransform: BackgroundTransform;
  } | null>(null);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const startDrag = (handle: HandleId) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTransform: transformRef.current
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const start = drag.startTransform;
      const aspect = start.width / start.height || 1;

      let next: BackgroundTransform = { ...start };

      if (drag.handle === 'move') {
        next = {
          ...start,
          x: start.x + dx,
          y: start.y + dy
        };
      } else if (drag.handle === 'se') {
        const newWidth = Math.max(MIN_SIZE, start.width + dx);
        const newHeight = newWidth / aspect;
        next = { x: start.x, y: start.y, width: newWidth, height: newHeight };
      } else if (drag.handle === 'sw') {
        const newWidth = Math.max(MIN_SIZE, start.width - dx);
        const newHeight = newWidth / aspect;
        next = {
          x: start.x + start.width - newWidth,
          y: start.y,
          width: newWidth,
          height: newHeight
        };
      } else if (drag.handle === 'ne') {
        const newWidth = Math.max(MIN_SIZE, start.width + dx);
        const newHeight = newWidth / aspect;
        next = {
          x: start.x,
          y: start.y + start.height - newHeight,
          width: newWidth,
          height: newHeight
        };
      } else if (drag.handle === 'nw') {
        const newWidth = Math.max(MIN_SIZE, start.width - dx);
        const newHeight = newWidth / aspect;
        next = {
          x: start.x + start.width - newWidth,
          y: start.y + start.height - newHeight,
          width: newWidth,
          height: newHeight
        };
      }

      onChangeRef.current(next);
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

  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className="bg-custom-image"
        draggable={false}
        style={{
          left: transform.x,
          top: transform.y,
          width: transform.width,
          height: transform.height
        }}
      />

      <div
        className="bg-transform-box"
        style={{
          left: transform.x,
          top: transform.y,
          width: transform.width,
          height: transform.height
        }}
        onPointerDown={startDrag('move')}
      >
        <div className="bg-transform-label">Background</div>
        {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
          <div
            key={handle}
            className={`bg-transform-handle bg-transform-handle-${handle}`}
            onPointerDown={startDrag(handle)}
          />
        ))}
      </div>
    </>
  );
}
