# 03 · Data Model — Bubble Avatar v1

> Original schema designed for this project. No compatibility with any external
> format is intended. IDs are opaque strings with prefixes: `bbl_`, `mood_`,
> `loop_`, `prim_`, `stp_` + random suffix (see `domain/ids.ts`).

## 0. Conventions

- Lengths in abstract **u** units; angles in degrees; colors as `#rrggbb`.
- Everything persisted is JSON-serializable; no Dates, no Maps.
- Unknown extra fields are rejected on import (strict validation) to catch
  version mismatches early.

## 1. Studio document (project file `*.bubble-studio.json`)

```jsonc
{
  "version": 1,
  "kind": "bubble-studio-project",
  "activeBubbleId": "bbl_abc",
  "locale": "es",
  "bubbles": [ /* Bubble[] */ ],
  "starterKit": { /* Kit */ }
}
```

## 2. Bubble (character)

```jsonc
{
  "id": "bbl_abc",
  "name": "Mango",
  "body": {
    "surface": {
      "kind": "blob",
      "width": 220, "height": 200, "roundness": 0.85,
      "x": 0, "y": 0, "rotationDeg": 0, "perspective": 0.25
    },
    "extras": [
      {
        "id": "prim_001", "kind": "capsule",
        "width": 40, "height": 18, "roundness": 1,
        "x": -60, "y": 70, "rotationDeg": -20, "z": 1,
        "colorRole": "accent", "color": "#ffffff"
      }
    ]
  },
  "colors": { "body": "#6c7bff", "accent": "#ffffff", "eyes": "#1c2033" },
  "restingFace": {
    "eye": { "width": 34, "height": 52, "roundness": 1 },
    "left":  { "offsetX": -6, "offsetY": 0, "rotationDeg": 0, "scaleX": 1, "scaleY": 1 },
    "right": { "offsetX":  6, "offsetY": 0, "rotationDeg": 0, "scaleX": 1, "scaleY": 1 },
    "spacing": 64,
    "linked": true
  },
  "ambient": {
    "enabled": true,
    "bodyAmplitude": 3, "bodyPeriodMs": 5200,
    "eyeAmplitude": 1.2, "eyePeriodMs": 3400
  },
  "ownKit": null          // Kit | null — copy-on-write, see §5
}
```

Coordinate system: face frame origin = surface center; +x right, +y **down**
(SVG convention). Eye centers: `x = ±spacing/2 + offsetX(side)`, `y = offsetY(side)`.

## 3. Kit (behavior library)

```jsonc
{
  "moods": [ /* Mood[] */ ],
  "loops": [ /* Loop[] */ ]
}
```

### Mood

```jsonc
{
  "id": "mood_001",
  "name": "happy",
  "left":  { "rotationXDeg": 0, "rotationYDeg": 0, "rotationZDeg": -8,
             "scaleX": 1.15, "scaleY": 0.8, "offsetX": 0, "offsetY": 4 },
  "right": { "rotationXDeg": 0, "rotationYDeg": 0, "rotationZDeg": -8,
             "scaleX": 1.15, "scaleY": 0.8, "offsetX": 0, "offsetY": 4 },
  "colorOverride": null        // null | { "body"?: "#...", "eyes"?: "#..." }
}
```

Deltas are **added** to resting values (scale multiplies). No absolute
positions → moods transfer across bodies (FR-4.6).

### Loop

```jsonc
{
  "id": "loop_001",
  "name": "idle",
  "group": "life",                    // free label: "life" | "reaction" | ...
  "steps": [
    { "id": "stp_001", "moodId": "mood_001", "holdMs": 900, "transition": "spring" },
    { "id": "stp_002", "moodId": "mood_002", "holdMs": 400, "transition": "ease" }
  ],
  "mode": "loop",                     // "loop" | "once" | "pingpong"
  "springSpeed": 1,                   // 0.1..3, multiplies transition rate
  "blink": { "enabled": true, "minIntervalMs": 2400, "maxIntervalMs": 6000, "durationMs": 140 }
}
```

Steps reference moods **by ID** (never index). Transition durations are derived
from `springSpeed` and a per-style base duration table owned by the playback
engine (not persisted per step — keeps files lean and tuning global).

## 4. Runtime (live) state — never persisted directly

```ts
interface LiveState {
  headRotation: { x: number; y: number; z: number }; // from gizmo/drag
  bubbleOffset: { x: number; y: number };            // from drag
  displayedMoodId: string | null;                    // resting when null
  moodProgress: number;                              // 0..1 transition blend
  blinkPhase: number;                                // 0..1, 0 = open
}
```

The stage renders `f(bubble, liveState, ambient(t))`. Playback is the subsystem
that *produces* `displayedMoodId/moodProgress/blinkPhase` over time.

## 5. Copy-on-write kit rule (FR-5/FR-4 interplay)

- A bubble with `ownKit === null` *inherits* `starterKit` (read-only).
- The **first** mood or loop mutation clones the *entire* starter kit into
  `ownKit` atomically, then applies the edit there. (Keeps ID references valid.)
- Later edits touch `ownKit` only. Duplicating a bubble deep-copies `ownKit`.
- Effective kit = `ownKit ?? starterKit`.

## 6. Portable character file (`*.bubble-avatar.json`)

```jsonc
{
  "version": 1,
  "kind": "bubble-avatar",
  "bubble": { /* Bubble, with ownKit inlined (never null) */ },
  "loops": ["loop_001", "loop_002"]   // exported subset, resolved inside bubble
}
```

Validation on import: `kind`, `version`, full schema check, referential
integrity (every step's `moodId` exists in the inlined kit).

## 7. Validation rules (enforced by `document/validate.ts`)

1. `version === 1` and `kind` matches the file type; else reject with code
   `E_VERSION`.
2. Unique IDs within their scope; step `moodId` must exist in the same kit.
3. Numeric ranges: roundness 0–1, perspective 0–1, springSpeed 0.1–3,
   scale 0.1–3, holdMs ≥ 0, blink intervals > 0, colors match `#rrggbb`.
4. Non-empty `name` after trim (moods, loops, bubbles).
5. `linked: true` ⇒ left/right placements must be mirror-consistent (enforced
   on write, so validation only double-checks).

## 8. Versioning & migration policy

- Additive changes bump `version` and ship a `migrate(vN→vN+1)` in
  `document/migrate.ts`; imports run the migration chain then validate.
- Breaking experiments happen on a branch behind a `version: 2` flag — v1 files
  keep loading forever via migrations.
