// Extra primitives: add, edit, reorder in z, remove (FR-2.3, FR-2.4).
import { ColorField, NumberField, type SectionProps } from "./fields";
import { Card } from "../../ui";
import type {
  ColorRole,
  ExtraKind,
  ExtraPrimitive,
} from "../../../../domain/document/types";
import { MAX_EXTRAS } from "../../../../domain/document/validate";

const KINDS: ExtraKind[] = ["blob", "capsule", "circle", "ring"];
const ROLES: ColorRole[] = ["body", "accent", "custom"];

/** A new primitive starts visible and in front of everything already there. */
function newExtra(kind: ExtraKind, z: number): Omit<ExtraPrimitive, "id"> {
  return {
    kind,
    width: 48,
    height: 48,
    depth: 41,
    roundness: 0.9,
    x: 0,
    y: 0,
    rotationDeg: 0,
    z,
    colorRole: "accent",
    color: "#8be9ff",
  };
}

export function ExtrasSection({ bubble, dispatch, t }: SectionProps) {
  // Back-to-front, the same order the renderer draws them in.
  const extras = [...bubble.body.extras].sort((a, b) => a.z - b.z);

  /** Swaps z with the neighbour, so ordering stays a property of the data. */
  const swapZ = (index: number, delta: number) => {
    const current = extras.at(index);
    const neighbour = extras.at(index + delta);
    if (!current || !neighbour) return;
    dispatch({
      type: "extra/update",
      extraId: current.id,
      patch: { z: neighbour.z },
    });
    dispatch({
      type: "extra/update",
      extraId: neighbour.id,
      patch: { z: current.z },
    });
  };

  return (
    <Card
      title={t("look.extras")}
      state={
        <span className="rounded-full bg-panel px-1.5 py-0.5 tabular-nums">
          {extras.length}/{MAX_EXTRAS}
        </span>
      }
    >
      <label className="flex items-center justify-between text-xs text-ink-dim">
        {t("look.addExtra")}
        <select
          value=""
          aria-label={t("look.addExtra")}
          disabled={extras.length >= MAX_EXTRAS}
          onChange={(e) => {
            const kind = e.target.value as ExtraKind | "";
            if (!kind) return;
            if (extras.length >= MAX_EXTRAS) return;
            const topZ = extras.at(-1)?.z ?? -1;
            dispatch({ type: "extra/add", extra: newExtra(kind, topZ + 1) });
          }}
          className="rounded-field border border-line bg-panel px-2 py-1 text-xs text-ink"
        >
          <option value="">+</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      {extras.map((extra, index) => (
        <fieldset
          key={extra.id}
          aria-label={`${extra.kind} ${String(index + 1)}`}
          className="space-y-1.5 rounded-field border border-line bg-panel/50 p-2"
        >
          <legend className="px-1 text-[10px] tracking-wide text-ink-dim uppercase">
            {extra.kind} {index + 1}
          </legend>

          <div className="flex gap-1">
            <button
              type="button"
              aria-label={t("look.zUp")}
              disabled={index === extras.length - 1}
              onClick={() => {
                swapZ(index, 1);
              }}
              className="rounded-field bg-panel px-2 py-1 text-xs text-ink disabled:opacity-40"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={t("look.zDown")}
              disabled={index === 0}
              onClick={() => {
                swapZ(index, -1);
              }}
              className="rounded-field bg-panel px-2 py-1 text-xs text-ink disabled:opacity-40"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={t("common.remove")}
              onClick={() => {
                dispatch({ type: "extra/remove", extraId: extra.id });
              }}
              className="ml-auto rounded-field bg-danger/15 px-2 py-1 text-xs text-danger"
            >
              ✕
            </button>
          </div>

          <NumberField
            label={t("look.width")}
            value={extra.width}
            min={1}
            unit="u"
            onChange={(v) => {
              dispatch({
                type: "extra/update",
                extraId: extra.id,
                patch: { width: v },
              });
            }}
          />
          <NumberField
            label={t("look.height")}
            value={extra.height}
            min={1}
            unit="u"
            onChange={(v) => {
              dispatch({
                type: "extra/update",
                extraId: extra.id,
                patch: { height: v },
              });
            }}
          />
          <NumberField
            label={t("look.depth")}
            value={extra.depth}
            min={1}
            unit="u"
            onChange={(v) => {
              dispatch({
                type: "extra/update",
                extraId: extra.id,
                patch: { depth: v },
              });
            }}
          />
          <NumberField
            label={t("look.x")}
            value={extra.x}
            unit="u"
            onChange={(v) => {
              dispatch({
                type: "extra/update",
                extraId: extra.id,
                patch: { x: v },
              });
            }}
          />
          <NumberField
            label={t("look.y")}
            value={extra.y}
            unit="u"
            onChange={(v) => {
              dispatch({
                type: "extra/update",
                extraId: extra.id,
                patch: { y: v },
              });
            }}
          />
          <NumberField
            label={t("look.rotation")}
            value={extra.rotationDeg}
            unit="°"
            onChange={(v) => {
              dispatch({
                type: "extra/update",
                extraId: extra.id,
                patch: { rotationDeg: v },
              });
            }}
          />

          <label className="flex items-center justify-between text-xs text-ink-dim">
            {t("look.colorRole")}
            <select
              value={extra.colorRole}
              aria-label={`${t("look.colorRole")} ${String(index + 1)}`}
              onChange={(e) => {
                dispatch({
                  type: "extra/update",
                  extraId: extra.id,
                  patch: { colorRole: e.target.value as ColorRole },
                });
              }}
              className="rounded-field border border-line bg-panel px-2 py-1 text-xs text-ink"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {extra.colorRole === "custom" && (
            <ColorField
              label={`${t("look.colorRole")} ${String(index + 1)} hex`}
              value={extra.color}
              onChange={(v) => {
                dispatch({
                  type: "extra/update",
                  extraId: extra.id,
                  patch: { color: v },
                });
              }}
            />
          )}
        </fieldset>
      ))}
    </Card>
  );
}
