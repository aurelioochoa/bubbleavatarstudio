// Primary surface: size, shape, position and orientation (FR-2.1, FR-2.2).
import { NumberField, SectionTitle, Slider, type SectionProps } from "./fields";

export function SurfaceSection({ bubble, dispatch, t }: SectionProps) {
  const surface = bubble.body.surface;
  return (
    <section className="space-y-2">
      <SectionTitle>{t("look.surface")}</SectionTitle>
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
    </section>
  );
}
