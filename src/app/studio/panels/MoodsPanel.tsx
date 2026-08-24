// Moods panel: a grid of true mini-renders, a per-card menu, and a modal
// editor holding the relative per-eye deltas and the colour override (FR-4).
//
// Edits are cancelable (FR-4.4): the editor works on a draft that previews on
// the stage every change and reaches the document only on Save. The modal is
// scoped to the inspector column, so the stage stays visible behind it — which
// is the whole point of previewing while you drag a slider.
import { useState } from "react";
import { createPortal } from "react-dom";
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
import { Card, Menu, MenuItem, Modal, RangeInput } from "../ui";

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
 * FR-4.1: the seven deltas a mood stores per eye, each with the range docs/05
 * §2 gives it and the unit it is measured in.
 */
const MOOD_FIELDS: {
  key: keyof MoodEye;
  label: MessageKey;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  { key: "rotationXDeg", label: "moods.rotationX", min: -30, max: 30, step: 1, unit: "°" },
  { key: "rotationYDeg", label: "moods.rotationY", min: -30, max: 30, step: 1, unit: "°" },
  { key: "rotationZDeg", label: "moods.rotationZ", min: -30, max: 30, step: 1, unit: "°" },
  { key: "scaleX", label: "look.scaleX", min: 0.3, max: 2, step: 0.05, unit: "×" },
  { key: "scaleY", label: "look.scaleY", min: 0.3, max: 2, step: 0.05, unit: "×" },
  { key: "offsetX", label: "look.offsetX", min: -40, max: 40, step: 1, unit: "u" },
  { key: "offsetY", label: "look.offsetY", min: -40, max: 40, step: 1, unit: "u" },
];

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
  const [menuFor, setMenuFor] = useState<string | null>(null);
  /** The mood being edited, as a draft; null when the editor is closed. */
  const [draft, setDraft] = useState<Mood | null>(null);

  /** FR-4.5: cards show the mood on the real character, not an icon. */
  const thumbnail = (sample: MoodSample): string =>
    sceneToSvg(moodScene(bubble, sample), { background: null, size: 44 });

  const select = (id: string) => {
    setSelected(id);
    const picked = kit.moods.find((m) => m.id === id);
    if (picked) onPreview(sampleOf(picked));
  };

  const openEditor = (mood: Mood) => {
    setMenuFor(null);
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

  const move = (index: number, to: number) => {
    const ids = kit.moods.map((m) => m.id);
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[index], next[to]] = [ids[to], ids[index]] as [string, string];
    dispatch({ type: "mood/reorder", ids: next });
    setMenuFor(null);
  };

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-4 gap-1.5">
        {kit.moods.map((m, i) => (
          <li key={m.id} className="relative">
            <button
              type="button"
              onClick={() => {
                select(m.id);
              }}
              onDoubleClick={() => {
                openEditor(m);
              }}
              className={`flex w-full flex-col items-center gap-1 rounded-field p-1.5 text-[10px] transition-colors duration-150 ease-out ${
                m.id === selected
                  ? "bg-primary text-white"
                  : "bg-panel-2 text-ink-dim hover:text-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none block h-11 w-11"
                dangerouslySetInnerHTML={{ __html: thumbnail(sampleOf(m)) }}
              />
              <span className="w-full truncate text-center">{m.name}</span>
            </button>

            <button
              type="button"
              aria-label={`${t("moods.menu")} · ${m.name}`}
              title={t("moods.menu")}
              aria-haspopup="menu"
              aria-expanded={menuFor === m.id}
              onClick={() => {
                setMenuFor((cur) => (cur === m.id ? null : m.id));
              }}
              className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full border border-line bg-panel text-[9px] leading-none text-ink-dim opacity-60 transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:opacity-100"
            >
              ⋯
            </button>

            {menuFor === m.id && (
              <Menu
                label={m.name}
                onClose={() => {
                  setMenuFor(null);
                }}
                className="absolute top-full left-0 z-20 mt-1 w-40"
              >
                <MenuItem
                  label={t("moods.edit")}
                  onClick={() => {
                    openEditor(m);
                  }}
                />
                <MenuItem
                  label={t("common.duplicate")}
                  onClick={() => {
                    dispatch({ type: "mood/duplicate", moodId: m.id });
                    setMenuFor(null);
                  }}
                />
                <MenuItem
                  label={t("moods.moveUp")}
                  disabled={i === 0}
                  onClick={() => {
                    move(i, i - 1);
                  }}
                />
                <MenuItem
                  label={t("moods.moveDown")}
                  disabled={i === kit.moods.length - 1}
                  onClick={() => {
                    move(i, i + 1);
                  }}
                />
                <MenuItem
                  label={t("common.remove")}
                  danger
                  onClick={() => {
                    setMenuFor(null);
                    // docs/05 §3: destructive actions confirm. A referenced
                    // mood is still refused afterwards (E_REF, FR-5.6).
                    if (!globalThis.confirm(t("confirm.removeMood"))) return;
                    dispatch({ type: "mood/remove", moodId: m.id });
                    setSelected(
                      kit.moods.find((x) => x.id !== m.id)?.id ?? null,
                    );
                  }}
                />
              </Menu>
            )}
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: "mood/add",
                name: `mood ${String(kit.moods.length + 1)}`,
              });
            }}
            className="flex min-h-[4.25rem] w-full items-center justify-center rounded-field border border-dashed border-line px-1 text-center text-[10px] leading-tight text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
          >
            + {t("moods.add")}
          </button>
        </li>
      </ul>

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
      title={t("moods.edit")}
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
          className="mt-1 w-full rounded-field border border-line bg-panel px-2 py-1.5 text-xs text-ink"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          onChange({ ...draft, right: mirrorEye(draft.left) });
        }}
        className="w-full rounded-field bg-panel px-2 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
      >
        {t("moods.mirror")}
      </button>

      <EyeCard
        title={t("look.leftEye")}
        eye={draft.left}
        t={t}
        onChange={(left) => {
          onChange({ ...draft, left });
        }}
      />
      <EyeCard
        title={t("look.rightEye")}
        eye={draft.right}
        t={t}
        onChange={(right) => {
          onChange({ ...draft, right });
        }}
      />

      <Card title={t("moods.colorOverride")}>
        <OverrideRow
          label={t("look.bodyColor")}
          colorLabel={t("moods.overrideBodyColor")}
          value={override?.body}
          fallback={bubble.colors.body}
          onToggle={(on) => {
            setOverride(
              withChannel("body", on ? (override?.body ?? DEFAULT_OVERRIDE) : undefined),
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
              withChannel("eyes", on ? (override?.eyes ?? DEFAULT_OVERRIDE) : undefined),
            );
          }}
          onColor={(v) => {
            setOverride(withChannel("eyes", v));
          }}
        />
        <button
          type="button"
          onClick={() => {
            setOverride(null);
          }}
          className="w-full rounded-field bg-panel px-2 py-1.5 text-xs text-ink-dim transition-colors duration-150 ease-out hover:text-ink"
        >
          {t("moods.clearOverride")}
        </button>
      </Card>
    </Modal>
  );
}

function EyeCard({
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
  // Both eyes open: the common edit is to compare the two, and the card's own
  // collapse is there for the user who wants one out of the way.
  return (
    <Card title={title}>
      {MOOD_FIELDS.map((f) => {
        // Both eyes carry the same seven fields, so each control names its
        // side as well as its field — otherwise the two sets share a name.
        const label = `${title} · ${t(f.label)}`;
        return (
          <label key={f.key} className="block text-xs">
            <span className="flex justify-between text-ink-dim">
              {t(f.label)}
              <span className="tabular-nums text-ink">
                {String(Math.round(eye[f.key] * 100) / 100)}
                {f.unit}
              </span>
            </span>
            <RangeInput
              label={label}
              value={eye[f.key]}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(v) => {
                onChange({ ...eye, [f.key]: v });
              }}
              className="mt-1 w-full"
            />
          </label>
        );
      })}
    </Card>
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
