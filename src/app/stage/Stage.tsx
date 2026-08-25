// Stage: hosts the StageEngine, handles direct manipulation (FR-8).
// Drag rotates the head and pauses playback; Escape undoes that drag.
//
// Layout follows docs/05 §1: a radial backdrop, the render centered on it, a
// status pill top-left and the transport dock along the bottom. The engine
// writes SVG straight into its own host element, so every overlay is a
// sibling of that host — never a child, which innerHTML would wipe each frame.
import { useEffect, useRef, useState } from "react";
import { StageEngine, type StageMode } from "./StageEngine";
import type { Bubble, Kit } from "../../domain/document/types";
import type { MoodSample } from "../../domain/playback/LoopPlayer";
import type { MessageKey } from "../i18n";
import { RangeInput } from "../studio/ui";

export interface StageProps {
  bubble: Bubble;
  kit: Kit;
  loopId: string | null;
  mode: StageMode;
  /** Mood held on the stage while it is being picked or edited (FR-4.4). */
  preview: MoodSample | null;
  t: (k: MessageKey) => string;
  onPause: () => void;
  onPlay: (loopId: string) => void;
  onStop: () => void;
  onSelectLoop: (loopId: string) => void;
}

export function Stage({
  bubble,
  kit,
  loopId,
  mode,
  preview,
  t,
  onPause,
  onPlay,
  onStop,
  onSelectLoop,
}: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const [head, setHead] = useState({ x: 0, y: 0, z: 0 });
  const dragRef = useRef<{
    px: number;
    py: number;
    sx: number;
    sy: number;
  } | null>(null);
  // FR-8.3: Esc is a single-level undo of the drag, so what it restores is the
  // pose held when the last drag began — not the resting pose. Kept in a ref
  // and outside dragRef, which is cleared on pointerup.
  const preDragRef = useRef({ x: 0, y: 0, z: 0 });
  // FR-8.2 / FR-8.4: the rotation pad and the projection guide, both off until
  // asked for. Overlays live beside the engine host, never inside it.
  const [gizmo, setGizmo] = useState(false);
  const [guide, setGuide] = useState(false);
  // The wireframe also comes up for the length of a drag, which is when a
  // character most needs to say it is a solid rather than a picture of one.
  // Kept separate from the toggle so a drag never switches off something the
  // user asked for.
  const [dragging, setDragging] = useState(false);
  const showGuide = guide || dragging;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = new StageEngine(host, {
      bubble,
      kit,
      loopId,
      mode,
      headRotation: head,
      preview,
      guide: showGuide,
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
      mode,
      headRotation: head,
      preview,
      guide: showGuide,
    });
  }, [bubble, kit, loopId, mode, head, preview, showGuide]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { px: e.clientX, py: e.clientY, sx: head.x, sy: head.y };
    setDragging(true);
    preDragRef.current = head;
    // Optional chain: jsdom and older embedders lack pointer capture.
    (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
      e.pointerId,
    );
    if (mode === "playing") onPause(); // direct manipulation pauses playback (FR-8)
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
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setHead(preDragRef.current); // Esc-undo (FR-8.3)
  };

  // The transport acts on the loop the dock names; without loops there is
  // nothing to drive, so the dock stays away entirely (FR-5.2).
  const selected = kit.loops.find((l) => l.id === loopId) ?? kit.loops.at(0);
  const playing = mode === "playing";

  return (
    <div className="relative h-full w-full overflow-hidden bg-stage">
      {/* Soft indigo pool behind the character (docs/05 §1). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_38%,var(--color-stage-glow)_0%,transparent_62%)] opacity-95"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_45%_at_50%_92%,rgb(0_0_0/0.55)_0%,transparent_70%)]"
      />

      <div
        ref={hostRef}
        className="relative grid h-full w-full cursor-grab touch-none place-items-center text-accent outline-none [&>svg]:h-auto [&>svg]:max-h-[min(80%,32rem)] [&>svg]:w-auto [&>svg]:max-w-[min(80%,32rem)] active:cursor-grabbing"
        role="img"
        aria-label="bubble stage"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      />

      <div className="absolute top-4 right-4 flex items-center gap-1">
        <OverlayToggle
          label={t("stage.guide")}
          pressed={guide}
          onClick={() => {
            setGuide((v) => !v);
          }}
        >
          <GuideIcon />
        </OverlayToggle>
        <OverlayToggle
          label={t("stage.gizmo")}
          pressed={gizmo}
          onClick={() => {
            setGizmo((v) => !v);
          }}
        >
          <GizmoIcon />
        </OverlayToggle>
      </div>

      {gizmo && (
        <div
          role="group"
          aria-label={t("stage.gizmo")}
          className="absolute top-16 right-4 w-52 space-y-2 rounded-card border border-line bg-panel/90 p-3 shadow-dock backdrop-blur-md"
        >
          {AXES.map((a) => (
            <label key={a.axis} className="block text-xs">
              <span className="flex justify-between text-ink-dim">
                {t(a.label)}
                <span className="tabular-nums text-ink">
                  {String(Math.round(head[a.axis]))}°
                </span>
              </span>
              <RangeInput
                label={t(a.label)}
                value={head[a.axis]}
                min={-180}
                max={180}
                step={1}
                onChange={(v) => {
                  // Posing by hand owns the live state, same as a drag (FR-8.3).
                  if (mode === "playing") onPause();
                  preDragRef.current = head;
                  setHead((h) => ({ ...h, [a.axis]: v }));
                }}
                className="mt-1 w-full"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              preDragRef.current = head;
              setHead({ x: 0, y: 0, z: 0 });
            }}
            className="w-full rounded-field bg-panel-2 px-2 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
          >
            {t("common.reset")}
          </button>
        </div>
      )}

      <StatusPill
        mode={mode}
        loopName={
          playing || mode === "paused" ? (selected?.name ?? null) : null
        }
        t={t}
      />

      {selected && (
        <div
          role="group"
          aria-label={t("stage.transport")}
          className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-panel/85 p-1.5 shadow-dock backdrop-blur-md"
        >
          <TransportButton
            label={playing ? t("common.pause") : t("common.play")}
            primary
            onClick={() => {
              if (playing) onPause();
              else onPlay(selected.id);
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </TransportButton>
          <TransportButton
            label={t("common.stop")}
            disabled={mode === "stopped"}
            onClick={onStop}
          >
            <StopIcon />
          </TransportButton>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
          <select
            value={selected.id}
            onChange={(e) => {
              onSelectLoop(e.target.value);
            }}
            aria-label={t("stage.loop")}
            className="mr-1 max-w-36 truncate rounded-full bg-panel-2 px-3 py-1.5 text-xs text-ink"
          >
            {kit.loops.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** FR-8.2: the three axes the gizmo drives, in the order the pad shows them. */
const AXES: { axis: "x" | "y" | "z"; label: MessageKey }[] = [
  { axis: "x", label: "common.rotationX" },
  { axis: "y", label: "common.rotationY" },
  { axis: "z", label: "common.rotationZ" },
];

/** Stage-chrome toggle: pressed state is announced, not only painted. */
function OverlayToggle({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-full border border-line backdrop-blur-md transition-colors duration-150 ease-out ${
        pressed
          ? "bg-primary text-white"
          : "bg-panel/80 text-ink-dim hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function GizmoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <ellipse
        cx="8"
        cy="8"
        rx="2.4"
        ry="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray="2 1.6"
      />
      <path d="M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * docs/05 §3: the pill pairs a dot with words, so the transport state never
 * rests on colour alone.
 */
function StatusPill({
  mode,
  loopName,
  t,
}: {
  mode: StageMode;
  loopName: string | null;
  t: (k: MessageKey) => string;
}) {
  const label =
    mode === "playing"
      ? t("stage.playing")
      : mode === "paused"
        ? t("stage.paused")
        : t("stage.resting");
  const dot =
    mode === "playing"
      ? "bg-accent"
      : mode === "paused"
        ? "bg-ink-dim"
        : "bg-brand";
  return (
    <div
      role="status"
      className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-line bg-panel/80 py-1.5 pr-3.5 pl-3 text-xs text-ink backdrop-blur-md"
    >
      <span
        aria-hidden="true"
        data-testid="status-dot"
        className={`h-2 w-2 rounded-full ${dot} ${mode === "playing" ? "animate-pulse" : ""}`}
      />
      <span>{label}</span>
      {loopName !== null && (
        <>
          <span aria-hidden="true" className="text-ink-dim">
            ·
          </span>
          <span className="max-w-28 truncate text-ink-dim">{loopName}</span>
        </>
      )}
    </div>
  );
}

function TransportButton({
  label,
  onClick,
  children,
  primary = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-150 ease-out disabled:opacity-35 ${
        primary
          ? "bg-primary text-white hover:bg-primary-hi disabled:hover:bg-primary"
          : "text-ink hover:bg-white/10 disabled:hover:bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4.5 2.8 13 8l-8.5 5.2z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
