// Eyes: resting shape, spacing, and per-side placement (FR-3.1..FR-3.3).
// While linked, one column edits both sides — the mirroring itself lives in
// mutate.updateEyePlacement, so this only decides what to show.
import { NumberField, Slider, type SectionProps } from "./fields";
import { Card } from "../../ui";
import type { EyePlacement } from "../../../../domain/document/types";

export function EyesSection({ bubble, dispatch, t }: SectionProps) {
  const face = bubble.restingFace;

  const side = (which: "left" | "right", placement: EyePlacement) => (
    <fieldset
      aria-label={which === "left" ? t("look.leftEye") : t("look.rightEye")}
      className="rounded-field border border-line bg-panel/50 p-2"
    >
      <legend className="px-1 text-[10px] tracking-wide text-ink-dim uppercase">
        {which === "left" ? t("look.leftEye") : t("look.rightEye")}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t("look.offsetX")}
          value={placement.offsetX}
          unit="u"
          onChange={(v) => {
            dispatch({
              type: "eye/placement",
              side: which,
              patch: { offsetX: v },
            });
          }}
        />
        <NumberField
          label={t("look.offsetY")}
          value={placement.offsetY}
          unit="u"
          onChange={(v) => {
            dispatch({
              type: "eye/placement",
              side: which,
              patch: { offsetY: v },
            });
          }}
        />
        <NumberField
          label={t("look.eyeRotation")}
          value={placement.rotationDeg}
          unit="°"
          onChange={(v) => {
            dispatch({
              type: "eye/placement",
              side: which,
              patch: { rotationDeg: v },
            });
          }}
        />
        <NumberField
          label={t("look.scaleX")}
          value={placement.scaleX}
          step={0.05}
          unit="×"
          onChange={(v) => {
            dispatch({
              type: "eye/placement",
              side: which,
              patch: { scaleX: v },
            });
          }}
        />
        <NumberField
          label={t("look.scaleY")}
          value={placement.scaleY}
          step={0.05}
          unit="×"
          onChange={(v) => {
            dispatch({
              type: "eye/placement",
              side: which,
              patch: { scaleY: v },
            });
          }}
        />
      </div>
    </fieldset>
  );

  return (
    // The link is a property of the pair, so it belongs on the header of the
    // card that holds the pair rather than in a row among the numbers.
    <Card
      title={t("look.eyes")}
      aside={
        <label className="flex items-center gap-1.5 pr-1 text-[10px] text-ink">
          {t("look.linked")}
          <input
            type="checkbox"
            checked={face.linked}
            aria-label={t("look.linked")}
            onChange={(e) => {
              dispatch({ type: "eye/linked", linked: e.target.checked });
            }}
          />
        </label>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t("look.eyeWidth")}
          value={face.eye.width}
          min={1}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "eye/shape", patch: { width: v } });
          }}
        />
        <NumberField
          label={t("look.eyeHeight")}
          value={face.eye.height}
          min={1}
          unit="u"
          onChange={(v) => {
            dispatch({ type: "eye/shape", patch: { height: v } });
          }}
        />
        <NumberField
          label={t("look.eyeRoundness")}
          value={face.eye.roundness}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => {
            dispatch({ type: "eye/shape", patch: { roundness: v } });
          }}
        />
      </div>
      <Slider
        label={t("look.spacing")}
        value={face.spacing}
        min={10}
        max={200}
        step={1}
        onChange={(v) => {
          dispatch({ type: "eye/spacing", spacing: v });
        }}
      />
      <div className="space-y-2">
        {side("left", face.left)}
        {!face.linked && side("right", face.right)}
      </div>
    </Card>
  );
}
