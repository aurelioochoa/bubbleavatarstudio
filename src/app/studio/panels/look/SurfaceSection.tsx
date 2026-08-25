// Primary surface: shape family, size, position and orientation
// (FR-2.1, FR-2.2, FR-2.6, FR-2.7).
import { NumberField, Slider, type SectionProps } from "./fields";
import { Card, Segmented } from "../../ui";
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
  capsule: "look.shapeCapsule",
  cylinder: "look.shapeCylinder",
  cone: "look.shapeCone",
  diamond: "look.shapeDiamond",
};

export function SurfaceSection({ bubble, dispatch, t }: SectionProps) {
  const surface = bubble.body.surface;
  return (
    <Card title={t("look.surface")}>
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
        <>
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
        </>
      )}
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
