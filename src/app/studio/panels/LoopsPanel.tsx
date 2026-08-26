// Loops panel: the catalogue, and the one step in hand (FR-5).
//
// The sequence itself is not here any more. Steps are chips on the track,
// where their widths are their durations (FR-6.7), and playback mode, spring
// speed and step order are edited there too — so what is left in the column is
// the list of loops to choose between, the loop's own settings, and an editor
// for whichever step the track has selected.
//
// That editor is pinned to the foot of the column rather than sitting in the
// scroll box: it describes the chip currently lit on the track, and a panel
// that scrolls its own subject out of view is answering a question nobody
// asked. Rows carry a proportion bar so a loop can be told from its shape
// before it is played.
import type {
  BlinkConfig,
  Kit,
  Loop,
  LoopStep,
  TransitionStyle,
} from "../../../domain/document/types";
import { stepBounds, summarizeLoop } from "../../../domain/playback/summary";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";
import { NumberField } from "./look/fields";
import { Card, IconButton, Menu, MenuItem, Segmented } from "../ui";
import { useState } from "react";

export interface LoopsPanelProps {
  kit: Kit;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /** Shared with the track so "play" always means the selected loop. */
  selectedLoopId: string | null;
  onSelectLoop: (loopId: string) => void;
  /** The chip lit on the track; this panel edits it (FR-6.7). */
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
}

const TRANSITIONS: TransitionStyle[] = ["linear", "ease", "spring", "step"];

/** Exhaustive by construction: a new style without a label fails typecheck. */
const TRANSITION_LABELS: Record<TransitionStyle, MessageKey> = {
  linear: "loops.transitionLinear",
  ease: "loops.transitionEase",
  spring: "loops.transitionSpring",
  step: "loops.transitionStep",
};

type LoopPatch = Extract<Action, { type: "loop/update" }>["patch"];

/** The two groups the starter catalogue ships (FR-5.7); imports may add more. */
const KNOWN_GROUPS = ["life", "reaction"] as const;

const FIELD =
  "rounded-field border border-line bg-stage px-2 py-1.5 text-xs text-ink";

/**
 * A group is a free string, so only the two the catalogue authors are
 * translated; anything else is the user's own word and reaches the UI as
 * typed rather than through a message key that does not exist for it.
 */
function groupLabel(group: string, t: (k: MessageKey) => string): string {
  if (group === "life") return t("loops.groupLife");
  if (group === "reaction") return t("loops.groupReaction");
  return group;
}

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

const s2 = (ms: number): string => (ms / 1000).toFixed(2);

export function LoopsPanel({
  kit,
  dispatch,
  t,
  selectedLoopId,
  onSelectLoop,
  selectedStepId,
  onSelectStep,
}: LoopsPanelProps) {
  // Switching bubbles can leave the selection pointing at another kit's loop;
  // fall back to this kit's first loop rather than showing nothing (FR-6.4).
  const loop =
    kit.loops.find((l) => l.id === selectedLoopId) ?? kit.loops.at(0) ?? null;
  const stepIndex = loop
    ? loop.steps.findIndex((s) => s.id === selectedStepId)
    : -1;
  const step = stepIndex >= 0 ? (loop?.steps[stepIndex] ?? null) : null;

  const patchLoop = (loopId: string, patch: LoopPatch) => {
    dispatch({ type: "loop/update", loopId, patch });
  };

  const patchBlink = (patch: Partial<BlinkConfig>) => {
    if (!loop) return;
    patchLoop(loop.id, { blink: { ...loop.blink, ...patch } });
  };

  const groups = byGroup(kit.loops);
  // A group the catalogue never names still needs a chip, or its loops would
  // be unreachable from the control that moves loops between groups.
  const groupOptions = [
    ...new Set<string>([...KNOWN_GROUPS, ...(loop ? [loop.group] : [])]),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="space-y-1">
          {groups.map((g) => (
            <div
              key={g.group}
              role="group"
              aria-label={groupLabel(g.group, t)}
              className="space-y-0.5"
            >
              <div className="flex items-center gap-2 pt-1.5 pb-1">
                <span className="text-[9px] font-semibold tracking-[0.09em] text-ink-dim uppercase">
                  {groupLabel(g.group, t)}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
                <span className="text-[9.5px] tabular-nums text-ink-mute">
                  {g.loops.length}
                </span>
              </div>
              {g.loops.map((l) => (
                <LoopRow
                  key={l.id}
                  loop={l}
                  selected={l.id === loop?.id}
                  onSelect={() => {
                    onSelectLoop(l.id);
                  }}
                />
              ))}
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              dispatch({
                type: "loop/add",
                init: { name: `loop ${String(kit.loops.length + 1)}` },
              });
            }}
            className="mt-2 w-full rounded-field border border-dashed border-line py-1.5 text-xs text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
          >
            + {t("loops.add")}
          </button>
        </div>

        {loop && (
          <>
            {/* Mode and spring speed are on the track, where they are next to
                the sequence they change. Everything a loop carries that the
                track has no room for is here. */}
            <Card title={t("loops.settings")} defaultOpen={false}>
              <label className="block text-xs">
                <span className="text-ink-dim">{t("loops.name")}</span>
                <input
                  type="text"
                  value={loop.name}
                  aria-label={t("loops.name")}
                  onChange={(e) => {
                    // FR-1.2's rule for bubbles holds for loops: a name is
                    // required, so a blank field is simply not committed.
                    const name = e.target.value.trim();
                    if (name) patchLoop(loop.id, { name });
                  }}
                  className={`mt-1 w-full ${FIELD}`}
                />
              </label>
              <Segmented
                label={t("loops.group")}
                value={loop.group}
                options={groupOptions.map((g) => ({
                  value: g,
                  label: groupLabel(g, t),
                }))}
                onChange={(group) => {
                  patchLoop(loop.id, { group });
                }}
              />
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "loop/duplicate", loopId: loop.id });
                  }}
                  className="flex-1 rounded-field bg-panel px-3 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
                >
                  {t("common.duplicate")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // docs/05 §3: destructive actions confirm.
                    if (!globalThis.confirm(t("confirm.removeLoop"))) return;
                    const next = kit.loops.find((l) => l.id !== loop.id);
                    dispatch({ type: "loop/remove", loopId: loop.id });
                    if (next) onSelectLoop(next.id);
                  }}
                  className="flex-1 rounded-field bg-danger/15 px-3 py-1.5 text-xs text-danger transition-colors duration-150 ease-out hover:bg-danger/25"
                >
                  {t("common.remove")}
                </button>
              </div>
            </Card>

            <Card
              title={t("loops.blink")}
              defaultOpen={false}
              aside={
                <input
                  type="checkbox"
                  checked={loop.blink.enabled}
                  aria-label={t("loops.blink")}
                  onChange={(e) => {
                    patchBlink({ enabled: e.target.checked });
                  }}
                />
              }
            >
              <NumberField
                label={t("loops.blinkMin")}
                value={loop.blink.minIntervalMs}
                min={200}
                step={100}
                onChange={(minIntervalMs) => {
                  patchBlink({ minIntervalMs });
                }}
              />
              <NumberField
                label={t("loops.blinkMax")}
                value={loop.blink.maxIntervalMs}
                min={200}
                step={100}
                onChange={(maxIntervalMs) => {
                  patchBlink({ maxIntervalMs });
                }}
              />
              <NumberField
                label={t("loops.blinkDuration")}
                value={loop.blink.durationMs}
                min={40}
                step={10}
                onChange={(durationMs) => {
                  patchBlink({ durationMs });
                }}
              />
            </Card>
          </>
        )}
      </div>

      {loop && (
        <div
          data-testid="step-editor"
          className="flex shrink-0 flex-col gap-2.5 border-t border-line bg-panel-2 p-3"
        >
          {step === null ? (
            <p className="py-1 text-center text-[11px] text-ink-mute">
              {t("loops.noStep")}
            </p>
          ) : (
            <StepEditor
              kit={kit}
              loop={loop}
              step={step}
              index={stepIndex}
              t={t}
              dispatch={dispatch}
              onSelectStep={onSelectStep}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One loop, told apart by its shape before it is played: the bar is the
 * sequence's own proportions, at the size a row can spare.
 */
function LoopRow({
  loop,
  selected,
  onSelect,
}: {
  loop: Loop;
  selected: boolean;
  onSelect: () => void;
}) {
  const summary = summarizeLoop(loop);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex h-7.5 w-full items-center gap-2.5 rounded-field px-2.5 transition-colors duration-150 ease-out ${
        selected
          ? "bg-panel-3 shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
          : "hover:bg-white/5"
      }`}
    >
      <span
        className={`min-w-0 flex-1 truncate text-left text-xs ${
          selected ? "font-semibold text-ink" : "text-ink-dim"
        }`}
      >
        {loop.name}
      </span>
      <span
        aria-hidden="true"
        data-testid="loop-shape"
        className="flex w-18 shrink-0 gap-px"
      >
        {loop.steps.map((s) => (
          <span
            key={s.id}
            style={{ flexGrow: s.holdMs, flexShrink: 1, flexBasis: 0 }}
            className={`h-1.5 rounded-[2px] ${selected ? "bg-brand" : "bg-track"}`}
          />
        ))}
      </span>
      <span
        className={`w-9 shrink-0 text-right text-[10px] tabular-nums ${
          selected ? "text-ink" : "text-ink-mute"
        }`}
      >
        {s2(summary.totalMs)} s
      </span>
    </button>
  );
}

/**
 * The step the track has in hand (FR-5.1).
 *
 * ← → are FR-5.2's keyboard path for reordering, which the chips answer with a
 * drag. The hold is in seconds here and on the chip, because the timeline is
 * ruled in seconds and a field in milliseconds beside it makes the reader do
 * the conversion.
 */
function StepEditor({
  kit,
  loop,
  step,
  index,
  t,
  dispatch,
  onSelectStep,
}: {
  kit: Kit;
  loop: Loop;
  step: LoopStep;
  index: number;
  t: (k: MessageKey) => string;
  dispatch: React.Dispatch<Action>;
  onSelectStep: (stepId: string | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const mood = kit.moods.find((m) => m.id === step.moodId);
  const bounds = stepBounds(loop);
  const start = bounds[index]?.startMs ?? 0;

  const patch = (p: Extract<Action, { type: "step/update" }>["patch"]) => {
    dispatch({
      type: "step/update",
      loopId: loop.id,
      stepId: step.id,
      patch: p,
    });
  };

  const move = (to: number) => {
    const ids = loop.steps.map((x) => x.id);
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[index], next[to]] = [ids[to], ids[index]] as [string, string];
    dispatch({ type: "step/reorder", loopId: loop.id, stepIds: next });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-semibold tracking-[0.09em] text-ink-dim uppercase">
          {t("loops.step")} {index + 1} {t("loops.stepOf")} {loop.steps.length}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <span className="text-[9.5px] tabular-nums text-ink-mute">
          {s2(start)} s
        </span>
        <IconButton
          label={t("loops.moveLeft")}
          disabled={index <= 0}
          onClick={() => {
            move(index - 1);
          }}
        >
          ←
        </IconButton>
        <IconButton
          label={t("loops.moveRight")}
          disabled={index >= loop.steps.length - 1}
          onClick={() => {
            move(index + 1);
          }}
        >
          →
        </IconButton>
        <IconButton
          label={`${t("common.remove")} · ${mood?.name ?? "?"}`}
          danger
          onClick={() => {
            onSelectStep(null);
            dispatch({
              type: "step/remove",
              loopId: loop.id,
              stepId: step.id,
            });
          }}
        >
          ✕
        </IconButton>
      </div>

      <div className="flex items-end gap-2">
        <span className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={picking}
            aria-label={`${t("moods.title")}: ${mood?.name ?? "?"}`}
            onClick={() => {
              setPicking((v) => !v);
            }}
            className="flex h-8.5 w-full items-center gap-2 rounded-field border border-line bg-stage px-2 text-xs text-ink transition-colors duration-150 ease-out hover:border-outline"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {mood?.name ?? "?"}
            </span>
            <svg
              viewBox="0 0 12 12"
              className="h-2.5 w-2.5 shrink-0 text-ink-dim"
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
          </button>
          {picking && (
            <Menu
              label={t("moods.title")}
              onClose={() => {
                setPicking(false);
              }}
              className="absolute bottom-full left-0 z-30 mb-1.5 max-h-64 w-full overflow-y-auto"
            >
              {kit.moods.map((m) => (
                <MenuItem
                  key={m.id}
                  label={m.name}
                  onClick={() => {
                    setPicking(false);
                    patch({ moodId: m.id });
                  }}
                />
              ))}
            </Menu>
          )}
        </span>

        <label className="flex w-24 shrink-0 flex-col gap-1">
          <span className="text-[10px] text-ink-dim">{t("loops.hold")}</span>
          <span className="flex h-8.5 items-center rounded-field border border-line bg-stage pr-1.5 pl-2">
            <input
              type="number"
              min={0.05}
              max={60}
              step={0.05}
              value={step.holdMs / 1000}
              aria-label={t("loops.hold")}
              onChange={(e) => {
                const seconds = Number(e.target.value);
                if (Number.isFinite(seconds)) {
                  patch({ holdMs: Math.round(seconds * 1000) });
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-right text-xs tabular-nums text-ink outline-none"
            />
            <span className="w-3 text-right text-[9.5px] text-ink-dim">s</span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-ink-dim">
          {t("loops.entryTransition")}
        </span>
        <Segmented<TransitionStyle>
          label={t("loops.transition")}
          value={step.transition}
          options={TRANSITIONS.map((style) => ({
            value: style,
            label: t(TRANSITION_LABELS[style]),
          }))}
          onChange={(transition) => {
            patch({ transition });
          }}
        />
      </div>
    </>
  );
}
