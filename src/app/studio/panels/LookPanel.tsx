// Look panel: surface, colors, eyes, extras, ambient (FR-2, FR-3, FR-7).
// Each section is its own component; they share the field primitives in
// ./look/fields so the numeric-input rule of docs/05 §3 lives in one place.
import { AmbientSection } from "./look/AmbientSection";
import { ColorField, SectionTitle } from "./look/fields";
import { EyesSection } from "./look/EyesSection";
import { ExtrasSection } from "./look/ExtrasSection";
import { SurfaceSection } from "./look/SurfaceSection";
import type { SectionProps } from "./look/fields";

export type PanelProps = SectionProps;

export function LookPanel({ bubble, dispatch, t }: PanelProps) {
  return (
    <div className="space-y-5">
      <SurfaceSection bubble={bubble} dispatch={dispatch} t={t} />

      <section className="space-y-2">
        <SectionTitle>{t("look.colors")}</SectionTitle>
        <ColorField
          label={t("look.bodyColor")}
          value={bubble.colors.body}
          onChange={(v) => {
            dispatch({ type: "colors/patch", patch: { body: v } });
          }}
        />
        <ColorField
          label={t("look.accentColor")}
          value={bubble.colors.accent}
          onChange={(v) => {
            dispatch({ type: "colors/patch", patch: { accent: v } });
          }}
        />
        <ColorField
          label={t("look.eyeColor")}
          value={bubble.colors.eyes}
          onChange={(v) => {
            dispatch({ type: "colors/patch", patch: { eyes: v } });
          }}
        />
      </section>

      <EyesSection bubble={bubble} dispatch={dispatch} t={t} />
      <ExtrasSection bubble={bubble} dispatch={dispatch} t={t} />
      <AmbientSection bubble={bubble} dispatch={dispatch} t={t} />
    </div>
  );
}
