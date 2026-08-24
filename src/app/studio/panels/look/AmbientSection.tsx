// Ambient idle motion (FR-7.1): the sinusoidal breathing applied while the
// character rests. Amplitudes are units, periods milliseconds.
import { NumberField, type SectionProps } from "./fields";
import { Card } from "../../ui";

export function AmbientSection({ bubble, dispatch, t }: SectionProps) {
  const ambient = bubble.ambient;
  return (
    <Card title={t("look.ambient")}>
      <label className="flex items-center gap-2 text-xs text-ink">
        <input
          type="checkbox"
          checked={ambient.enabled}
          aria-label={t("look.ambientEnabled")}
          onChange={(e) => {
            dispatch({
              type: "ambient/patch",
              patch: { enabled: e.target.checked },
            });
          }}
        />
        {t("look.ambientEnabled")}
      </label>
      <NumberField
        label={t("look.bodyAmplitude")}
        value={ambient.bodyAmplitude}
        min={0}
        step={0.5}
        unit="u"
        onChange={(v) => {
          dispatch({ type: "ambient/patch", patch: { bodyAmplitude: v } });
        }}
      />
      <NumberField
        label={t("look.bodyPeriod")}
        value={ambient.bodyPeriodMs}
        min={100}
        step={100}
        onChange={(v) => {
          dispatch({ type: "ambient/patch", patch: { bodyPeriodMs: v } });
        }}
      />
      <NumberField
        label={t("look.eyeAmplitude")}
        value={ambient.eyeAmplitude}
        min={0}
        step={0.1}
        unit="u"
        onChange={(v) => {
          dispatch({ type: "ambient/patch", patch: { eyeAmplitude: v } });
        }}
      />
      <NumberField
        label={t("look.eyePeriod")}
        value={ambient.eyePeriodMs}
        min={100}
        step={100}
        onChange={(v) => {
          dispatch({ type: "ambient/patch", patch: { eyePeriodMs: v } });
        }}
      />
    </Card>
  );
}
