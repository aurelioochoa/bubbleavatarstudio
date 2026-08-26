# 03 · Data Model — Bubble Avatar v4

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
  "version": 2,
  "kind": "bubble-studio-project",
  "activeBubbleId": "bbl_abc",
  "locale": "es",
  "bubbles": [/* Bubble[] */],
  "starterKit": {/* Kit */},
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
      "shape": "organic",
      "width": 220,
      "height": 200,
      "roundness": 0.96,
      "lobes": 5,
      "wobble": 0.12,
      "seed": 7,
      "x": 0,
      "y": 0,
      "rotationDeg": 0,
      "depth": 170,
      "perspective": 0.6,
    },
    "extras": [
      {
        "id": "prim_001",
        "kind": "capsule",
        "width": 40,
        "height": 18,
        "roundness": 1,
        "x": -60,
        "y": 70,
        "rotationDeg": -20,
        "z": 1,
        "colorRole": "accent",
        "color": "#ffffff",
      },
    ],
  },
  "colors": { "body": "#6c7bff", "accent": "#ffffff", "eyes": "#1c2033" },
  "restingFace": {
    "eye": { "width": 34, "height": 52, "roundness": 1 },
    "left": {
      "offsetX": -6,
      "offsetY": 0,
      "rotationDeg": 0,
      "scaleX": 1,
      "scaleY": 1,
    },
    "right": {
      "offsetX": 6,
      "offsetY": 0,
      "rotationDeg": 0,
      "scaleX": 1,
      "scaleY": 1,
    },
    "spacing": 64,
    "linked": true,
  },
  "ambient": {
    "enabled": true,
    "bodyAmplitude": 3,
    "bodyPeriodMs": 5200,
    "eyeAmplitude": 1.2,
    "eyePeriodMs": 3400,
  },
  "ownKit": null, // Kit | null — copy-on-write, see §5
}
```

Coordinate system: face frame origin = surface center; +x right, +y **down**
(SVG convention). Eye centers: `x = ±spacing/2 + offsetX(side)`, `y = offsetY(side)`.

## 3. Kit (behavior library)

```jsonc
{
  "moods": [/* Mood[] */],
  "loops": [/* Loop[] */],
}
```

### Mood

```jsonc
{
  "id": "mood_001",
  "name": "happy",
  "left": {
    "rotationXDeg": 0,
    "rotationYDeg": 0,
    "rotationZDeg": -8,
    "scaleX": 1.15,
    "scaleY": 0.8,
    "offsetX": 0,
    "offsetY": 4,
  },
  "right": {
    "rotationXDeg": 0,
    "rotationYDeg": 0,
    "rotationZDeg": -8,
    "scaleX": 1.15,
    "scaleY": 0.8,
    "offsetX": 0,
    "offsetY": 4,
  },
  "colorOverride": null, // null | { "body"?: "#...", "eyes"?: "#..." }
}
```

Deltas are **added** to resting values (scale multiplies). No absolute
positions → moods transfer across bodies (FR-4.6).

### Loop

```jsonc
{
  "id": "loop_001",
  "name": "idle",
  "group": "life", // free label: "life" | "reaction" | ...
  "steps": [
    {
      "id": "stp_001",
      "moodId": "mood_001",
      "holdMs": 900,
      "transition": "spring",
    },
    {
      "id": "stp_002",
      "moodId": "mood_002",
      "holdMs": 400,
      "transition": "ease",
    },
  ],
  "mode": "loop", // "loop" | "once" | "pingpong"
  "springSpeed": 1, // 0.1..3, multiplies transition rate
  "blink": {
    "enabled": true,
    "minIntervalMs": 2400,
    "maxIntervalMs": 6000,
    "durationMs": 140,
  },
}
```

Steps reference moods **by ID** (never index). Transition durations are derived
from `springSpeed` and a per-style base duration table owned by the playback
engine (not persisted per step — keeps files lean and tuning global).

## 4. Runtime (live) state — never persisted directly

```ts
interface LiveState {
  headRotation: { x: number; y: number; z: number }; // from gizmo/drag
  bubbleOffset: { x: number; y: number }; // from drag
  displayedMoodId: string | null; // resting when null
  moodProgress: number; // 0..1 transition blend
  blinkPhase: number; // 0..1, 0 = open
}
```

The stage renders `f(bubble, liveState, ambient(t))`. Playback is the subsystem
that _produces_ `displayedMoodId/moodProgress/blinkPhase` over time.

## 5. Copy-on-write kit rule (FR-5/FR-4 interplay)

- A bubble with `ownKit === null` _inherits_ `starterKit` (read-only).
- The **first** mood or loop mutation clones the _entire_ starter kit into
  `ownKit` atomically, then applies the edit there. (Keeps ID references valid.)
- Later edits touch `ownKit` only. Duplicating a bubble deep-copies `ownKit`.
- Effective kit = `ownKit ?? starterKit`.

## 6. Portable character file (`*.bubble-avatar.json`)

```jsonc
{
  "version": 2,
  "kind": "bubble-avatar",
  "bubble": {/* Bubble, with ownKit inlined (never null) */},
  "loops": ["loop_001", "loop_002"], // exported subset, resolved inside bubble
}
```

Validation on import: `kind`, `version`, full schema check, referential
integrity (every step's `moodId` exists in the inlined kit).

## 7. Validation rules (enforced by `document/validate.ts`)

1. `version === 2` and `kind` matches the file type; else reject with code
   `E_VERSION`. A v1 file is upgraded by `migrate()` before it is validated,
   so it never reaches this rule as a v1.
2. Unique IDs within their scope; step `moodId` must exist in the same kit.
3. Shape family (FR-2.6): `shape` is `round` | `organic` | `drop` | `capsule` |
   `cylinder` | `cone` | `diamond` — `SHAPE_FAMILIES` in
   `src/domain/geometry/shapes.ts` is the one list, and the type, the validator
   and the picker all derive from it. `roundness` counts up toward round: for
   `round` and `organic` 0 squares the silhouette off and 1 is an ellipse, and
   every other family maps the same dial onto its own corner softening without
   ever collapsing into a neighbour.
   `lobes` 3–10 and `wobble` 0–1 only bite on `organic`; `seed` is any integer
   and picks which arrangement of bumps you get. Every family is deterministic.
4. Numeric ranges: width/height/depth > 0, roundness 0–1, perspective 0–1, springSpeed 0.1–3,
   scale 0.1–3, holdMs ≥ 0, blink intervals > 0, colors match `#rrggbb`.
5. Non-empty `name` after trim (moods, loops, bubbles).
6. `linked: true` ⇒ left/right placements must be mirror-consistent (enforced
   on write, so validation only double-checks).

## 8. Versioning & migration policy

- Additive changes bump `version` and ship a `migrate(vN→vN+1)` in
  `document/migrate.ts`; imports run the migration chain then validate.
- Old files keep loading forever via migrations; nothing is ever rejected for
  being merely old.

### v1 → v2 (shape family, FR-2.6) — **landed**

v2 adds `shape`, `lobes`, `wobble` and `seed` to the surface. A v1 document
predates the shape vocabulary, so the migration fills the round family
(`shape: "round"`), which draws exactly what v1 drew. Any autosaved v1
document therefore keeps loading and looks unchanged.

That last claim is not a hope — it is measured. `surfacePath`'s round branch
returns the same string the pre-v2 `blobPath` call returned, asserted directly
in `geometry/shapes.test.ts`, and the three render goldens did not move in the
commit that switched the renderer over.

The portable `*.bubble-avatar.json` bumps to 2 on the same rule. It is a public
embed surface, so `readPortableAvatar()` in `export/avatar.ts` still accepts a
v1 file and upgrades it the same way; the runtime reads every definition
through it.

### v4 → v5 (the starter library reaches saved projects, FR-4.7/FR-5.7) — **landed**

v5 changes no field. It exists to carry content: the starter library grew to 24
moods and 20 loops, and `starterKit()` runs only inside
`createDefaultDocument()`, so a project already in storage kept the four-mood
kit it was saved with. The Moods panel offered the difference as a row the user
had to press — on every visit, for as long as the project lived. v5 applies
that top-up once, on the way in.

It is safe to apply unasked because `topUpKit` is additive by construction
(`document/library.ts`): it appends only what a kit lacks, matches by name, and
never renames, retunes, reorders or removes. A mood the user renamed keeps its
name and the library entry returns beside it. Every kit the document reads is
topped up — the shared one and any a bubble owns — because the panel measures
whichever kit the active bubble actually reads.

Running it once is the whole point of tying it to the version. A document
already at v5 has had the top-up, so a starter mood the user has since deleted
stays deleted instead of returning on the next load. The manual row remains for
whatever the library gains after v5.

Unlike the migrations around it this one is not shape-only — it needs real
moods and loops to append — so it runs after the validation pass, on a document
already known to be well formed.

### v3 → v4 (a depth for every assembled primitive, FR-2.3) — **landed**

v4 gives each `body.extras` entry a `depth`, because an extra is a solid
assembled around the body rather than a decal riding its surface. A v3 extra
predates it, so the migration writes `min(width, height) * 0.85` — the same
rule the surface took at v3, and the thickness the renderer effectively assumed
while it was scaling extras by the surface's own foreshortening.

The render goldens did not move: at rest an extra's own foreshortening is 1 in
both axes, exactly as the surface Jacobian it replaced was.

The same version also caps `extras` at 16 (`MAX_EXTRAS`), so "assembled" stays
a construction rather than a scene graph.

### v2 → v3 (authored depth, FR-2.2) — **landed**

v3 adds `depth` to the surface. A v2 document predates it, so the migration
writes `min(width, height) * 0.85` — the exact depth radius `projectFace`
derived for itself before v3 — and every saved character therefore loads
looking identical.

Measured the same way as v1 → v2: `projection.test.ts` pins the three values
the derived implementation produced for a known box and rotation, and the three
render goldens did not move in the commit that made depth authored. If they had,
the default would not be behaviour-preserving.

Migrations chain, so a v1 document runs `v1ToV2` then `v2ToV3` and lands on v3.
The portable `*.bubble-avatar.json` bumps to 3 on the same rule, and
`readPortableAvatar()` accepts v1 and v2 files.
