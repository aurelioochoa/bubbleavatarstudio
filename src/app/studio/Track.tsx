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
  PlaybackMode,
  TransitionStyle,
} from "../../domain/document/types";
import type { StageClock } from "../stage/clock";
import type { StageMode } from "../stage/StageEngine";
import type { MessageKey } from "../i18n";
import type { Action } from "./store";
import { Menu, MenuItem, RangeInput, Segmented } from "./ui";

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
  onToggleCollapsed: () => void;
  onPlay: (loopId: string) => void;
  onPause: () => void;
  onStop: () => void;
  onSelectLoop: (loopId: string) => void;
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
  onToggleCollapsed,
  onPlay,
  onPause,
  onStop,
  onSelectLoop,
}: TrackProps) {
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);

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
    <TrackShell collapsed={collapsed} t={t}>
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

        {mode !== "stopped" && (
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

      {!collapsed && (
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <div
            role="group"
            aria-label={t("track.timeline")}
            className="relative flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <Ruler totalMs={stripMs} />

            <ol className="flex min-h-0 flex-1 gap-2">
              {loop.steps.map((step, i) => (
                <StepChip
                  key={step.id}
                  bubble={bubble}
                  kit={kit}
                  step={step}
                  index={i}
                  last={i === loop.steps.length - 1}
                  t={t}
                />
              ))}
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
  t,
  children,
}: {
  collapsed: boolean;
  t: (k: MessageKey) => string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={t("track.title")}
      className={`flex shrink-0 gap-2 border-t border-line bg-panel px-4 ${
        collapsed ? "h-11 flex-row items-center" : "h-38 flex-col pt-2.5 pb-3"
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

/**
 * One step, as wide as its hold. The trailing badge sits on the seam it
 * describes: a transition happens between two steps, and every previous
 * design put it in a row that could be scrolled away from the pair it joins.
 */
function StepChip({
  bubble,
  kit,
  step,
  index,
  last,
  t,
}: {
  bubble: Bubble;
  kit: Kit;
  step: LoopStep;
  index: number;
  last: boolean;
  t: (k: MessageKey) => string;
}) {
  const mood = kit.moods.find((m) => m.id === step.moodId);
  const thumb = useMemo(
    () =>
      mood
        ? sceneToSvg(
            moodScene(bubble, {
              left: mood.left,
              right: mood.right,
              colorOverride: mood.colorOverride,
            }),
            { background: null, size: 30 },
          )
        : "",
    [bubble, mood],
  );

  return (
    <li
      data-testid="step-chip"
      data-step-id={step.id}
      style={{ flexGrow: step.holdMs, flexShrink: 1, flexBasis: 0 }}
      className="relative flex min-w-0 items-center gap-2.5 rounded-[10px] border border-line-hi bg-panel-2 px-2.5"
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
        <span className="text-[10px] tabular-nums text-ink-dim">
          {s2(step.holdMs)} s
        </span>
      </span>
      {!last && (
        <span
          title={`${t("loops.transition")}: ${step.transition}`}
          className="absolute top-1/2 -right-3 z-[2] grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-panel text-ink-dim"
        >
          <TransitionGlyph style={step.transition} />
        </span>
      )}
      <span className="sr-only">{`${t("loops.steps")} ${String(index + 1)}`}</span>
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
