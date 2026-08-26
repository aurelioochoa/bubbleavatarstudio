// Stage: hosts the StageEngine, handles direct manipulation (FR-8).
// Drag rotates the head and pauses playback; Escape undoes that drag.
//
// Layout follows docs/05 §1: a radial backdrop, the render centered on it and
// a status pill top-left. The transport used to float here as a dock; it is a
// full-width track below the whole shell now (FR-6.6), which is what gives the
// character this much room. The engine writes SVG straight into its own host
// element, so every overlay is a sibling of that host — never a child, which
// innerHTML would wipe each frame.
import { useEffect, useRef, useState } from "react";
import { StageEngine, type StageMode } from "./StageEngine";
import type { Bubble, Kit } from "../../domain/document/types";
import type { MoodSample } from "../../domain/playback/LoopPlayer";
import type { MessageKey } from "../i18n";
import type { StageClock } from "./clock";
import { RangeInput } from "../studio/ui";

export interface StageProps {
  bubble: Bubble;
  kit: Kit;
  loopId: string | null;
  mode: StageMode;
  /** Mood held on the stage while it is being picked or edited (FR-4.4). */
  preview: MoodSample | null;
  t: (k: MessageKey) => string;
  /** Handed to the engine, which publishes elapsed time for the track. */
  clock?: StageClock | undefined;
  /**
   * The head's pose (FR-8.1). Owned above rather than here because it is part
   * of "the current stage" that a snapshot captures (FR-10.1) — the Share
   * panel draws the same pose this does, and a pose the panel cannot see is a
   * pose the download quietly leaves out.
   */
  head: { x: number; y: number; z: number };
  onHead: (next: { x: number; y: number; z: number }) => void;
  /**
   * How big the character is drawn here, as a factor on the fit-to-column
   * size. View state and nothing else: a snapshot, the ZIP and the runtime
   * never see it. It is a prop for the same reason the pose is — the Share
   * panel's export frame is portalled onto this column and reads the same
   * factor, so it has to be owned above both (FR-10.6).
   */
  zoom: number;
  onZoom: (next: number) => void;
  onPause: () => void;
}

/** The zoom the stage opens at, and the range its control offers. */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;

/**
 * Degrees of head rotation per pixel of pointer travel.
 *
 * Measured off the reference application by hand, driving it as a user and
 * reading the rotation its own pose panel reports: 100px of travel moved the
 * yaw 29 degrees and 200px moved it 58, so the rate is flat at a shade under
 * 0.3 and this rounds it. See docs/LEGACY-DOCS.md, black-box notes.
 */
const DRAG_DEG_PER_PX = 0.3;

export function Stage({
  bubble,
  kit,
  loopId,
  mode,
  preview,
  t,
  clock,
  head,
  onHead,
  zoom,
  onZoom,
  onPause,
}: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
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
  /** Whether this session has turned the head yet; retires the hint below. */
  const [everDragged, setEverDragged] = useState(false);
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
      clock,
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
      clock,
    });
  }, [bubble, kit, loopId, mode, head, preview, showGuide, clock]);

  const onPointerDown = (e: React.PointerEvent) => {
    // sx/sy seed the pitch and the yaw from where this drag starts, so each
    // axis continues from its own value rather than from the resting pose.
    dragRef.current = { px: e.clientX, py: e.clientY, sx: head.x, sy: head.y };
    setDragging(true);
    setEverDragged(true);
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
    // The pointer axes are not the rotation axes: `rotation.y` is the yaw and
    // `rotation.x` the pitch (projection.ts). So the horizontal travel drives
    // the yaw, and the vertical drives the pitch — mapping dx onto the pitch
    // made dragging right tip the character upward instead of turning it.
    //
    // Signs follow the projection's own conventions, so the character goes
    // where the pointer goes: a positive yaw turns it toward the viewer's
    // right, and a positive pitch lifts the face while screen y runs downward,
    // which is why the pitch takes the drag with its sign flipped.
    onHead({
      ...head,
      x: wrapDeg(d.sx - dy * DRAG_DEG_PER_PX),
      y: wrapDeg(d.sy + dx * DRAG_DEG_PER_PX),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onHead(preDragRef.current); // Esc-undo (FR-8.3)
  };

  // The pill names the loop on the stage, which is the selection the track
  // owns; the stage itself no longer drives playback (FR-6.6).
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
        className="relative grid h-full w-full cursor-grab touch-none place-items-center text-accent outline-none [&>svg]:aspect-square [&>svg]:h-[calc(min(94%,40rem)*var(--stage-zoom,1))] [&>svg]:w-auto [&>svg]:max-w-[calc(94%*var(--stage-zoom,1))] active:cursor-grabbing"
        role="img"
        aria-label="bubble stage"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      />

      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* FR-8.2: what the head is doing, in the numbers the gizmo sets — so
            a pose can be read without opening the pad that authored it. */}
        <div
          role="group"
          aria-label={t("stage.orientation")}
          className="flex h-7 items-center gap-2.5 rounded-full border border-line bg-panel/80 px-3 text-[10.5px] tabular-nums text-ink-dim backdrop-blur-md"
        >
          {AXES.map((a) => (
            <span key={a.axis}>
              {a.axis.toUpperCase()}{" "}
              <span data-testid={`readout-${a.axis}`} className="text-ink">
                {Math.round(head[a.axis])}°
              </span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
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
          {/* The pad's own reset, lifted beside it: undoing a pose is the thing
            most often wanted right after setting one, and reaching it should
            not mean opening the pad again. */}
          <button
            type="button"
            aria-label={t("common.reset")}
            title={t("common.reset")}
            onClick={() => {
              preDragRef.current = head;
              onHead({ x: 0, y: 0, z: 0 });
            }}
            className="grid h-7.5 w-7.5 place-items-center rounded-full border border-line bg-panel/80 text-ink-dim backdrop-blur-md transition-colors duration-150 ease-out hover:text-ink"
          >
            <ResetIcon />
          </button>
        </div>
      </div>

      {/* Bottom-right, out of the way of the pose readout above and the drag
          hint below. A sibling of the engine host like every other overlay:
          a child would be gone on the next frame. */}
      <div className="absolute right-4 bottom-4 flex h-7 items-center gap-2 rounded-full border border-line bg-panel/80 pr-1.5 pl-3 text-[10.5px] text-ink-dim backdrop-blur-md">
        <span>{t("stage.zoom")}</span>
        <RangeInput
          label={t("stage.zoomSlider")}
          value={Math.round(zoom * 100)}
          min={ZOOM_MIN * 100}
          max={ZOOM_MAX * 100}
          step={5}
          onChange={(v) => {
            onZoom(v / 100);
          }}
          className="w-24"
        />
        <input
          type="number"
          aria-label={t("stage.zoom")}
          value={Math.round(zoom * 100)}
          min={ZOOM_MIN * 100}
          max={ZOOM_MAX * 100}
          step={5}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0) onZoom(v / 100);
          }}
          className="w-11 rounded-full bg-panel-2 px-1.5 py-0.5 text-right text-ink tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <span className="pr-1">%</span>
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
                  onHead({ ...head, [a.axis]: v });
                }}
                className="mt-1 w-full"
              />
            </label>
          ))}
        </div>
      )}

      {/* An affordance hint, so it goes once the affordance has been used. */}
      {!everDragged && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[10.5px] text-ink-dim opacity-70">
          <DragIcon />
          {t("stage.dragHint")}
        </p>
      )}

      <StatusPill
        mode={mode}
        loopName={
          playing || mode === "paused" ? (selected?.name ?? null) : null
        }
        t={t}
      />
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

function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M16.2 8.4A6.6 6.6 0 1 0 16.6 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M16.6 4.4v4.2h-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DragIcon() {
  return (
    <svg viewBox="0 0 20 14" className="h-3 w-4" aria-hidden="true">
      <path
        d="M4.4 3.2 1.6 7l2.8 3.8M15.6 3.2 18.4 7l-2.8 3.8M6.6 7h6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      data-testid="stage-status"
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

/**
 * Folds an angle into the ±180 the gizmo's own sliders span.
 *
 * A drag used to stop dead at ±60 and hand the rest of the turn to the gizmo,
 * which is most of what made it feel unresponsive: past a 200px gesture the
 * character stopped following the pointer while the pointer kept going. It now
 * reaches the whole turn, and wrapping rather than clamping at the far end is
 * what keeps a long gesture spinning instead of running into a second wall —
 * the pose stays inside the range the gizmo can display either way.
 */
function wrapDeg(v: number): number {
  const folded = (((v + 180) % 360) + 360) % 360;
  return folded - 180;
}
