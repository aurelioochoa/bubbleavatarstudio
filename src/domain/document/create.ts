import { STARTER_LOOPS } from "../content/loops";
import { STARTER_MOODS } from "../content/moods";
import type { Random } from "../ids";
import { newId } from "../ids";
import type { Bubble, Kit, StudioDocument } from "./types";

export const DEFAULT_COLORS = {
  body: "#6c7bff",
  accent: "#ffffff",
  eyes: "#1c2033",
} as const;

/**
 * The width a new body starts at. Exported because the Look panel's size
 * control states a percentage, and a percentage needs a stated 100% — reading
 * it from here is what stops the label drifting from the template.
 */
export const DEFAULT_BODY_WIDTH = 220;

/** The same, for the eye the Eyes card sizes as one shape. */
export const DEFAULT_EYE_WIDTH = 34;

export function createBubble(name: string, id = newId("bbl")): Bubble {
  return {
    id,
    name: name.trim(),
    body: {
      surface: {
        kind: "blob",
        shape: "round",
        width: DEFAULT_BODY_WIDTH,
        height: 200,
        depth: 170,
        roundness: 0.96,
        x: 0,
        y: 0,
        rotationDeg: 0,
        perspective: 0.6,
      },
      extras: [],
    },
    colors: { ...DEFAULT_COLORS },
    restingFace: {
      eye: { width: DEFAULT_EYE_WIDTH, height: 52, roundness: 1 },
      left: { offsetX: -6, offsetY: 0, rotationDeg: 0, scaleX: 1, scaleY: 1 },
      right: { offsetX: 6, offsetY: 0, rotationDeg: 0, scaleX: 1, scaleY: 1 },
      spacing: 64,
      linked: true,
    },
    ambient: {
      enabled: true,
      bodyAmplitude: 3,
      bodyPeriodMs: 5200,
      eyeAmplitude: 1.2,
      eyePeriodMs: 3400,
    },
    ownKit: null,
  };
}

/**
 * Deterministic ids for the starter steps. Step ids are only required to be
 * unique within their loop (validate.ts scopes the set per loop), but a single
 * seeded sequence keeps them unique across the whole kit and keeps two runs of
 * `starterKit()` producing the same ids — which is what makes the fixtures and
 * the reducer tests reproducible.
 */
function seededRandom(seed: number): Random {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/**
 * Compose the starter library (`src/domain/content/`) into a Kit: 24 moods
 * across the six bands FR-4.7 documents, and 20 loops split life/reaction per
 * FR-5.7.
 *
 * `ids` fills mood and loop ids positionally, for callers that need a known
 * id; anything the caller does not supply gets a fresh one, so a partial list
 * is legal.
 */
export function starterKit(ids?: { moods?: string[]; loops?: string[] }): Kit {
  const moodIds = STARTER_MOODS.map((_, i) => ids?.moods?.[i] ?? newId("mood"));
  const loopIds = STARTER_LOOPS.map((_, i) => ids?.loops?.[i] ?? newId("loop"));
  const idOfMood = new Map(STARTER_MOODS.map((m, i) => [m.key, moodIds[i]]));
  const stepRandom = seededRandom(0x5bea1);

  return {
    moods: STARTER_MOODS.map((m, i) => ({
      id: moodIds[i],
      name: m.name,
      left: { ...m.left },
      right: { ...m.right },
      head: { ...m.head },
      colorOverride: m.colorOverride,
    })),
    loops: STARTER_LOOPS.map((l, i) => ({
      id: loopIds[i],
      name: l.name,
      group: l.group,
      steps: l.steps.map((s) => {
        const moodId = idOfMood.get(s.mood);
        // content.test.ts proves every step resolves; this guards the literal
        // data against a typo reaching a document as a silent E_REF.
        if (moodId === undefined) {
          throw new Error(
            `starter loop "${l.key}" names unknown mood "${s.mood}"`,
          );
        }
        return {
          id: newId("stp", stepRandom),
          moodId,
          holdMs: s.holdMs,
          transition: s.transition,
        };
      }),
      mode: l.mode,
      springSpeed: l.springSpeed,
      blink: { ...l.blink },
    })),
  };
}

export function createDefaultDocument(): StudioDocument {
  const kit = starterKit();
  const bubble = createBubble("Bubble");
  return {
    version: 6,
    kind: "bubble-studio-project",
    activeBubbleId: bubble.id,
    locale: "es",
    bubbles: [bubble],
    starterKit: kit,
  };
}
