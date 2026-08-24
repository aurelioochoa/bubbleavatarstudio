// The starter loop catalogue (FR-5.7): at least 20 loops split into `life`,
// the behaviours a character cycles through unprompted, and `reaction`, the
// responses to something that just happened.
//
// Steps name moods by their library key (moods.ts), never by index — the ids
// only exist once starterKit() has minted them.
//
// Cleanroom (docs/CLEANROOM.md §3): the count and the life/reaction split are
// capability parity; the names, timings and step orders are ours.
import type {
  BlinkConfig,
  PlaybackMode,
  TransitionStyle,
} from "../document/types";

export type LoopGroup = "life" | "reaction";

export interface LoopStepSpec {
  /** A `MoodSpec.key` from moods.ts. */
  mood: string;
  holdMs: number;
  transition: TransitionStyle;
}

/** A loop minus its id and its steps' ids. */
export interface LoopSpec {
  key: string;
  name: string;
  group: LoopGroup;
  steps: readonly LoopStepSpec[];
  mode: PlaybackMode;
  springSpeed: number;
  blink: BlinkConfig;
}

const blink = (
  enabled: boolean,
  minIntervalMs = 2400,
  maxIntervalMs = 6000,
  durationMs = 140,
): BlinkConfig => ({ enabled, minIntervalMs, maxIntervalMs, durationMs });

const step = (
  mood: string,
  holdMs: number,
  transition: TransitionStyle = "ease",
): LoopStepSpec => ({ mood, holdMs, transition });

/**
 * Order is load-bearing at the head of the list, the same way it is in
 * moods.ts: `starterKit()` fills injected loop ids positionally and tests
 * address `loops[0]` and `loops[1]`. The groups interleave from there — the
 * Loops panel sections on the `group` field, not on position.
 */
export const STARTER_LOOPS: readonly LoopSpec[] = [
  // ── pinned positions 0-1 ──────────────────────────────────────────────
  {
    key: "idle",
    name: "idle",
    group: "life",
    steps: [
      step("happy", 1200, "spring"),
      step("curious", 900),
      step("sleepy", 700),
    ],
    mode: "loop",
    springSpeed: 1,
    blink: blink(true),
  },
  {
    key: "greet",
    name: "greet",
    group: "reaction",
    steps: [step("surprised", 350, "spring"), step("happy", 900, "spring")],
    mode: "once",
    springSpeed: 1.2,
    blink: blink(false),
  },

  // ── life ──────────────────────────────────────────────────────────────
  {
    key: "breathe",
    name: "breathe",
    group: "life",
    steps: [step("calm", 1600), step("patient", 1400)],
    mode: "pingpong",
    springSpeed: 0.9,
    blink: blink(true, 3000, 7000),
  },
  {
    key: "wander",
    name: "wander",
    group: "life",
    steps: [
      step("curious", 700),
      step("focused", 600),
      step("attentive", 700),
      step("calm", 900),
    ],
    mode: "loop",
    springSpeed: 1,
    blink: blink(true),
  },
  {
    key: "settle",
    name: "settle",
    group: "life",
    steps: [step("attentive", 600), step("calm", 1200), step("drowsy", 1500)],
    mode: "once",
    springSpeed: 0.9,
    blink: blink(true, 2800, 6400),
  },
  {
    key: "daydream",
    name: "daydream",
    group: "life",
    steps: [step("thoughtful", 1500), step("fond", 1100), step("calm", 1200)],
    mode: "loop",
    springSpeed: 0.85,
    blink: blink(true, 3200, 7600),
  },
  {
    key: "doze",
    name: "doze",
    group: "life",
    steps: [step("drowsy", 1400), step("sleepy", 1600), step("dozing", 2400)],
    mode: "once",
    springSpeed: 0.7,
    blink: blink(true, 4000, 9000, 220),
  },
  {
    key: "ponder",
    name: "ponder",
    group: "life",
    steps: [
      step("thoughtful", 1200),
      step("sceptical", 900),
      step("calm", 1000),
    ],
    mode: "pingpong",
    springSpeed: 0.95,
    blink: blink(true, 2600, 6400),
  },
  {
    key: "wake",
    name: "wake",
    group: "life",
    steps: [
      step("dozing", 1200),
      step("yawning", 900),
      step("drowsy", 800),
      step("attentive", 700, "spring"),
    ],
    mode: "once",
    springSpeed: 1.1,
    blink: blink(true, 1800, 4200, 200),
  },
  {
    key: "hum",
    name: "hum",
    group: "life",
    steps: [step("happy", 800), step("playful", 700), step("fond", 900)],
    mode: "pingpong",
    springSpeed: 1.15,
    blink: blink(true),
  },
  {
    key: "watch",
    name: "watch",
    group: "life",
    steps: [
      step("focused", 1100),
      step("attentive", 900),
      step("patient", 1200),
    ],
    mode: "loop",
    springSpeed: 0.9,
    blink: blink(true, 3400, 8000),
  },

  // ── reaction ──────────────────────────────────────────────────────────
  {
    key: "agree",
    name: "agree",
    group: "reaction",
    steps: [
      step("attentive", 300, "spring"),
      step("happy", 600, "spring"),
      step("calm", 700),
    ],
    mode: "once",
    springSpeed: 1.3,
    blink: blink(false),
  },
  {
    key: "refuse",
    name: "refuse",
    group: "reaction",
    steps: [
      step("annoyed", 400, "spring"),
      step("sceptical", 600),
      step("calm", 700),
    ],
    mode: "once",
    springSpeed: 1.4,
    blink: blink(false),
  },
  {
    key: "cheer",
    name: "cheer",
    group: "reaction",
    steps: [
      step("surprised", 280, "spring"),
      step("happy", 500, "spring"),
      step("proud", 900, "spring"),
    ],
    mode: "once",
    springSpeed: 1.6,
    blink: blink(false),
  },
  {
    key: "startle",
    name: "startle",
    group: "reaction",
    steps: [
      step("startled", 260, "step"),
      step("worried", 500),
      step("calm", 800),
    ],
    mode: "once",
    springSpeed: 1.5,
    blink: blink(false),
  },
  {
    key: "puzzle",
    name: "puzzle",
    group: "reaction",
    steps: [
      step("surprised", 320, "spring"),
      step("sceptical", 700),
      step("thoughtful", 900),
    ],
    mode: "once",
    springSpeed: 1.2,
    blink: blink(true, 2000, 5000),
  },
  {
    key: "sorry",
    name: "sorry",
    group: "reaction",
    steps: [step("worried", 500), step("sad", 900), step("grateful", 800)],
    mode: "once",
    springSpeed: 0.9,
    blink: blink(true, 2600, 6000),
  },
  {
    key: "tease",
    name: "tease",
    group: "reaction",
    steps: [
      step("playful", 400, "spring"),
      step("wink", 320, "step"),
      step("smug", 700),
    ],
    mode: "once",
    springSpeed: 1.45,
    blink: blink(false),
  },
  {
    key: "alarm",
    name: "alarm",
    group: "reaction",
    steps: [
      step("startled", 240, "step"),
      step("mischief", 400, "spring"),
      step("worried", 600),
    ],
    mode: "once",
    springSpeed: 1.7,
    blink: blink(false),
  },
  {
    key: "farewell",
    name: "farewell",
    group: "reaction",
    steps: [
      step("fond", 600),
      step("grateful", 700),
      step("happy", 800, "spring"),
    ],
    mode: "once",
    springSpeed: 1.05,
    blink: blink(true, 2400, 6000),
  },
];
