// Primary surface: shape family, size, position and orientation
// (FR-2.1, FR-2.2, FR-2.6, FR-2.7).
import { NumberField, Slider, type SectionProps } from "./fields";
import { Card, RangeInput, Segmented } from "../../ui";
import { DEFAULT_BODY_WIDTH } from "../../../../domain/document/create";
import { SHAPE_FAMILIES } from "../../../../domain/geometry/shapes";
import type { ShapeFamily } from "../../../../domain/document/types";
import type { MessageKey } from "../../../i18n";

/**
 * Exhaustive by construction: a family added to the union without a label here
 * fails typecheck rather than reaching the picker as a blank button.
 */
const SHAPE_LABELS: Record<ShapeFamily, MessageKey> = {
  round: "look.shapeRound",
  organic: "look.shapeOrganic",
  drop: "look.shapeDrop",
  cube: "look.shapeCube",
  capsule: "look.shapeCapsule",
  cylinder: "look.shapeCylinder",
  cone: "look.shapeCone",
  diamond: "look.shapeDiamond",
};

export function SurfaceSection({ bubble, dispatch, t }: SectionProps) {
  const surface = bubble.body.surface;
  /**
   * One knob for the whole body, stated as a percentage of the width a new
   * bubble starts at. Derived rather than stored: the three dimensions are the
   * truth, and a stored scale beside them is a second truth that can disagree.
   *
   * Depth scales with the other two. A body that grew in width and height
   * alone would flatten as it grew, which is a different character rather than
   * a bigger one — the surface is a solid (FR-2.8), not an outline.
   */
  const sizePct = Math.round((surface.width / DEFAULT_BODY_WIDTH) * 100);
  const setSize = (pct: number): void => {
    const factor = (pct / 100) * (DEFAULT_BODY_WIDTH / surface.width);
    dispatch({
      type: "surface/patch",
      patch: {
        width: Math.round(surface.width * factor),
        height: Math.round(surface.height * factor),
        depth: Math.round(surface.depth * factor),
      },
    });
  };
  return (
    // The family is the one thing about this card worth reading while it is
    // shut, so it rides in the header (docs/05 §2).
    <Card title={t("look.surface")} state={t(SHAPE_LABELS[surface.shape])}>
      {/* FR-2.6: the outline family is a property of the bubble. */}
      <Segmented<ShapeFamily>
        label={t("look.shape")}
        value={surface.shape}
        options={SHAPE_FAMILIES.map((value) => ({
          value,
          label: t(SHAPE_LABELS[value]),
        }))}
        onChange={(shape) => {
          dispatch({ type: "surface/patch", patch: { shape } });
        }}
      />
      {/* FR-2.7: only the organic family has bumps to tune. */}
      {surface.shape === "organic" && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t("look.lobes")}
            value={surface.lobes ?? 5}
            min={3}
            max={10}
            onChange={(v) => {
              dispatch({ type: "surface/patch", patch: { lobes: v } });
            }}
          />
          <NumberField
            label={t("look.wobble")}
            value={surface.wobble ?? 0}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => {
              dispatch({ type: "surface/patch", patch: { wobble: v } });
            }}
          />
          <NumberField
            label={t("look.seed")}
            value={surface.seed ?? 0}
            onChange={(v) => {
              dispatch({
                type: "surface/patch",
                patch: { seed: Math.round(v) },
              });
            }}
          />
        </div>
      )}
      {/* The size sits above the three it drives, because it is the thing most
          often reached for and the fields below are what it is made of. The
          slider is for finding a size by looking at the stage; the field
          beside it is for stating one. Both commit a single patch, so the
          three dimensions can never land a frame apart. */}
      <div className="flex items-end gap-2.5">
        {/* The slider carries no visible label of its own: the field beside it
            names the pair, and a second "Tamaño" over a second copy of the
            number reads as two controls rather than two ways into one. */}
        <span className="flex min-w-0 flex-1 pb-1.5">
          <RangeInput
            label={t("look.sizeSlider")}
            value={sizePct}
            min={25}
            max={200}
            step={1}
            onChange={setSize}
            className="min-w-0 flex-1"
          />
        </span>
        <span className="w-21 shrink-0">
          <NumberField
            label={t("look.size")}
            value={sizePct}
            min={25}
            max={200}
            unit="%"
            onChange={setSize}
          />
        </span>
      </div>

      {/* Two to a row: a 360px column fits them, and a stack of eight
          single-file fields is a scroll tunnel. */}
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t("look.width")}
          value={surface.width}
          min={1}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { width: v } });
          }}
        />
        <NumberField
          label={t("look.height")}
          value={surface.height}
          min={1}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { height: v } });
          }}
        />
        <NumberField
          label={t("look.depth")}
          value={surface.depth}
          min={1}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { depth: v } });
          }}
        />
        <NumberField
          label={t("look.roundness")}
          value={surface.roundness}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { roundness: v } });
          }}
        />
        <NumberField
          label={t("look.x")}
          value={surface.x}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { x: v } });
          }}
        />
        <NumberField
          label={t("look.y")}
          value={surface.y}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { y: v } });
          }}
        />
        <NumberField
          label={t("look.perspective")}
          value={surface.perspective}
          min={0}
          max={1}
          step={0.05}
          unit="×"
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { perspective: v } });
          }}
        />
      </div>

      <Slider
        label={t("look.rotation")}
        value={surface.rotationDeg}
        min={-180}
        max={180}
        step={1}
        onChange={(v) => {
          dispatch({ type: "surface/patch", patch: { rotationDeg: v } });
        }}
      />
    </Card>
  );
}
