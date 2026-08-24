// Loops panel: steps referencing moods, playback config (FR-5).
// Transport lives on the stage dock (docs/05 §1), not here — this panel owns
// which loop is being edited and what that loop is made of. Rows stack rather
// than sharing one line so nothing clips at the inspector's width.
import type {
  Kit,
  PlaybackMode,
  TransitionStyle,
} from "../../../domain/document/types";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";
import { Card, IconButton, RangeInput, Segmented } from "../ui";

export interface LoopsPanelProps {
  kit: Kit;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /** Shared with the stage dock so "play" always means the selected loop. */
  selectedLoopId: string | null;
  onSelectLoop: (loopId: string) => void;
}

const MODES: PlaybackMode[] = ["loop", "once", "pingpong"];
const TRANSITIONS: TransitionStyle[] = ["linear", "ease", "spring", "step"];

const FIELD =
  "rounded-field border border-line bg-panel px-2 py-1.5 text-xs text-ink";

export function LoopsPanel({
  kit,
  dispatch,
  t,
  selectedLoopId,
  onSelectLoop,
}: LoopsPanelProps) {
  // Switching bubbles can leave the selection pointing at another kit's loop;
  // fall back to this kit's first loop rather than showing nothing (FR-6.4).
  const loop =
    kit.loops.find((l) => l.id === selectedLoopId) ?? kit.loops.at(0) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {kit.loops.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              onSelectLoop(l.id);
            }}
            className={`max-w-full truncate rounded-full px-3 py-1 text-xs transition-colors duration-150 ease-out ${
              l.id === loop?.id
                ? "bg-primary text-white"
                : "bg-panel-2 text-ink-dim hover:text-ink"
            }`}
          >
            {l.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            dispatch({
              type: "loop/add",
              init: { name: `loop ${String(kit.loops.length + 1)}` },
            });
          }}
          className="rounded-full border border-dashed border-line px-3 py-1 text-xs text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
        >
          + {t("loops.add")}
        </button>
      </div>

      {loop && (
        <>
          <Card title={t("loops.mode")}>
            <Segmented
              label={t("loops.mode")}
              value={loop.mode}
              options={MODES.map((m) => ({ value: m, label: m }))}
              onChange={(mode) => {
                dispatch({ type: "loop/update", loopId: loop.id, patch: { mode } });
              }}
            />
            <label className="block text-xs">
              <span className="flex justify-between text-ink-dim">
                {t("loops.springSpeed")}
                <span className="tabular-nums text-ink">
                  {loop.springSpeed.toFixed(1)}×
                </span>
              </span>
              <RangeInput
                label={t("loops.springSpeed")}
                value={loop.springSpeed}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(springSpeed) => {
                  dispatch({
                    type: "loop/update",
                    loopId: loop.id,
                    patch: { springSpeed },
                  });
                }}
                className="mt-1 w-full"
              />
            </label>
          </Card>

          <Card title={t("loops.steps")}>
            <ol className="space-y-2">
              {loop.steps.map((s, i) => {
                const moodName =
                  kit.moods.find((m) => m.id === s.moodId)?.name ?? "?";
                const first = i === 0;
                const last = i === loop.steps.length - 1;
                return (
                  <li
                    key={s.id}
                    className="space-y-1.5 rounded-field border border-line bg-panel/60 p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 shrink-0 text-center text-[10px] text-ink-dim tabular-nums">
                        {i + 1}
                      </span>
                      <select
                        value={s.moodId}
                        onChange={(e) => {
                          dispatch({
                            type: "step/update",
                            loopId: loop.id,
                            stepId: s.id,
                            patch: { moodId: e.target.value },
                          });
                        }}
                        className={`min-w-0 flex-1 ${FIELD}`}
                        aria-label={`${t("moods.name")} ${String(i + 1)}`}
                      >
                        {kit.moods.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <IconButton
                        label={`${t("loops.moveUp")} ${moodName}`}
                        disabled={first}
                        onClick={() => {
                          dispatch({
                            type: "step/reorder",
                            loopId: loop.id,
                            stepIds: swapped(
                              loop.steps.map((x) => x.id),
                              i,
                              i - 1,
                            ),
                          });
                        }}
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        label={`${t("loops.moveDown")} ${moodName}`}
                        disabled={last}
                        onClick={() => {
                          dispatch({
                            type: "step/reorder",
                            loopId: loop.id,
                            stepIds: swapped(
                              loop.steps.map((x) => x.id),
                              i,
                              i + 1,
                            ),
                          });
                        }}
                      >
                        ↓
                      </IconButton>
                      <IconButton
                        label={`${t("common.remove")} ${moodName}`}
                        danger
                        onClick={() => {
                          dispatch({
                            type: "step/remove",
                            loopId: loop.id,
                            stepId: s.id,
                          });
                        }}
                      >
                        ✕
                      </IconButton>
                    </div>
                    <div className="flex gap-1.5 pl-[1.375rem]">
                      <label className="flex min-w-0 flex-1 items-center gap-1 text-[10px] text-ink-dim">
                        <input
                          type="number"
                          min={0}
                          max={60000}
                          step={50}
                          value={s.holdMs}
                          onChange={(e) => {
                            dispatch({
                              type: "step/update",
                              loopId: loop.id,
                              stepId: s.id,
                              patch: { holdMs: Number(e.target.value) },
                            });
                          }}
                          className={`w-full text-right tabular-nums ${FIELD}`}
                          aria-label={t("loops.holdMs")}
                        />
                        <span className="shrink-0">ms</span>
                      </label>
                      <select
                        value={s.transition}
                        onChange={(e) => {
                          dispatch({
                            type: "step/update",
                            loopId: loop.id,
                            stepId: s.id,
                            patch: {
                              transition: e.target.value as TransitionStyle,
                            },
                          });
                        }}
                        className={`min-w-0 flex-1 ${FIELD}`}
                        aria-label={t("loops.transition")}
                      >
                        {TRANSITIONS.map((tr) => (
                          <option key={tr} value={tr}>
                            {tr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ol>

            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                dispatch({
                  type: "step/add",
                  loopId: loop.id,
                  step: {
                    moodId: e.target.value,
                    holdMs: 800,
                    transition: "ease",
                  },
                });
              }}
              className="w-full rounded-field border border-dashed border-line bg-transparent px-2 py-1.5 text-xs text-ink-dim"
              aria-label={t("loops.addStep")}
            >
              <option value="">+ {t("loops.addStep")}</option>
              {kit.moods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Card>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "loop/duplicate", loopId: loop.id });
              }}
              className="rounded-field bg-panel-2 px-3 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
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
              className="rounded-field bg-danger/15 px-3 py-1.5 text-xs text-danger transition-colors duration-150 ease-out hover:bg-danger/25"
            >
              {t("common.remove")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Order with the entries at `a` and `b` exchanged; out-of-range is a no-op. */
function swapped(ids: string[], a: number, b: number): string[] {
  if (a < 0 || b < 0 || a >= ids.length || b >= ids.length) return ids;
  const next = [...ids];
  [next[a], next[b]] = [ids[b], ids[a]] as [string, string];
  return next;
}
