import { newId } from "../ids";
import type { Bubble, Kit, Mood, MoodEye, StudioDocument } from "./types";

export const DEFAULT_COLORS = {
  body: "#6c7bff",
  accent: "#ffffff",
  eyes: "#1c2033",
} as const;

const zeroDeltas = (): MoodEye => ({
  rotationXDeg: 0,
  rotationYDeg: 0,
  rotationZDeg: 0,
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
});

export function createBubble(name: string, id = newId("bbl")): Bubble {
  return {
    id,
    name: name.trim(),
    body: {
      surface: {
        kind: "blob",
        width: 220,
        height: 200,
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
      eye: { width: 34, height: 52, roundness: 1 },
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

function mood(name: string, patch: Partial<MoodEye>, id = newId("mood")): Mood {
  const base = zeroDeltas();
  return {
    id,
    name,
    left: { ...base, ...patch },
    right: { ...base, ...patch },
    colorOverride: null,
  };
}

export function starterKit(ids?: { moods?: string[]; loops?: string[] }): Kit {
  const [happy, curious, sleepy, surprised] = ids?.moods ?? [
    newId("mood"),
    newId("mood"),
    newId("mood"),
    newId("mood"),
  ];
  const [idle, greet] = ids?.loops ?? [newId("loop"), newId("loop")];
  const step = (n: number) => newId("stp", () => n / 10 ** n.toString().length);
  return {
    moods: [
      mood(
        "happy",
        { rotationZDeg: -8, scaleX: 1.15, scaleY: 0.8, offsetY: 4 },
        happy,
      ),
      mood(
        "curious",
        { rotationZDeg: 10, scaleX: 0.9, scaleY: 1.2, offsetY: -2 },
        curious,
      ),
      mood("sleepy", { scaleX: 0.7, scaleY: 0.25, offsetY: 10 }, sleepy),
      mood("surprised", { scaleX: 1.35, scaleY: 1.35, offsetY: -6 }, surprised),
    ],
    loops: [
      {
        id: idle,
        name: "idle",
        group: "life",
        steps: [
          { id: step(1), moodId: happy, holdMs: 1200, transition: "spring" },
          { id: step(2), moodId: curious, holdMs: 900, transition: "ease" },
          { id: step(3), moodId: sleepy, holdMs: 700, transition: "ease" },
        ],
        mode: "loop",
        springSpeed: 1,
        blink: {
          enabled: true,
          minIntervalMs: 2400,
          maxIntervalMs: 6000,
          durationMs: 140,
        },
      },
      {
        id: greet,
        name: "greet",
        group: "life",
        steps: [
          { id: step(4), moodId: surprised, holdMs: 350, transition: "spring" },
          { id: step(5), moodId: happy, holdMs: 900, transition: "spring" },
        ],
        mode: "once",
        springSpeed: 1.2,
        blink: {
          enabled: false,
          minIntervalMs: 2400,
          maxIntervalMs: 6000,
          durationMs: 140,
        },
      },
    ],
  };
}

export function createDefaultDocument(): StudioDocument {
  const kit = starterKit();
  const bubble = createBubble("Bubble");
  return {
    version: 1,
    kind: "bubble-studio-project",
    activeBubbleId: bubble.id,
    locale: "es",
    bubbles: [bubble],
    starterKit: kit,
  };
}
