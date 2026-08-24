// Stage: hosts the StageEngine, handles direct manipulation (FR-8).
// Drag rotates the head and pauses playback; Escape restores.
import { useEffect, useRef, useState } from "react";
import { StageEngine } from "./StageEngine";
import type { Bubble, Kit } from "../../domain/document/types";

export interface StageProps {
  bubble: Bubble;
  kit: Kit;
  loopId: string | null;
  playing: boolean;
  onPause: () => void;
}

export function Stage({ bubble, kit, loopId, playing, onPause }: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const [head, setHead] = useState({ x: 0, y: 0, z: 0 });
  const dragRef = useRef<{
    px: number;
    py: number;
    sx: number;
    sy: number;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = new StageEngine(host, {
      bubble,
      kit,
      loopId,
      playing,
      headRotation: head,
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.update({
      bubble,
      kit,
      loopId,
      playing,
      headRotation: head,
    });
  }, [bubble, kit, loopId, playing, head]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { px: e.clientX, py: e.clientY, sx: head.x, sy: head.y };
    // Optional chain: jsdom and older embedders lack pointer capture.
    (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
      e.pointerId,
    );
    if (playing) onPause(); // direct manipulation pauses playback (FR-8)
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    setHead((h) => ({
      ...h,
      x: clamp(d.sx + dx * 0.2, -60, 60),
      y: clamp(d.sy + dy * 0.2, -60, 60),
    }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setHead({ x: 0, y: 0, z: 0 }); // Esc-undo (FR-8)
  };

  return (
    <div
      ref={hostRef}
      className="h-full w-full cursor-grab touch-none outline-none active:cursor-grabbing"
      role="img"
      aria-label="bubble stage"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
