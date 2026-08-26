// Track: the permanent transport, full width below rail, stage and inspector
// (FR-6.6). It replaces the dock that used to float on the stage — the
// character gets that room back, and the sequence stops living hidden inside a
// tab, which is what made building a loop a memory exercise.
//
// The timeline is real time (FR-6.7): a step is exactly as wide as its hold,
// the ruler is in seconds, and the playhead is where playback actually is.
//
// The playhead is the one thing here React does not draw. FR-11.2 keeps the
// per-frame path out of the tree, so the engine publishes elapsed time into a
// StageClock and the writer below sets `style.left` by hand. A playhead on
// React state would re-render every chip — and every mini-render on them —
// sixty times a second.
import { useEffect, useMemo, useRef, useState } from "react";
import { moodScene } from "../../render/scene";
import { sceneToSvg } from "../../render/svg";
import {
  playheadAt,
  stepBounds,
  summarizeLoop,
} from "../../domain/playback/summary";
import type {
  Bubble,
  Kit,
  Loop,
  LoopStep,
  Mood,
  PlaybackMode,
  TransitionStyle,
} from "../../domain/document/types";
import type { StageClock } from "../stage/clock";
import type { StageMode } from "../stage/StageEngine";
import type { MessageKey } from "../i18n";
import type { Action } from "./store";
import { Menu, MenuItem, RangeInput, Segmented } from "./ui";
import { useDragReorder } from "./dragReorder";

export interface TrackProps {
  bubble: Bubble;
  kit: Kit;
  loopId: string | null;
  mode: StageMode;
  /** Where the engine publishes elapsed time; subscribed, never rendered. */
  clock: StageClock;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /** FR-6.6: the Share tab is not editing a sequence, so the strip folds away. */
  collapsed: boolean;
  /** FR-5.10: the Moods tab opens the tray, so a step can be dragged in. */
  tray: boolean;
  /** The step the inspector is editing; owned above so both can name it. */
  selectedStepId: string | null;
  onToggleCollapsed: () => void;
  onSelectStep: (stepId: string | null) => void;
  /** Position on the strip, in ms, the user pressed the timeline at. */
  onScrub: (ms: number) => void;
  onPlay: (loopId: string) => void;
  onPause: () => void;
  onStop: () => void;
  onSelectLoop: (loopId: string) => void;
}

/**
 * FR-5.9: the floor a drag can shorten a step to, and the grid it lands on.
 * The grid is the step the typed field uses, so a hold dialled in by dragging
 * and one dialled in by typing are the same kind of number.
 */
const MIN_HOLD_MS = 50;
const HOLD_STEP_MS = 50;

/**
 * FR-5.10. `text/plain` is the MIME jsdom and every browser agree on, so the
 * payload is prefixed instead of typed: the mood grid reorders on the same
 * MIME, and one of its drags wandering onto the strip must not become a step.
 */
const DRAG_TYPE = "text/plain";
const MOOD_PREFIX = "bubble-mood:";

function draggedMoodId(payload: string): string | null {
  return payload.startsWith(MOOD_PREFIX)
    ? payload.slice(MOOD_PREFIX.length)
    : null;
}

/**
 * Which gap in the sequence a pointer at `clientX` is over: the index of the
 * first chip whose middle it has not yet passed, and one past the end when it
 * has passed them all.
 */
function dropIndexAt(strip: HTMLElement | null, clientX: number): number {
  const chips = strip
    ? [...strip.querySelectorAll<HTMLElement>('[data-testid="step-chip"]')]
    : [];
  for (let i = 0; i < chips.length; i++) {
    const box = chips[i].getBoundingClientRect();
    if (clientX < box.left + box.width / 2) return i;
  }
  return chips.length;
}

const MODES: { value: PlaybackMode; label: MessageKey }[] = [
  { value: "loop", label: "loops.modeLoop" },
  { value: "once", label: "loops.modeOnce" },
  { value: "pingpong", label: "loops.modePingpong" },
];

/** Seconds at the precision each readout is measured in. */
const s1 = (ms: number): string => (ms / 1000).toFixed(1);
const s2 = (ms: number): string => (ms / 1000).toFixed(2);

/** Groups in first-appearance order — the catalogue's order, not the alphabet. */
function byGroup(loops: Loop[]): { group: string; loops: Loop[] }[] {
  const out: { group: string; loops: Loop[] }[] = [];
  for (const l of loops) {
    const bucket = out.find((g) => g.group === l.group);
    if (bucket) bucket.loops.push(l);
    else out.push({ group: l.group, loops: [l] });
  }
  return out;
}

function groupLabel(group: string, t: (k: MessageKey) => string): string {
  if (group === "life") return t("loops.groupLife");
  if (group === "reaction") return t("loops.groupReaction");
  return group;
}

export function Track({
  bubble,
  kit,
  loopId,
  mode,
  clock,
  dispatch,
  t,
  collapsed,
  tray,
  selectedStepId,
  onToggleCollapsed,
  onSelectStep,
  onScrub,
  onPlay,
  onPause,
  onStop,
  onSelectLoop,
}: TrackProps) {
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  /** The seam whose transition popover is open, by the step it leads into. */
  const [seamFor, setSeamFor] = useState<string | null>(null);
  /** FR-5.10: where a mood being dragged over the strip would land. */
  const [dropAt, setDropAt] = useState<number | null>(null);
  // The step list left the inspector for the track, and FR-5.2's drag came
  // with it. A mood from the tray travels on the same MIME and is not in this
  // list of ids, so `movedOrder` declines it and it falls through to the
  // strip's own handler, which is what turns it into a new step.
  const stepDrag = useDragReorder(
    kit.loops.find((l) => l.id === loopId)?.steps.map((s) => s.id) ?? [],
    (stepIds) => {
      if (loopId) dispatch({ type: "step/reorder", loopId, stepIds });
    },
  );
  const stripRef = useRef<HTMLOListElement>(null);

  // A bubble switch can leave the selection pointing at another kit's loop;
  // fall back to this kit's first rather than showing nothing (FR-6.4).
  const loop =
    kit.loops.find((l) => l.id === loopId) ?? kit.loops.at(0) ?? null;

  if (loop === null) {
    return (
      <TrackShell collapsed t={t}>
        <p className="text-xs text-ink-mute">{t("loops.title")}</p>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "loop/add", init: { name: "loop 1" } });
          }}
          className="rounded-field border border-dashed border-line px-3 py-1 text-xs text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
        >
          + {t("loops.add")}
        </button>
      </TrackShell>
    );
  }

  const playing = mode === "playing";
  const summary = summarizeLoop(loop);
  const bounds = stepBounds(loop);
  /** The strip the chips are laid on: the authored run, not the played cycle. */
  const stripMs = bounds.at(-1)?.endMs ?? 0;

  const patch = (p: { mode?: PlaybackMode; springSpeed?: number }) => {
    dispatch({ type: "loop/update", loopId: loop.id, patch: p });
  };

  return (
    <TrackShell collapsed={collapsed} tray={tray && !collapsed} t={t}>
      {/* `w-full` so the trailing group's ml-auto reaches the right edge in
          both shells: collapsed, this row is a flex *item* rather than the
          whole column, and would otherwise shrink to its own content. */}
      <div className="flex h-8 w-full items-center gap-2.5">
        <button
          type="button"
          aria-label={playing ? t("common.pause") : t("common.play")}
          title={playing ? t("common.pause") : t("common.play")}
          onClick={() => {
            if (playing) onPause();
            else onPlay(loop.id);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          aria-label={t("common.stop")}
          title={t("common.stop")}
          disabled={mode === "stopped"}
          onClick={onStop}
          className="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-full text-ink-dim transition-colors duration-150 ease-out hover:bg-white/10 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <StopIcon />
        </button>

        <span aria-hidden="true" className="h-4.5 w-px bg-line" />

        <span className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={picking}
            aria-label={`${t("stage.loop")}: ${loop.name}`}
            onClick={() => {
              setPicking((v) => !v);
            }}
            className="flex h-6.5 items-center gap-1.5 rounded-full border border-line bg-panel-2 pr-2 pl-2.5 text-xs font-medium text-ink transition-colors duration-150 ease-out hover:border-outline"
          >
            <span className="max-w-32 truncate">{loop.name}</span>
            <span className="rounded-full bg-panel px-1.5 py-px text-[9px] tracking-wide text-ink-dim uppercase">
              {groupLabel(loop.group, t)}
            </span>
            <Chevron />
          </button>
          {picking && (
            <Menu
              label={t("stage.loop")}
              onClose={() => {
                setPicking(false);
              }}
              className="absolute bottom-full left-0 z-30 mb-1.5 max-h-72 w-56 overflow-y-auto"
            >
              {byGroup(kit.loops).map((g) => (
                <div key={g.group}>
                  <p className="px-2 pt-1.5 pb-1 text-[9px] font-semibold tracking-wider text-ink-mute uppercase">
                    {groupLabel(g.group, t)}
                  </p>
                  {g.loops.map((l) => (
                    <MenuItem
                      key={l.id}
                      label={l.name}
                      onClick={() => {
                        setPicking(false);
                        onSelectLoop(l.id);
                      }}
                    />
                  ))}
                </div>
              ))}
            </Menu>
          )}
        </span>

        {dropAt !== null && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-[10.5px] text-accent">
            <DropIcon />
            {t("moods.dropHint")} {dropAt + 1}
          </span>
        )}

        {mode !== "stopped" && dropAt === null && (
          <span
            data-testid="track-elapsed"
            aria-label={t("track.elapsed")}
            className="shrink-0 text-xs tabular-nums text-accent"
          >
            <Elapsed clock={clock} loop={loop} />
            <span className="text-ink-mute"> / {s2(summary.totalMs)} s</span>
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          {/* Blink and spring belong to the loop rather than to the moment, so
              they are the first thing to go when the row is 44px tall. */}
          {!collapsed && (
            <span
              data-testid="track-blink"
              className="flex items-center gap-1.5 text-[10.5px] text-ink-dim"
            >
              <BlinkIcon />
              {t("loops.blink")}{" "}
              <span className="tabular-nums text-ink">
                {loop.blink.enabled
                  ? `${s1(loop.blink.minIntervalMs)}–${s1(loop.blink.maxIntervalMs)} s · ${String(loop.blink.durationMs)} ms`
                  : t("loops.blinkOff")}
              </span>
            </span>
          )}

          {!collapsed && (
            <label className="flex items-center gap-1.5 text-[10.5px] text-ink-dim">
              {t("loops.springSpeed")}
              <RangeInput
                label={t("loops.springSpeed")}
                value={loop.springSpeed}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(springSpeed) => {
                  patch({ springSpeed });
                }}
                className="w-19"
              />
              <span className="w-8 tabular-nums text-ink">
                {loop.springSpeed.toFixed(1)}×
              </span>
            </label>
          )}

          <Segmented<PlaybackMode>
            compact
            label={t("loops.mode")}
            value={loop.mode}
            options={MODES.map((m) => ({
              value: m.value,
              label: t(m.label),
              icon: <ModeIcon mode={m.value} />,
            }))}
            onChange={(m) => {
              patch({ mode: m });
            }}
          />

          <span
            data-testid="track-summary"
            className="text-[10.5px] tabular-nums text-ink-dim"
          >
            {summary.steps} {t("loops.summarySteps")} ·{" "}
            <span className="text-ink">{s2(summary.totalMs)} s</span>
          </span>

          <button
            type="button"
            aria-label={collapsed ? t("track.expand") : t("track.collapse")}
            aria-expanded={!collapsed}
            title={collapsed ? t("track.expand") : t("track.collapse")}
            onClick={onToggleCollapsed}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-field text-ink-dim transition-colors duration-150 ease-out hover:bg-white/10 hover:text-ink"
          >
            <span className={collapsed ? "-rotate-90" : "rotate-90"}>
              <Chevron />
            </span>
          </button>
        </span>
      </div>

      {!collapsed && tray && <MoodTray bubble={bubble} kit={kit} t={t} />}

      {!collapsed && (
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <div
            role="group"
            aria-label={t("track.timeline")}
            className="relative flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <Ruler totalMs={stripMs} />

            {/* The strip is the hit area for a scrub, and the frame the drag
                scale is measured against. A press that began on a grip is not
                a scrub — without that check every retime would start by
                jumping playback to the edge being dragged. */}
            <ol
              ref={stripRef}
              data-testid="track-strip"
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("[data-grip]")) return;
                const box = stripRef.current?.getBoundingClientRect();
                if (!box || box.width <= 0 || stripMs <= 0) return;
                const at = (e.clientX - box.left) / box.width;
                onScrub(Math.round(Math.min(1, Math.max(0, at)) * stripMs));
              }}
              onDragOver={(e) => {
                if (!tray) return;
                // Without this the browser refuses the drop outright.
                e.preventDefault();
                setDropAt(dropIndexAt(stripRef.current, e.clientX));
              }}
              onDragLeave={() => {
                setDropAt(null);
              }}
              onDrop={(e) => {
                const at = dropAt ?? dropIndexAt(stripRef.current, e.clientX);
                setDropAt(null);
                const moodId = draggedMoodId(e.dataTransfer.getData(DRAG_TYPE));
                // The mood grid reorders on the same MIME; a drag that wandered
                // here from it must not silently become a step.
                if (moodId === null) return;
                dispatch({
                  type: "step/add",
                  loopId: loop.id,
                  step: { moodId, holdMs: 800, transition: "ease" },
                  at,
                });
              }}
              className="flex min-h-0 flex-1 gap-2"
            >
              {/* The marker is a flex child rather than an overlay, so the
                  chips part where the step would land — which is the whole
                  point of showing it. */}
              {loop.steps.flatMap((step, i) => {
                // `.at` rather than an index: the last step has no next, and
                // the index signature would type that away.
                const next = loop.steps.at(i + 1) ?? null;
                return [
                  ...(dropAt === i ? [<DropMarker key="drop" />] : []),
                  <StepChip
                    key={step.id}
                    bubble={bubble}
                    kit={kit}
                    step={step}
                    next={next}
                    index={i}
                    selected={step.id === selectedStepId}
                    // A grip belongs to the step on its left but sits on that
                    // chip's right edge — which is the *left* edge of the next
                    // one. Lighting it for either neighbour is what makes a
                    // selected step show both its handles.
                    nextSelected={next !== null && next.id === selectedStepId}
                    seamOpen={next !== null && seamFor === next.id}
                    t={t}
                    onSelect={() => {
                      onSelectStep(step.id);
                    }}
                    onOpenSeam={(open) => {
                      setSeamFor(open && next !== null ? next.id : null);
                    }}
                    onTransition={(transition) => {
                      setSeamFor(null);
                      if (next === null) return;
                      dispatch({
                        type: "step/update",
                        loopId: loop.id,
                        stepId: next.id,
                        patch: { transition },
                      });
                    }}
                    onRetime={(holdMs) => {
                      dispatch({
                        type: "step/update",
                        loopId: loop.id,
                        stepId: step.id,
                        patch: { holdMs },
                      });
                    }}
                    stripRef={stripRef}
                    stripMs={stripMs}
                    dragProps={stepDrag.itemProps(step.id)}
                  />,
                ];
              })}
              {dropAt === loop.steps.length && <DropMarker key="drop-end" />}
            </ol>

            <Playhead clock={clock} loop={loop} stripMs={stripMs} />
          </div>

          <span className="relative shrink-0">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={adding}
              aria-label={t("loops.addStep")}
              title={t("loops.addStep")}
              onClick={() => {
                setAdding((v) => !v);
              }}
              className="mt-[17px] grid h-[calc(100%-17px)] w-8.5 place-items-center rounded-[10px] border border-dashed border-line text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
            >
              <PlusIcon />
            </button>
            {adding && (
              <Menu
                label={t("loops.addStep")}
                onClose={() => {
                  setAdding(false);
                }}
                className="absolute right-0 bottom-full z-30 mb-1.5 max-h-72 w-48 overflow-y-auto"
              >
                {kit.moods.map((m) => (
                  <MenuItem
                    key={m.id}
                    label={m.name}
                    onClick={() => {
                      setAdding(false);
                      dispatch({
                        type: "step/add",
                        loopId: loop.id,
                        step: { moodId: m.id, holdMs: 800, transition: "ease" },
                      });
                    }}
                  />
                ))}
              </Menu>
            )}
          </span>
        </div>
      )}
    </TrackShell>
  );
}

/**
 * The band itself. Collapsed it is a single row of transport; open it carries
 * the strip as well (FR-6.6). The height is fixed rather than content-driven
 * so the stage above it does not resize as steps are added and removed.
 */
function TrackShell({
  collapsed,
  tray = false,
  t,
  children,
}: {
  collapsed: boolean;
  tray?: boolean;
  t: (k: MessageKey) => string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={t("track.title")}
      className={`flex shrink-0 gap-2 border-t border-line bg-panel px-4 ${
        collapsed
          ? "h-11 flex-row items-center"
          : tray
            ? "h-53 flex-col pt-2.5 pb-3"
            : "h-38 flex-col pt-2.5 pb-3"
      }`}
    >
      {children}
    </section>
  );
}

/** FR-6.7: the strip is ruled in seconds, so a hold can be read off it. */
function Ruler({ totalMs }: { totalMs: number }) {
  const marks = useMemo(() => {
    if (totalMs <= 0) return [];
    const out: { at: number; label: string | null }[] = [{ at: 0, label: "0" }];
    for (let ms = 500; ms < totalMs; ms += 500) {
      const whole = ms % 1000 === 0;
      out.push({
        at: (ms / totalMs) * 100,
        label: whole ? s1(ms) + " s" : null,
      });
    }
    return out;
  }, [totalMs]);

  return (
    <div
      data-testid="track-ruler"
      aria-hidden="true"
      className="relative h-3 border-b border-line-soft"
    >
      {marks.map((m) => (
        <span key={m.at}>
          <span
            style={{ left: `${String(m.at)}%` }}
            className={`absolute bottom-0 w-px ${
              m.label === null ? "h-1 bg-line" : "h-1.5 bg-line-hi"
            }`}
          />
          {m.label !== null && (
            <span
              style={{ left: `${String(m.at)}%` }}
              className="absolute -top-px ml-[3px] text-[8.5px] tabular-nums text-ink-mute"
            >
              {m.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/** The transitions the seam popover offers, in the order easing.ts defines. */
const TRANSITIONS: TransitionStyle[] = ["linear", "ease", "spring", "step"];

/** Exhaustive by construction: a new style without a label fails typecheck. */
const TRANSITION_LABELS: Record<TransitionStyle, MessageKey> = {
  linear: "loops.transitionLinear",
  ease: "loops.transitionEase",
  spring: "loops.transitionSpring",
  step: "loops.transitionStep",
};

/**
 * One step, as wide as its hold.
 *
 * Two controls live on its right edge and both follow one rule: **a grip
 * retimes the step to its left, and a seam badge edits the transition into the
 * step to its right.** So the grip that looks like the selected chip's left
 * handle is the previous chip's right edge, and retimes the previous step —
 * which is what a timeline does, and avoids the ambiguity of a handle that
 * could mean either of two steps. The last chip's grip lengthens the loop.
 *
 * A transition happens *between* two steps, and every previous design put it
 * in a row that could be scrolled away from the pair it joins.
 */
function StepChip({
  bubble,
  kit,
  step,
  next,
  index,
  selected,
  nextSelected,
  seamOpen,
  t,
  onSelect,
  onOpenSeam,
  onTransition,
  onRetime,
  stripRef,
  stripMs,
  dragProps,
}: {
  bubble: Bubble;
  kit: Kit;
  step: LoopStep;
  next: LoopStep | null;
  index: number;
  selected: boolean;
  nextSelected: boolean;
  seamOpen: boolean;
  t: (k: MessageKey) => string;
  onSelect: () => void;
  onOpenSeam: (open: boolean) => void;
  onTransition: (style: TransitionStyle) => void;
  onRetime: (holdMs: number) => void;
  stripRef: React.RefObject<HTMLElement | null>;
  stripMs: number;
  /** FR-5.2's drag, spread on the button rather than the chip: the grip is a
   *  pointer drag, and a `draggable` ancestor would steal it. */
  dragProps: ReturnType<ReturnType<typeof useDragReorder>["itemProps"]>;
}) {
  const mood = kit.moods.find((m) => m.id === step.moodId);
  const thumb = useMemo(
    () =>
      mood
        ? sceneToSvg(
            moodScene(bubble, {
              left: mood.left,
              right: mood.right,
              head: mood.head,
              colorOverride: mood.colorOverride,
            }),
            { background: null, size: 30 },
          )
        : "",
    [bubble, mood],
  );

  // FR-5.9. The scale is read once, at pointerdown: the strip's
  // milliseconds-per-pixel is a function of the total the drag is busy
  // changing, so re-reading it mid-drag makes the edge chase the pointer at a
  // rate that shifts under it. Seeded from the hold the drag started on, the
  // same way the numeric fields' scrub works (look/fields.tsx).
  const drag = useRef<{ x: number; from: number; msPerPx: number } | null>(
    null,
  );

  const onGripDown = (e: React.PointerEvent) => {
    const box = stripRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || stripMs <= 0) return;
    drag.current = {
      x: e.clientX,
      from: step.holdMs,
      msPerPx: stripMs / box.width,
    };
    (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
      e.pointerId,
    );
  };

  const onGripMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const raw = d.from + (e.clientX - d.x) * d.msPerPx;
    const snapped = Math.round(raw / HOLD_STEP_MS) * HOLD_STEP_MS;
    const held = Math.max(MIN_HOLD_MS, snapped);
    if (held !== step.holdMs) onRetime(held);
  };

  const endGrip = () => {
    drag.current = null;
  };

  return (
    <li
      data-testid="step-chip"
      data-step-id={step.id}
      style={{ flexGrow: step.holdMs, flexShrink: 1, flexBasis: 0 }}
      className="relative min-w-0 data-[dragging]:opacity-40"
    >
      <button
        type="button"
        {...dragProps}
        aria-pressed={selected}
        onClick={onSelect}
        className={`flex h-full w-full items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 text-left transition-colors duration-150 ease-out ${
          selected
            ? "bg-panel-3 shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
            : "border border-line-hi bg-panel-2 hover:border-outline"
        }`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none block h-7.5 w-7.5 shrink-0"
          dangerouslySetInnerHTML={{ __html: thumb }}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xs font-medium">
            {mood?.name ?? "?"}
          </span>
          <span
            className={`text-[10px] tabular-nums ${selected ? "text-ink" : "text-ink-dim"}`}
          >
            {s2(step.holdMs)} s
          </span>
        </span>
        <span className="sr-only">{`${t("loops.step")} ${String(index + 1)}`}</span>
      </button>

      <span
        data-grip="true"
        data-testid="step-grip"
        data-step-id={step.id}
        role="separator"
        aria-label={`${t("loops.holdMs")} · ${mood?.name ?? "?"}`}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={endGrip}
        onPointerCancel={endGrip}
        className={`absolute top-1/2 -right-0.5 z-[3] h-5.5 w-1.5 -translate-y-1/2 cursor-ew-resize touch-none rounded-full transition-opacity duration-150 ease-out ${
          selected || nextSelected
            ? "bg-brand opacity-100"
            : "bg-brand opacity-0 hover:opacity-100"
        }`}
      />

      {next !== null && (
        <span className="absolute top-1/2 -right-3 z-[2] -translate-y-1/2">
          <button
            type="button"
            data-testid="seam"
            aria-haspopup="menu"
            aria-expanded={seamOpen}
            aria-label={`${t("loops.transition")}: ${next.transition}`}
            title={`${t("loops.transition")}: ${next.transition}`}
            onClick={() => {
              onOpenSeam(!seamOpen);
            }}
            className="grid h-4 w-4 place-items-center rounded-full bg-panel text-ink-dim transition-colors duration-150 ease-out hover:text-ink"
          >
            <TransitionGlyph style={next.transition} />
          </button>
          {seamOpen && (
            <Menu
              label={t("loops.transition")}
              onClose={() => {
                onOpenSeam(false);
              }}
              className="absolute bottom-full left-1/2 z-30 mb-2 w-40 -translate-x-1/2"
            >
              {TRANSITIONS.map((style) => (
                <MenuItem
                  key={style}
                  label={t(TRANSITION_LABELS[style])}
                  onClick={() => {
                    onTransition(style);
                  }}
                />
              ))}
            </Menu>
          )}
        </span>
      )}
    </li>
  );
}

/**
 * The playhead and the wash behind it, written straight to the DOM from the
 * clock (FR-11.2). `loop` is a dependency because a strip of different holds
 * needs a different mapping, and a frame from the loop we are *not* drawing —
 * left in flight by a bubble switch — must not be read against this one.
 */
function Playhead({
  clock,
  loop,
  stripMs,
}: {
  clock: StageClock;
  loop: Loop;
  stripMs: number;
}) {
  const headRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const write = (pct: number) => {
      const left = `${pct.toFixed(2).replace(/\.?0+$/, "")}%`;
      if (headRef.current) headRef.current.style.left = left;
      if (capRef.current) capRef.current.style.left = left;
      if (washRef.current) washRef.current.style.width = left;
    };
    write(0);
    return clock.subscribe((frame) => {
      if (frame.loopId !== loop.id || stripMs <= 0) {
        write(0);
        return;
      }
      write((playheadAt(loop, frame.loopMs).ms / stripMs) * 100);
    });
  }, [clock, loop, stripMs]);

  return (
    <>
      <div
        ref={washRef}
        aria-hidden="true"
        data-testid="playhead-wash"
        className="pointer-events-none absolute top-[17px] bottom-0 left-0 w-0 rounded-l-[10px] bg-accent/8"
      />
      <div
        ref={headRef}
        aria-hidden="true"
        data-testid="playhead"
        style={{ left: "0%" }}
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-accent"
      />
      <div
        ref={capRef}
        aria-hidden="true"
        style={{ left: "0%" }}
        className="pointer-events-none absolute -top-0.5 -ml-[5px] h-2.5 w-2.5 rounded-[3px] bg-accent"
      />
    </>
  );
}

/** The elapsed readout, on the same per-frame path as the playhead. */
function Elapsed({ clock, loop }: { clock: StageClock; loop: Loop }) {
  const ref = useRef<HTMLSpanElement>(null);
  const totalMs = summarizeLoop(loop).totalMs;

  useEffect(() => {
    const write = (ms: number) => {
      if (ref.current) ref.current.textContent = `${s2(ms)} s`;
    };
    write(0);
    return clock.subscribe((frame) => {
      if (frame.loopId !== loop.id || totalMs <= 0) {
        write(0);
        return;
      }
      // Elapsed is measured against the cycle the loop plays, which for a
      // pingpong is longer than the strip the playhead walks.
      const e =
        loop.mode === "once"
          ? Math.min(frame.loopMs, totalMs)
          : ((frame.loopMs % totalMs) + totalMs) % totalMs;
      write(e);
    });
  }, [clock, loop, totalMs]);

  return <span ref={ref}>0.00 s</span>;
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-2.5 w-2.5 text-ink-dim"
      aria-hidden="true"
    >
      <path
        d="M3 4.5 6 8l3-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4.8 3.1 12.4 8l-7.6 4.9Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <path d="M4.4 3.6h2.6v8.8H4.4zM9 3.6h2.6v8.8H9z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M8 3.4v9.2M3.4 8h9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden="true">
      <path
        d="M8 2.6v7.6M5 7.4 8 10.4l3-3M3.2 12.8h9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BlinkIcon() {
  return (
    <svg viewBox="0 0 20 12" className="h-2.5 w-4" aria-hidden="true">
      <path
        d="M1.6 6S4.8 1.8 10 1.8 18.4 6 18.4 6 15.2 10.2 10 10.2 1.6 6 1.6 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="6" r="2.1" fill="currentColor" />
    </svg>
  );
}

/** The three playback modes, drawn as what they do to the sequence. */
function ModeIcon({ mode }: { mode: PlaybackMode }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 18 12" className="h-2.5 w-3.5" aria-hidden="true">
      {mode === "loop" && (
        <>
          <path
            d="M4.6 2.6h8a3.4 3.4 0 0 1 0 6.8h-8a3.4 3.4 0 0 1 0-6.8Z"
            {...common}
          />
          <path d="M6.2 1.1 4.3 2.6l1.9 1.5" {...common} />
        </>
      )}
      {mode === "once" && (
        <>
          <path d="M2.4 6h13.2" {...common} />
          <path d="M12.6 2.6 16 6l-3.4 3.4" {...common} />
        </>
      )}
      {mode === "pingpong" && (
        <>
          <path d="M3.4 6h11.2" {...common} />
          <path
            d="M5.6 3.2 2.8 6l2.8 2.8M12.4 3.2 15.2 6l-2.8 2.8"
            {...common}
          />
        </>
      )}
    </svg>
  );
}

/** Each easing drawn as its own curve, so the seam badge is readable at 11px. */
function TransitionGlyph({ style }: { style: TransitionStyle }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
  };
  const d =
    style === "linear"
      ? "M1.6 10 12.4 2"
      : style === "spring"
        ? "M1.5 9c1.4 0 1.4-6 2.8-6s1.4 6 2.8 6 1.4-6 2.8-6 1.4 3 2.6 3"
        : style === "step"
          ? "M1.6 10h5.2V2h5.6"
          : "M1.6 10C4.6 10 4.6 2 7 2s2.4 8 5.4 8";
  return (
    <svg viewBox="0 0 14 12" className="h-2.5 w-2.5" aria-hidden="true">
      <path d={d} {...common} />
    </svg>
  );
}

/** Where a dragged mood would land, drawn between the chips it separates. */
function DropMarker() {
  return (
    <li
      data-testid="drop-marker"
      aria-hidden="true"
      className="w-[3px] shrink-0 self-stretch rounded-full bg-accent"
    />
  );
}

/**
 * FR-5.10: the mood library, on the track.
 *
 * Building a loop used to mean holding a thumbnail in your head from a tab you
 * were no longer looking at. Here the moods and the sequence they go into are
 * on screen together, and one is dragged onto the other.
 */
function MoodTray({
  bubble,
  kit,
  t,
}: {
  bubble: Bubble;
  kit: Kit;
  t: (k: MessageKey) => string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-semibold tracking-[0.09em] text-ink-dim uppercase">
          {t("moods.tray")}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
        <span className="text-[9.5px] text-ink-mute">
          {t("moods.trayHint")}
        </span>
      </div>
      <div className="relative overflow-hidden">
        <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
          {kit.moods.map((m) => (
            <TrayCard key={m.id} bubble={bubble} mood={m} />
          ))}
        </ul>
        {/* The lane scrolls; the fade says so without a scrollbar. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-r from-transparent to-panel"
        />
      </div>
    </div>
  );
}

function TrayCard({ bubble, mood }: { bubble: Bubble; mood: Mood }) {
  const thumb = useMemo(
    () =>
      sceneToSvg(
        moodScene(bubble, {
          left: mood.left,
          right: mood.right,
          head: mood.head,
          colorOverride: mood.colorOverride,
        }),
        { background: null, size: 30 },
      ),
    [bubble, mood],
  );
  return (
    <li
      data-testid="tray-card"
      data-mood-id={mood.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(DRAG_TYPE, `${MOOD_PREFIX}${mood.id}`);
      }}
      className="flex w-13.5 shrink-0 cursor-grab flex-col items-center gap-1 rounded-[9px] bg-panel-2 px-0.5 py-1.5 active:cursor-grabbing"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none block h-7.5 w-7.5"
        dangerouslySetInnerHTML={{ __html: thumb }}
      />
      <span className="max-w-12 truncate text-[8.5px] text-ink-dim">
        {mood.name}
      </span>
    </li>
  );
}
