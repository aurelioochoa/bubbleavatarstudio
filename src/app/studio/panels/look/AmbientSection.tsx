// Ambient idle motion (FR-7.1): the sinusoidal breathing applied while the
// character rests. Amplitudes are units, periods milliseconds.
import { NumberField, type SectionProps } from "./fields";
import { Card } from "../../ui";

export function AmbientSection({ bubble, dispatch, t }: SectionProps) {
  const ambient = bubble.ambient;
  return (
    <Card
      title={t("look.ambient")}
      aside={
        <label className="flex items-center gap-1.5 pr-1 text-[10px] text-ink">
          {t("look.ambientEnabled")}
          <input
            type="checkbox"
            className="touch-target"
            checked={ambient.enabled}
            aria-label={t("look.ambientEnabled")}
            onChange={(e) => {
              dispatch({
                type: "ambient/patch",
                patch: { enabled: e.target.checked },
              });
            }}
          />
        </label>
      }
    >
      <div className="touch-target grid grid-cols-2 gap-2">
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
      </div>
    </Card>
  );
}
