// Stage: hosts the StageEngine, handles direct manipulation (FR-8).
// Drag rotates the head and pauses playback; Escape undoes that drag.
//
// Layout follows docs/05 §1: a radial backdrop, the render centered on it and
// a status pill top-left. The transport used to float here as a dock; it is a
// full-width track below the whole shell now (FR-6.6), which is what gives the
// character this much room. The engine writes SVG straight into its own host
// element, so every overlay is a sibling of that host — never a child, which
// innerHTML would wipe each frame.
import { useCallback, useEffect, useRef, useState } from "react";
import { StageEngine, type StageMode } from "./StageEngine";
import type { Bubble, Kit } from "../../domain/document/types";
import type { MoodSample } from "../../domain/playback/LoopPlayer";
import type { MessageKey } from "../i18n";
import type { StageClock } from "./clock";
import { RangeInput } from "../studio/ui";
import { wrapDeg } from "../../domain/geometry/angles";
import { followGaze, followTarget } from "../../domain/geometry/follow";
import { triadSvg } from "../../render/axes";

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
  // FR-8.6: while on, the character turns to face the pointer anywhere in the
  // window. The aim is a ref rather than state — it changes on every pointer
  // event and only the engine reads it, so putting it in state would re-render
  // the tree for a value React does not draw (FR-11.2).
  const [follow, setFollow] = useState(false);
  // FR-8.6: how pronounced the turn is, as a percentage of the full reach.
  // Only the aim reads it, and the aim is rebuilt on every pointer event, so
  // changing it takes effect on the next move without touching the engine.
  const [intensity, setIntensity] = useState(100);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  // The gaze is measured against the eye it moves, and the pointer listener
  // must not be rebuilt every time the character is edited — so the bubble
  // reaches it the same way the intensity does.
  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  // FR-8.7: the corner triad, off until asked for like every other overlay.
  const [axes, setAxes] = useState(false);
  const triadRef = useRef<HTMLDivElement>(null);
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  // FR-8.6: the eyes' half of the same gesture, written by the same handler
  // and read by the engine the same way. Kept apart from the aim because the
  // two are eased at different rates — eyes arrive first, the head follows.
  const gazeRef = useRef<{ x: number; y: number } | null>(null);
  // FR-11.2: the pose moves every frame while following, and these three
  // numbers move with it. React renders them once from the prop; after that
  // the clock subscription below writes the text by hand, the same way the
  // track's playhead is driven.
  // Read by the engine once a frame. Stable, so it never rebuilds the effect,
  // and a function so the engine sees the ref's current value rather than the
  // one React last rendered.
  const readAim = useCallback(() => aimRef.current, []);
  const readGaze = useCallback(() => gazeRef.current, []);
  const readoutRefs = {
    x: useRef<HTMLSpanElement>(null),
    y: useRef<HTMLSpanElement>(null),
    z: useRef<HTMLSpanElement>(null),
  };
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

  // FR-8.7 / FR-11.2: the triad is redrawn from the frame, not from a render.
  // It reads the same pose the readout does and for the same reason — a
  // follow moves it sixty times a second.
  useEffect(() => {
    const paint = (rot: { x: number; y: number; z: number }) => {
      const node = triadRef.current;
      if (!node) return;
      const next = triadSvg(rot, { colors: TRIAD_COLORS });
      // Byte-identical output means nothing to repaint, the same check the
      // engine makes before writing its own SVG.
      if (node.innerHTML !== next) node.innerHTML = next;
    };
    if (!axes) return;
    paint(clock?.last()?.head ?? head);
    if (!clock) return;
    return clock.subscribe((frame) => {
      paint(frame.head);
    });
    // `head` seeds the first paint only; after that the clock drives it, which
    // is the whole point — a follow moves the pose faster than React renders.
  }, [axes, clock]);

  useEffect(() => {
    if (!clock) return;
    return clock.subscribe((frame) => {
      for (const axis of ["x", "y", "z"] as const) {
        const node = readoutRefs[axis].current;
        if (!node) continue;
        const next = `${String(Math.round(frame.head[axis]))}°`;
        // Compared before writing: an unchanged readout is the common case on
        // a still stage, and skipping the write keeps it off the paint path.
        if (node.textContent !== next) node.textContent = next;
      }
    });
    // Only the clock belongs here: the ref objects are recreated each render
    // but the nodes they point at live as long as the component does, so the
    // subscription never needs rebuilding on their account.
  }, [clock]);

  useEffect(() => {
    if (!follow) {
      aimRef.current = null;
      gazeRef.current = null;
      return;
    }
    const onMove = (e: PointerEvent) => {
      const host = hostRef.current;
      if (!host) return;
      const box = host.getBoundingClientRect();
      // Measured against the stage's own centre, but listening on the window:
      // the character should look at the pointer wherever it is on screen, not
      // only while it is over the stage.
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      // Half the stage's diagonal: the corners of the stage are where the
      // turn saturates, which keeps the reach proportional to the room the
      // character actually has rather than to the size of the monitor.
      const reach = Math.hypot(box.width, box.height) / 2;
      aimRef.current = followTarget({
        dx,
        dy,
        reach,
        limits: scaleLimits(intensityRef.current),
      });
      // Same offset, same reach: the eyes and the head saturate together, so
      // the two halves of the look never disagree about where the cursor is.
      gazeRef.current = followGaze({
        dx,
        dy,
        reach,
        range: gazeRange(bubbleRef.current, intensityRef.current),
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, [follow]);

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
      follow,
      aim: readAim,
      gaze: readGaze,
      onFollowEnd: onHead,
    });
  }, [
    bubble,
    kit,
    loopId,
    mode,
    head,
    preview,
    showGuide,
    clock,
    follow,
    onHead,
  ]);

  const onPointerDown = (e: React.PointerEvent) => {
    // sx/sy seed the pitch and the yaw from where this drag starts, so each
    // axis continues from its own value rather than from the resting pose.
    // Direct manipulation wins (FR-8.1): grabbing the character takes it back
    // from the cursor rather than fighting the follow for the same pose.
    setFollow(false);
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
    /* `@container`: the overlays below are laid out in this column, not in the
       window, and a drawer opening beside the stage narrows it without the
       viewport changing at all. Keyed on the viewport they collided at 820px
       with the tablet inspector open — same defect as at 390px, different
       width, which is what says the lever was the wrong one. */
    <div className="@container relative h-full w-full overflow-hidden bg-stage">
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
          /* FR-12.1: in a narrow column the readout and the status pill share
             a line they cannot both fit on, and the readout loses its first
             axis under the pill. The three angles are still in the rotation
             pad, which is where they were authored. */
          className="hidden h-7 items-center gap-2.5 rounded-full border border-line bg-panel/80 px-3 text-[10.5px] tabular-nums text-ink-dim backdrop-blur-md @md:flex"
        >
          {AXES.map((a) => (
            <span key={a.axis}>
              {a.axis.toUpperCase()}{" "}
              <span
                ref={readoutRefs[a.axis]}
                data-testid={`readout-${a.axis}`}
                className="text-ink"
              >
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
            label={t("stage.follow")}
            pressed={follow}
            onClick={() => {
              setFollow((v) => !v);
            }}
          >
            <FollowIcon />
          </OverlayToggle>
          <OverlayToggle
            label={t("stage.axes")}
            pressed={axes}
            onClick={() => {
              setAxes((v) => !v);
            }}
          >
            <AxesIcon />
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

      {/* FR-8.6: only while the follow runs — a strength dial for something
          switched off is a control with nothing to do. Sits under the toggles
          that opened it, clear of the pose readout. */}
      {follow && (
        <div className="absolute top-14 right-4 flex h-7 items-center gap-2 rounded-full border border-line bg-panel/80 pr-3 pl-3 text-[10.5px] text-ink-dim backdrop-blur-md">
          <span>{t("stage.intensity")}</span>
          <RangeInput
            label={t("stage.intensity")}
            value={intensity}
            min={10}
            max={100}
            step={5}
            onChange={setIntensity}
            className="w-20"
          />
          <span className="w-7 text-right tabular-nums text-ink">
            {intensity}%
          </span>
        </div>
      )}

      {/* FR-8.7: bottom-left, opposite the zoom and clear of the character. */}
      {axes && (
        <div
          ref={triadRef}
          data-testid="stage-triad"
          role="img"
          aria-label={t("stage.axes")}
          className="absolute bottom-4 left-4 h-16 w-16 rounded-full border border-line bg-panel/70 backdrop-blur-md"
        />
      )}

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
        /* Hidden in a narrow column: it names Esc, which a phone has no key
           for, and it runs straight through the zoom pill. */
        <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[10.5px] text-ink-dim opacity-70 @md:flex">
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

/** An eye with its pupil off to one side: the character looking at something. */
function FollowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <path
        d="M1.6 8s2.4-4.2 6.4-4.2S14.4 8 14.4 8s-2.4 4.2-6.4 4.2S1.6 8 1.6 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="8" r="1.9" fill="currentColor" />
    </svg>
  );
}

/**
 * FR-8.6: the widest the head turns, at full intensity. The slider scales
 * these rather than the easing, because what "more pronounced" describes is
 * how far the character goes, not how fast it gets there.
 *
 * Wide on purpose. A modest turn is ambiguous — it reads as a lean, or as the
 * idle motion the character is doing anyway — and the whole point of the
 * follow is that a bystander can tell at a glance that it is watching them.
 * The eyes below carry the rest of that claim.
 */
const FOLLOW_LIMITS = { yaw: 46, pitch: 28 };

function scaleLimits(percent: number): { yaw: number; pitch: number } {
  const k = percent / 100;
  return { yaw: FOLLOW_LIMITS.yaw * k, pitch: FOLLOW_LIMITS.pitch * k };
}

/**
 * FR-8.6: how far the eyes slide at full intensity, as a fraction of the eye
 * itself — a character with tiny eyes would have them leave its face at any
 * fixed number of units, and the same fraction reads the same on every one.
 */
const GAZE_RANGE = { x: 0.45, y: 0.22 };

function gazeRange(bubble: Bubble, percent: number): { x: number; y: number } {
  const { eye } = bubble.restingFace;
  const k = percent / 100;
  return { x: eye.width * GAZE_RANGE.x * k, y: eye.height * GAZE_RANGE.y * k };
}

/**
 * FR-8.7: the axis colours, read from the tokens here so the pure render layer
 * never learns a palette value — the same rule the guide follows by taking
 * `currentColor`, which three axes cannot share.
 */
const TRIAD_COLORS = {
  x: "var(--color-axis-x)",
  y: "var(--color-axis-y)",
  z: "var(--color-axis-z)",
  origin: "var(--color-axis-label)",
};

/** Three strokes meeting at a corner: the triad, in miniature. */
function AxesIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <path
        d="M8 9.4V2.6M8 9.4l5.2 3M8 9.4l-5.2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
