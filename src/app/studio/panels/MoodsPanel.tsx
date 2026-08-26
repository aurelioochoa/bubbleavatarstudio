// Moods panel: a searchable grid of true mini-renders, a selection bar that
// acts on the one card in hand, and a modal editor holding the relative
// per-eye deltas and the colour override (FR-4).
//
// The card actions used to hang off a per-card kebab. They live on the bar at
// the foot of the column now, because one of them has to say *why* it is
// unavailable: FR-4.8 disables deleting a mood some loop still plays, and a
// menu that has to be opened to discover a refusal is a worse messenger than a
// row that is always there. The bar keeps ↑/↓, which were the menu's keyboard
// path for reordering (docs/05 §2) and are still the only one.
//
// Edits are cancelable (FR-4.4): the editor works on a draft that previews on
// the stage every change and reaches the document only on Save. The modal is
// scoped to the inspector column, so the stage stays visible behind it — which
// is the whole point of previewing while you drag a slider.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { libraryGap } from "../../../domain/document/library";
import { moodUsage } from "../../../domain/document/summary";
import { moodScene } from "../../../render/scene";
import { sceneToSvg } from "../../../render/svg";
import type {
  Bubble,
  ColorOverride,
  Kit,
  Mood,
  MoodEye,
} from "../../../domain/document/types";
import type { MoodSample } from "../../../domain/playback/LoopPlayer";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";
import { IconButton, Modal, RangeInput, Segmented } from "../ui";
import { XYPad } from "./moods/XYPad";
import { useDragReorder } from "../dragReorder";

export interface MoodsPanelProps {
  kit: Kit;
  bubble: Bubble;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /** Shows a mood on the stage while it is picked or edited (FR-4.4). */
  onPreview: (sample: MoodSample | null) => void;
  /**
   * Where the editor modal is mounted. The panel itself lives inside the
   * inspector's scroll container, which would clip an overlay against the tab
   * strip, so the modal is portalled to the column instead. Absent — a panel
   * rendered on its own in a test — it simply renders in place.
   */
  overlayHost?: HTMLElement | null;
}

/**
 * FR-4.1: the seven deltas a mood stores per eye. The two offsets are edited
 * on the pad and the rest as rows, but every control still needs a name, and
 * the record is exhaustive by construction — a delta added to `MoodEye`
 * without a label here fails typecheck rather than reaching the UI unnamed.
 */
const FIELD_LABELS: Record<keyof MoodEye, MessageKey> = {
  rotationXDeg: "common.rotationX",
  rotationYDeg: "common.rotationY",
  rotationZDeg: "common.rotationZ",
  scaleX: "look.scaleX",
  scaleY: "look.scaleY",
  offsetX: "look.offsetX",
  offsetY: "look.offsetY",
};

/** docs/05 §2: how far from the resting anchor an eye may be nudged. */
const OFFSET_RANGE = 40;

/** Fixed decimals so a row does not reflow as its neighbour is dragged. */
const scale = (v: number): string => v.toFixed(2);
const degrees = (v: number): string => `${String(Math.round(v))}°`;

/** Fallback swatch when a channel is switched on and has nothing to show yet. */
const DEFAULT_OVERRIDE = "#6c7bff";

const sampleOf = (mood: {
  left: MoodEye;
  right: MoodEye;
  colorOverride: ColorOverride;
}): MoodSample => ({
  left: mood.left,
  right: mood.right,
  colorOverride: mood.colorOverride,
});

/**
 * Left onto right, the same handedness rule FR-3.3 applies to the resting
 * face: roll and yaw are handed and flip sign, pitch and the scales are not.
 */
function mirrorEye(left: MoodEye): MoodEye {
  return {
    ...left,
    rotationYDeg: -left.rotationYDeg,
    rotationZDeg: -left.rotationZDeg,
    offsetX: -left.offsetX,
  };
}

export function MoodsPanel({
  kit,
  bubble,
  dispatch,
  t,
  onPreview,
  overlayHost = null,
}: MoodsPanelProps) {
  const [selected, setSelected] = useState<string | null>(
    kit.moods[0]?.id ?? null,
  );
  /** FR-4.9: the filter over the grid; matched on name, nothing else. */
  const [query, setQuery] = useState("");
  /** The mood being edited, as a draft; null when the editor is closed. */
  const [draft, setDraft] = useState<Mood | null>(null);

  /** FR-4.5: cards show the mood on the real character, not an icon. */
  const thumbnail = (sample: MoodSample, size = 54): string =>
    sceneToSvg(moodScene(bubble, sample), { background: null, size });

  /** FR-4.8: how many loops each mood is in, measured once per kit change. */
  const usage = useMemo(() => moodUsage(kit), [kit]);
  const needle = query.trim().toLowerCase();
  const shown =
    needle === ""
      ? kit.moods
      : kit.moods.filter((m) => m.name.toLowerCase().includes(needle));

  const select = (id: string) => {
    setSelected(id);
    const picked = kit.moods.find((m) => m.id === id);
    if (picked) onPreview(sampleOf(picked));
  };

  const openEditor = (mood: Mood) => {
    setSelected(mood.id);
    setDraft(structuredClone(mood));
    onPreview(sampleOf(mood));
  };

  const editDraft = (next: Mood) => {
    setDraft(next);
    onPreview(sampleOf(next)); // every change is visible before it is committed
  };

  const cancelEdit = () => {
    const saved = draft && kit.moods.find((m) => m.id === draft.id);
    setDraft(null);
    // FR-4.4: leaving the editor without saving restores the previous state.
    if (saved) onPreview(sampleOf(saved));
  };

  const saveEdit = () => {
    if (!draft) return;
    dispatch({
      type: "mood/update",
      moodId: draft.id,
      patch: {
        name: draft.name,
        left: draft.left,
        right: draft.right,
        colorOverride: draft.colorOverride,
      },
    });
    setDraft(null);
  };

  const reorder = (ids: string[]) => {
    dispatch({ type: "mood/reorder", ids });
  };
  // docs/05 §2: cards drag; the menu's up/down stays as the keyboard path.
  const drag = useDragReorder(
    kit.moods.map((m) => m.id),
    reorder,
  );

  /**
   * FR-4.7/FR-5.7: a project saved before the library grew keeps the kit it
   * was saved with (see domain/document/library.ts), so the row below offers
   * the difference — and disappears the moment there is none left to offer.
   * Recomputed only when the kit changes; the gap is measured against a fresh
   * `starterKit()`, which is not free.
   */
  const gap = useMemo(() => libraryGap(kit), [kit]);
  const gapLabel = [
    gap.moods > 0 ? `+${String(gap.moods)} ${t("moods.title")}` : null,
    gap.loops > 0 ? `+${String(gap.loops)} ${t("loops.title")}` : null,
  ]
    .filter((p) => p !== null)
    .join(" · ");

  const move = (index: number, to: number) => {
    const ids = kit.moods.map((m) => m.id);
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[index], next[to]] = [ids[to], ids[index]] as [string, string];
    reorder(next);
  };

  /** What the bar says about the selected mood, and what blocks its delete. */
  const usedLabel = (n: number): string =>
    n === 0
      ? t("moods.unused")
      : n === 1
        ? t("moods.usedInOne")
        : `${t("moods.usedIn")} ${String(n)} ${t("moods.usedInMany")}`;

  const current = kit.moods.find((m) => m.id === selected) ?? null;
  const currentIndex = current
    ? kit.moods.findIndex((m) => m.id === current.id)
    : -1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* FR-4.9. The count is of what is on screen, so a filter says how much
          it left behind rather than repeating the library's size. */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2.5">
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-field border border-line bg-stage px-2.5">
          <SearchIcon />
          <input
            type="search"
            value={query}
            aria-label={t("moods.search")}
            placeholder={t("moods.search")}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-ink-mute"
          />
        </span>
        <span
          data-testid="mood-count"
          className="shrink-0 rounded-full bg-panel-2 px-2.5 py-1 text-[10px] tabular-nums text-ink-dim"
        >
          {shown.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
        <ul className="grid grid-cols-3 gap-2">
          {shown.map((m) => {
            const used = usage[m.id] ?? 0;
            return (
              <li
                key={m.id}
                {...drag.itemProps(m.id)}
                data-testid="mood-card"
                data-mood-id={m.id}
                className="relative data-[dragging]:opacity-40"
              >
                <button
                  type="button"
                  aria-pressed={m.id === selected}
                  onClick={() => {
                    select(m.id);
                  }}
                  onDoubleClick={() => {
                    openEditor(m);
                  }}
                  className={`flex w-full flex-col items-center gap-1.5 rounded-[10px] px-1 pt-2.5 pb-2 text-[10.5px] transition-colors duration-150 ease-out ${
                    m.id === selected
                      ? "bg-panel-3 font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
                      : "bg-panel-2 text-ink-dim shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-ink"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none block h-13.5 w-13.5"
                    dangerouslySetInnerHTML={{ __html: thumbnail(sampleOf(m)) }}
                  />
                  <span className="w-full truncate text-center">{m.name}</span>
                </button>

                {used > 0 && (
                  <span
                    data-testid="usage-badge"
                    title={usedLabel(used)}
                    className="pointer-events-none absolute top-1.5 right-1.5 rounded-full bg-panel px-1.5 text-[8.5px] tabular-nums text-ink-dim"
                  >
                    {used}
                  </span>
                )}
              </li>
            );
          })}
          {needle === "" && (
            <li>
              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: "mood/add",
                    name: `mood ${String(kit.moods.length + 1)}`,
                  });
                }}
                className="flex h-full min-h-[5.5rem] w-full items-center justify-center rounded-[10px] border border-dashed border-line px-1 text-center text-[10px] leading-tight text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
              >
                + {t("moods.add")}
              </button>
            </li>
          )}
        </ul>

        {shown.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-mute">
            {t("moods.noMatch")}
          </p>
        )}

        {gap.moods + gap.loops > 0 && (
          <div className="rounded-card border border-dashed border-line bg-panel-2 p-3">
            <p className="text-[11px] leading-snug text-ink-dim">
              {t("moods.topUpHint")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-ink">
                {gapLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "library/topUp" });
                }}
                className="shrink-0 rounded-field bg-primary px-3 py-1.5 text-xs text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
              >
                {t("moods.topUp")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FR-4.8: the bar acts on the card in hand, and says what it cannot do
          before the reducer would have to refuse it. */}
      {current && (
        <div
          data-testid="mood-selection"
          className="flex shrink-0 items-center gap-2 border-t border-line bg-panel-2 px-3 py-2.5"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none block h-7.5 w-7.5 shrink-0"
            dangerouslySetInnerHTML={{
              __html: thumbnail(sampleOf(current), 30),
            }}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-xs font-semibold">
              {current.name}
            </span>
            <span className="truncate text-[9.5px] text-ink-mute">
              {usedLabel(usage[current.id] ?? 0)}
            </span>
          </span>

          <IconButton
            label={`${t("moods.moveUp")} · ${current.name}`}
            disabled={currentIndex <= 0}
            onClick={() => {
              move(currentIndex, currentIndex - 1);
            }}
          >
            ↑
          </IconButton>
          <IconButton
            label={`${t("moods.moveDown")} · ${current.name}`}
            disabled={currentIndex < 0 || currentIndex >= kit.moods.length - 1}
            onClick={() => {
              move(currentIndex, currentIndex + 1);
            }}
          >
            ↓
          </IconButton>
          <button
            type="button"
            onClick={() => {
              openEditor(current);
            }}
            className="shrink-0 rounded-field bg-primary px-2.5 py-1.5 text-[11px] text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
          >
            {t("moods.edit")}
          </button>
          <IconButton
            label={`${t("common.duplicate")} · ${current.name}`}
            onClick={() => {
              dispatch({ type: "mood/duplicate", moodId: current.id });
            }}
          >
            <DuplicateIcon />
          </IconButton>
          <IconButton
            label={
              (usage[current.id] ?? 0) > 0
                ? t("moods.removeBlocked")
                : `${t("common.remove")} · ${current.name}`
            }
            danger
            disabled={(usage[current.id] ?? 0) > 0}
            onClick={() => {
              // docs/05 §3: destructive actions confirm. FR-5.6's E_REF is
              // still the backstop; this only stops the user reaching a
              // refusal the panel could already see coming.
              if (!globalThis.confirm(t("confirm.removeMood"))) return;
              dispatch({ type: "mood/remove", moodId: current.id });
              setSelected(
                kit.moods.find((x) => x.id !== current.id)?.id ?? null,
              );
            }}
          >
            <TrashIcon />
          </IconButton>
        </div>
      )}

      {draft &&
        (() => {
          const editor = (
            <MoodEditor
              draft={draft}
              bubble={bubble}
              t={t}
              onChange={editDraft}
              onCancel={cancelEdit}
              onSave={saveEdit}
            />
          );
          return overlayHost ? createPortal(editor, overlayHost) : editor;
        })()}
    </div>
  );
}

function MoodEditor({
  draft,
  bubble,
  t,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Mood;
  bubble: Bubble;
  t: (k: MessageKey) => string;
  onChange: (next: Mood) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  /**
   * An editing mode, not a stored property: while it is on, every edit to one
   * eye is mirrored onto the other as it is made. Off by default, because a
   * mood whose two eyes differ is most of what makes a mood.
   */
  const [linked, setLinked] = useState(false);
  const override = draft.colorOverride;
  const setOverride = (next: ColorOverride) => {
    onChange({ ...draft, colorOverride: next });
  };
  /** An override with no channels left is no override at all. */
  const withChannel = (
    key: "body" | "eyes",
    value: string | undefined,
  ): ColorOverride => {
    const body = key === "body" ? value : override?.body;
    const eyes = key === "eyes" ? value : override?.eyes;
    const next: Exclude<ColorOverride, null> = {};
    if (body !== undefined) next.body = body;
    if (eyes !== undefined) next.eyes = eyes;
    return body === undefined && eyes === undefined ? null : next;
  };

  return (
    <Modal
      title={t("moods.editTitle")}
      closeLabel={t("common.close")}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onSave}
            className="rounded-field bg-primary px-3 py-1.5 text-xs text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
          >
            {t("common.save")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-field bg-panel px-3 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
          >
            {t("common.cancel")}
          </button>
        </>
      }
    >
      <label className="block text-xs">
        <span className="text-ink-dim">{t("moods.name")}</span>
        <input
          type="text"
          value={draft.name}
          aria-label={t("moods.name")}
          onChange={(e) => {
            onChange({ ...draft, name: e.target.value });
          }}
          className="mt-1 w-full rounded-field border border-line bg-stage px-2.5 py-2 text-[12.5px] text-ink"
        />
      </label>

      {/* Linked is an editing mode, not something the mood stores: it mirrors
          each edit onto the other eye as it is made, which is the same rule
          FR-3.3 applies to the resting face. `mirrorEye` is the one function
          that knows which axes are handed, so both paths ask it. */}
      <Segmented<"linked" | "free">
        label={t("moods.eyeLink")}
        value={linked ? "linked" : "free"}
        options={[
          { value: "linked", label: t("moods.linkedEyes") },
          { value: "free", label: t("moods.independentEyes") },
        ]}
        onChange={(v) => {
          const on = v === "linked";
          setLinked(on);
          // Turning it on brings the two sides into step at once, rather than
          // leaving them apart until the next edit happens to touch one.
          if (on) onChange({ ...draft, right: mirrorEye(draft.left) });
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <EyeColumn
          title={t("look.leftEye")}
          eye={draft.left}
          t={t}
          onChange={(left) => {
            onChange({
              ...draft,
              left,
              ...(linked ? { right: mirrorEye(left) } : {}),
            });
          }}
        />
        <EyeColumn
          title={t("look.rightEye")}
          eye={draft.right}
          t={t}
          onChange={(right) => {
            onChange({
              ...draft,
              right,
              ...(linked ? { left: mirrorEye(right) } : {}),
            });
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          onChange({ ...draft, right: mirrorEye(draft.left) });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-field border border-line bg-panel-2 px-2 py-2 text-xs text-ink transition-colors duration-150 ease-out hover:border-outline"
      >
        <MirrorIcon />
        {t("moods.mirror")}
      </button>

      <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-panel-2 p-2.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[9px] font-semibold tracking-[0.08em] text-ink-dim uppercase">
            {t("moods.colorOverride")}
          </span>
          <button
            type="button"
            onClick={() => {
              setOverride(null);
            }}
            className="text-[9.5px] text-accent transition-colors duration-150 ease-out hover:text-ink"
          >
            {t("moods.clearOverride")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <OverrideRow
            label={t("look.bodyColor")}
            colorLabel={t("moods.overrideBodyColor")}
            value={override?.body}
            fallback={bubble.colors.body}
            onToggle={(on) => {
              setOverride(
                withChannel(
                  "body",
                  on ? (override?.body ?? DEFAULT_OVERRIDE) : undefined,
                ),
              );
            }}
            onColor={(v) => {
              setOverride(withChannel("body", v));
            }}
          />
          <OverrideRow
            label={t("look.eyeColor")}
            colorLabel={t("moods.overrideEyesColor")}
            value={override?.eyes}
            fallback={bubble.colors.eyes}
            onToggle={(on) => {
              setOverride(
                withChannel(
                  "eyes",
                  on ? (override?.eyes ?? DEFAULT_OVERRIDE) : undefined,
                ),
              );
            }}
            onColor={(v) => {
              setOverride(withChannel("eyes", v));
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * One eye, as the artboard lays it out: the offset as a place, then scale and
 * rotation as compact rows.
 *
 * This was seven stacked sliders per eye — fourteen in a 360px column, which
 * is a scroll tunnel where the only thing worth looking at is the stage
 * behind it. The offset is now a pad, and the five that remain are one line
 * each.
 */
function EyeColumn({
  title,
  eye,
  t,
  onChange,
}: {
  title: string;
  eye: MoodEye;
  t: (k: MessageKey) => string;
  onChange: (next: MoodEye) => void;
}) {
  const row = (
    key: keyof MoodEye,
    axis: string,
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
  ) => (
    <span key={key} className="flex h-4.5 items-center gap-1.5">
      <span className="w-2.5 text-[9.5px] text-ink-dim">{axis}</span>
      <RangeInput
        label={`${title} · ${t(FIELD_LABELS[key])}`}
        value={eye[key]}
        min={min}
        max={max}
        step={step}
        onChange={(v) => {
          onChange({ ...eye, [key]: v });
        }}
        className="min-w-0 flex-1"
      />
      <span className="w-7 text-right text-[9.5px] tabular-nums">
        {format(eye[key])}
      </span>
    </span>
  );

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[9px] font-semibold tracking-[0.08em] text-ink-dim uppercase">
        {title}
      </span>

      <XYPad
        label={title}
        xLabel={t("look.offsetX")}
        yLabel={t("look.offsetY")}
        x={eye.offsetX}
        y={eye.offsetY}
        range={OFFSET_RANGE}
        onChange={(offsetX, offsetY) => {
          onChange({ ...eye, offsetX, offsetY });
        }}
      />

      <span className="mt-0.5 text-[9px] font-semibold tracking-[0.08em] text-ink-mute uppercase">
        {t("common.scale")}
      </span>
      {row("scaleX", "X", 0.3, 2, 0.05, scale)}
      {row("scaleY", "Y", 0.3, 2, 0.05, scale)}

      <span className="mt-0.5 text-[9px] font-semibold tracking-[0.08em] text-ink-mute uppercase">
        {t("common.rotation")}
      </span>
      {row("rotationXDeg", "X", -30, 30, 1, degrees)}
      {row("rotationYDeg", "Y", -30, 30, 1, degrees)}
      {row("rotationZDeg", "Z", -30, 30, 1, degrees)}
    </div>
  );
}

/** One optional colour channel: a switch that adds it, and its swatch. */
function OverrideRow({
  label,
  colorLabel,
  value,
  fallback,
  onToggle,
  onColor,
}: {
  label: string;
  colorLabel: string;
  value: string | undefined;
  fallback: string;
  onToggle: (on: boolean) => void;
  onColor: (v: string) => void;
}) {
  const on = value !== undefined;
  return (
    <div className="flex items-center gap-2 text-xs text-ink">
      <input
        type="checkbox"
        checked={on}
        aria-label={label}
        onChange={(e) => {
          onToggle(e.target.checked);
        }}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <input
        type="color"
        disabled={!on}
        value={value ?? fallback}
        aria-label={colorLabel}
        onChange={(e) => {
          onColor(e.target.value);
        }}
        className="h-7 w-12 shrink-0 cursor-pointer rounded-field border border-line bg-panel disabled:opacity-40"
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0 text-ink-dim"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.4 10.4 13.6 13.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <rect
        x="5.4"
        y="2.4"
        width="8.2"
        height="8.2"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M10.6 13.6H4.4a2 2 0 0 1-2-2V5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <path
        d="M2.8 4.4h10.4M6.4 4.4V3a1 1 0 0 1 1-1h1.2a1 1 0 0 1 1 1v1.4M4.2 4.4l.6 8a1.4 1.4 0 0 0 1.4 1.3h3.6a1.4 1.4 0 0 0 1.4-1.3l.6-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MirrorIcon() {
  return (
    <svg viewBox="0 0 18 14" className="h-3 w-3.5" aria-hidden="true">
      <path
        d="M9 1.4v11.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
      <path
        d="M6.6 4 3.4 7l3.2 3M11.4 4l3.2 3-3.2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
