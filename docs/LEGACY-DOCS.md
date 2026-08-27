# Legacy documentation — Bubble Avatar Studio

The design and development documents that used to live as twelve separate
files, archived here as one. Nothing was rewritten: every part below is the
original document, verbatim, with its headings pushed down one level so this
file has a single title.

**Reading a reference from the code.** Comments and tests across the repo cite
these documents in shorthand — `docs/05 §1`, `docs/03 §7`, `docs/08 F8`,
`docs/CLEANROOM.md §3`. Those still resolve: the number is the part in the
table below, and the `§` is that part's own section, whose numbering is
unchanged. `docs/05 §1` means Part 05, section 1 of this file.

**What is still authoritative.** "Legacy" describes where these files now live,
not how much they bind. Part 07 (testing) and Part C (clean-room) remain repo
law, restated in `CLAUDE.md`. Part 02's FR-N.N identifiers are the ones every
test file cites in its top comment. Part 05 is a _target_ document: it marks
each UI item **[built]** or **[target]**, so an unmarked sentence is not a
claim about what runs today. Measured numbers recorded anywhere below (test
counts, bundle sizes) are tripwires — re-derive them with `pnpm test` and
`pnpm build` rather than trusting the line.

## Contents

- [Part 01 — Product overview](#part-01) — was `docs/01`
- [Part 02 — Functional specification](#part-02) — was `docs/02`
- [Part 03 — Data model](#part-03) — was `docs/03`
- [Part 04 — Architecture](#part-04) — was `docs/04`
- [Part 05 — UI design](#part-05) — was `docs/05`
- [Part 06 — Export formats & runtime](#part-06) — was `docs/06`
- [Part 07 — Testing strategy](#part-07) — was `docs/07`
- [Part 08 — Roadmap](#part-08) — was `docs/08`
- [Part C — Clean-room protocol](#part-cleanroom) — was `docs/CLEANROOM.md`
- [Research — Upstream facts](#research-upstream) — was `docs/research/upstream-facts.md`
- [Research — Black-box observation notes](#research-blackbox) — was `docs/research/blackbox-notes.md`
- [Research — Exploring a solid-object bubble](#research-3d) — was `docs/research/3d-bubble-exploration.md`

---

<a id="part-01"></a>

## 01 · Product Overview — Bubble Avatar Studio

**Project:** Bubble Avatar Studio (working title) · **Owner:** helpbubble
**Status:** Approved design baseline · **License:** proprietary (helpbubble)

### 1. Vision

helpbubble products need friendly, living characters — "bubbles" — that react to
users across support, onboarding and engagement surfaces. Bubble Avatar Studio is
an in-browser authoring tool where designers create procedural SVG characters,
give them moods and looping behaviors, and export a portable definition that any
helpbubble frontend renders with a tiny runtime.

One studio, one file format, one renderer — used everywhere.

### 2. Users

| Persona                            | Need                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Brand/character designer (primary) | Build and refine characters visually without code; iterate moods and loops quickly |
| Frontend engineer (secondary)      | Drop an exported definition into a helpbubble app and trust it renders identically |
| End user (indirect)                | Sees a living character that feels polished and responsive                         |

### 3. Product pillars

1. **Procedural, resolution-free** — characters are parameters, not bitmaps; SVG
   scales anywhere and stays tiny.
2. **Authoring without code** — full visual editing with instant live preview.
3. **Portable by design** — a character is one JSON file; the runtime has no UI
   dependencies and never reads storage or network.
4. **Safe ownership** — 100% original code and design (see `CLEANROOM.md`),
   proprietary to helpbubble.

### 4. Scope

**In scope (v1):**

- Character (bubble) CRUD with body built from a primary facial surface plus
  extra primitives; per-primitive geometry/color controls.
- Linked or independent eye editing; pseudo-3D head rotation and perspective.
- Moods: relative eye-delta presets with optional temporary color overrides.
- Loops: ordered mood steps with hold times and transition styles; playback
  modes loop / once / ping-pong; automatic blinking; spring tuning.
- Ambient idle motion for body and eyes.
- Studio: stage + inspector layout, direct canvas manipulation, autosave,
  project backup/restore, Spanish/English UI.
- Export: SVG/PNG snapshots (transparent/solid/gradient backgrounds) and a
  portable character definition consumed by an embeddable React runtime.

**Out of scope (v1):** multi-user/cloud sync, non-SVG renderers (Lottie/video),
audio lip-sync, marketplace, mobile-native editors. (Revisit post-v1.)

### 5. Success criteria

- A designer creates a new character with 3 moods and 1 loop in < 10 minutes.
- Exported definition renders pixel-identically in studio preview and runtime.
- Full check gate (`typecheck + tests + build`) green at every merge.
- No upstream code or prose anywhere in the repo (clean-room attested).

---

<a id="part-02"></a>

## 02 · Functional Specification

> Every requirement has an ID used by tests (TDD: a requirement is not "done"
> until a test that encodes it exists and passes). Derived from
> `docs/research/*` under the clean-room protocol. "Bubble" = character;
> "mood" = expression preset; "loop" = animation; terms per `upstream-facts.md` §2.

### FR-1 Characters (Bubbles)

- **FR-1.1** Create a bubble from a default template; it appears selected in the list.
- **FR-1.2** Rename inline; name is required, non-empty, trimmed.
- **FR-1.3** Duplicate a bubble: deep copy with fresh IDs, name suffixed " copy".
- **FR-1.4** Reorder bubbles (list position persists).
- **FR-1.5** Delete a bubble with confirmation; if it was active, selection moves
  to the first remaining bubble (or none if empty).
- **FR-1.6** Exactly zero or one bubble is _active_; all editor tabs operate on it.

### FR-2 Body

- **FR-2.1** Body = one primary **surface** + zero or more **extra primitives**.
- **FR-2.2** Surface params: width, height, **depth**, roundness (0–1), position
  (x,y), rotation (deg), perspective (0–1). All editable via numeric inputs.
  Depth is the solid's front-to-back size and is **authored, not derived** — a
  character can be a flat disc or a deep barrel. Before v3 the projection
  computed its own depth radius as `min(width, height) * 0.85`, so every solid
  was as thick as its narrow axis allowed and nothing could be shaped in z.
- **FR-2.3** Extra primitive kinds: `blob`, `capsule`, `circle`, `ring`; each has
  its own size (width, height and **depth**), roundness, position, rotation,
  z-order, and color role (`body` | `accent` | custom hex). An extra is a
  **solid assembled around the body**, not a decal on it: it foreshortens by
  its own box and depth as the head turns, so a sphere keeps its outline
  wherever it is stuck and a shallow disc flattens. At most **16** may be
  assembled around the primary shape.
- **FR-2.4** Extras can be added, edited, reordered (z), and removed.
- **FR-2.5** The surface carries the **face frame**: eye anchors and mood deltas
  are expressed in it (see FR-4.6).
- **FR-2.6** The surface has a **shape family**, chosen per bubble: `round`
  (superellipse from rectangle to ellipse via roundness), `organic` (an outline
  whose radius varies around the perimeter, giving lumpy and lopsided forms),
  `cube` (a superellipsoid: flat faces whose edges soften with roundness, and the
  one family that is deliberately _not_ a solid of revolution — revolve a square
  profile and the result is a cylinder), `drop` (a teardrop taper), `capsule` and `cylinder` (straight sides with a
  cap at each end of the long axis — deep and semicircular for the capsule,
  shallow for the cylinder), `cone` (a full-height taper standing on a flat
  base) and `diamond` (a rhombus whose corners soften but never round into an
  ellipse). Every family is a deterministic function of its parameters — same
  values, same path, byte for byte. `roundness` means corner softening _within_
  a family: no family collapses into another at either end of its range, which
  is why each maps the 0–1 dial onto its own span.
- **FR-2.8** The surface is a **solid**, not an outline. Each family's outline
  is the generatrix of a solid of revolution about the vertical axis, and the
  drawn silhouette is that solid rotated by the head rotation and projected. A
  turn therefore reshapes the outline rather than only scaling it, and a lumpy
  character shows different lumps as it turns. `round` keeps the analytic
  ellipsoid silhouette, which is the same solid's closed form.
- **FR-2.7** Organic shapes take `lobes` (how many bumps), `wobble` (how far the
  radius strays, 0 = the round family) and `seed` (which arrangement of bumps).

### FR-3 Eyes

- **FR-3.1** Resting eye shape: width, height, roundness (capsule-like default).
- **FR-3.2** Placement per side: offsetX/offsetY (u), rotation (deg), scale X/Y;
  plus a shared `spacing` between eye centers.
- **FR-3.3** `linked` mode: editing any shape/placement property on one side
  mirrors it to the other (offsetX and rotation mirror sign). Unlinking keeps
  current values and allows divergence; re-linking adopts the left side.
- **FR-3.4** Eye color editable (resting color).

### FR-4 Moods

- **FR-4.1** A mood stores per-eye deltas **relative to the resting face**:
  rotationX/Y/Z (deg), scaleX/scaleY (multiplier), offsetX/offsetY (u).
- **FR-4.2** Mood CRUD: create, rename, duplicate, delete, reorder.
- **FR-4.3** Optional temporary **color override** per mood (body and/or eyes);
  it applies only while that mood is displayed and never mutates resting colors.
- **FR-4.4** Applying a mood updates the stage live; leaving mood-edit mode
  without saving restores the previous state (edits are cancelable).
- **FR-4.5** Mood thumbnails render a true mini-preview of the mood.
- **FR-4.6** Because deltas are relative to the face frame, the same mood is
  compatible with any bubble surface (test: one mood applied to two different
  bodies yields proportionally consistent eye changes).
- **FR-4.7** The starter kit ships a **library of at least 24 moods** spanning a
  documented range (alert, calm, warm, negative, sleepy, playful), so a new
  bubble is expressive before the user authors anything.
- **FR-4.8** A mood card states how many loops use it, and delete is refused
  _before_ it is attempted — the control is disabled and says why — rather than
  the reducer rejecting it afterwards with E_REF (FR-5.6, which stays as the
  backstop for every other path into a deletion).
- **FR-4.9** The mood grid is filterable by name, so a 24-mood library is
  reachable without scrolling past what is not wanted.
- **FR-4.10** A mood carries a **pose**: a three-axis orientation of the whole
  character, stored alongside its eye deltas. It composes with the pose direct
  manipulation sets (FR-8.1) rather than replacing it, and a loop travels
  between its steps' poses along the **shorter arc** on each axis — the long
  way round is a character spinning through the front to reach a neighbouring
  angle. Ambient idle motion (FR-7) composes on top, unchanged.

### FR-5 Loops (animations)

- **FR-5.1** A loop = ordered steps; each step references a mood **by ID**, plus
  `holdMs` and `transition` (`linear` | `ease` | `spring` | `step`).
- **FR-5.2** Loop CRUD: create, rename, duplicate, delete; steps add (from mood
  list), remove, reorder; reordering never changes which mood a step references.
- **FR-5.3** Playback modes: `loop` (repeat), `once` (stop at end), `pingpong`
  (forward then reverse).
- **FR-5.4** `springSpeed` (0.1–3) shapes the `spring` transition curve: a
  higher speed arrives sooner and rings more on the way. It does **not** move
  any duration — a step's transition is the final 40% of its hold at every
  speed, which is what keeps the loop summary and the track's step widths out
  of the knob's reach. (Reworded from "scales transition durations globally"
  once the curve reading was chosen; see docs/08 F8.)
- **FR-5.5** Blink config: enabled flag, min/max interval, blink duration; blinks
  superimpose on any displayed mood without mutating it.
- **FR-5.6** Deleting a mood that a step references is blocked while any step in
  any loop of the same kit references it (or, equivalently, deletion requires
  removing the references first — we choose: **block with a clear error**).
- **FR-5.7** The starter kit ships a **catalogue of at least 20 loops** in two
  groups: `life` (the resting behaviours a character cycles through unprompted)
  and `reaction` (responses to something that just happened).
- **FR-5.8** A loop shows a **summary** of what it will do: how many steps and
  their durations, and its blink interval and duration.
- **FR-5.9** A step is retimed by dragging its edge in the timeline; the value
  it commits is the same `holdMs` a typed field sets.
- **FR-5.10** Moods are reachable from the track as a tray, and dragging one
  onto the sequence inserts a step at the drop point — building a loop never
  requires remembering a thumbnail from another tab.

### FR-6 Playback

- **FR-6.1** Starting a loop enters _playback_: playback exclusively owns the
  live state; manual canvas manipulation pauses it.
- **FR-6.2** Transport: play (selected loop), pause/resume, stop (returns to
  resting face). Status pill shows current loop + step.
- **FR-6.3** Timing is computed from absolute timestamps (frame-rate independent):
  advancing 1s of wall time yields identical state regardless of frame count.
- **FR-6.4** Switching the active bubble keeps the current loop and its position
  when the target bubble can play it (same kit lineage), otherwise stops cleanly.
- **FR-6.5** Ambient motion (FR-8) composes with playback output.
- **FR-6.6** The transport is a permanent full-width **track** below the rail,
  stage and inspector, not an overlay on the stage. It has three heights:
  collapsed, normal, and expanded with the mood tray (FR-5.10).
- **FR-6.7** The track's timeline is **real time**: a step's width is its hold,
  a playhead tracks elapsed position against the whole cycle, and a step's
  entry transition is edited at the seam where it happens.

### FR-7 Ambient idle motion

- **FR-7.1** Config: enabled, body amplitude/period, eye amplitude/period.
- **FR-7.2** Output is a smooth sinusoidal offset applied to surface position and
  eye offsets, zero at t=0, deterministic given (t, config) — no per-frame drift.

### FR-8 Direct manipulation (stage)

- **FR-8.1** Drag anywhere on the stage **turns the head** (rotation X/Y), with
  the face anchored to the projected surface so the eyes sweep across it. The
  bubble's position is set numerically (FR-2.2) rather than by dragging — see
  `docs/research/blackbox-notes.md`, session 2, for why this replaced the
  original "drag to translate" wording.
- **FR-8.2** A rotation control (on-canvas handle or gizmo) sets head rotation
  X/Y/Z; projection foreshortens the surface and shifts eye anchors accordingly.
- **FR-8.3** Any direct manipulation pauses playback (FR-6.1) and is undoable
  (single-level undo of the drag is acceptable v1: restore pre-drag values on Esc).
- **FR-8.4** A **wireframe overlay** draws a lat/long mesh over the solid —
  both hemispheres, so it reads as a cage around a volume rather than a bowl —
  plus a highlight tracing the character's own silhouette. It is raised for the
  duration of a stage drag and can also be held up by a toggle for posing by
  number. Stage chrome: it never reaches an export.
- **FR-8.5** The face is **clipped by the body's silhouette**, so an eye that
  has travelled toward the limb is cut flat along the contour rather than faded
  out. An eye is either on the surface or behind it; there is no partial
  opacity.
- **FR-8.6** A stage toggle turns the character to face the pointer, anywhere
  in the window rather than only over the stage. The turn is bounded per axis
  and eased — a fraction of the remaining angle each frame — so it reads as a
  head turning to look rather than as a cursor dragging it. Direct
  manipulation wins: starting a drag switches the follow off (FR-8.1), and the
  pose the character settled in is handed back rather than snapping away. The
  roll is left alone; following aims a head, it does not tilt one. **The eyes
  track as well as the head**, sliding across the face toward the pointer and
  arriving ahead of the turn, the way eyes lead a head in life — the turn alone
  is ambiguous at a glance against the idle motion, and the two together are
  what make it plain the character is watching. The gaze is stage-only chrome
  like the guide and the shadow: nothing exported carries it. A slider appears
  beside the toggle while it runs and scales how far the head reaches and how
  far the eyes slide, from a tenth of the full turn to all of it — strength is
  amplitude here, not speed.
- **FR-8.7** A stage toggle shows an orientation triad in the corner: three
  axes carried through the same rotation the character is, sorted back to
  front, each named by a letter as well as a colour so the reading never rests
  on colour alone. It is a corner widget rather than chrome inside the scene,
  which is what keeps it clear of the silhouette it describes and leaves
  `Scene` and all three goldens untouched by it. The rear hemisphere fades
  with depth; the front does not, because an axis edge-on to the viewer is at
  its longest on screen and fully legible.

### FR-9 Studio shell & persistence

- **FR-9.1** Layout: bubbles rail (left), stage (center), inspector (right) with
  tabs **Look / Moods / Loops / Share**, and the transport track across the
  full width below all three (FR-6.6; it was a dock floating on the stage
  until the track redesign).
- **FR-9.2** Autosave: every committed document mutation persists to local
  storage synchronously (debounce ≤ 300 ms for burst edits); no save button.
- **FR-9.3** Project backup: export full document as `.bubble-studio.json`;
  import replaces the document **after explicit confirmation**, and is rejected
  with a readable error if invalid/unknown version.
- **FR-9.4** Locale switch es/en; default es; choice persists.
- **FR-9.5** Numeric fields accept typing, steppers **and drag-to-scrub** on the
  label, so values can be dialled in without keyboard round-trips.
- **FR-9.6** The header states whether the current document is saved — autosave
  is silent by design (FR-9.2), and silence is indistinguishable from failure.
- **FR-9.7** A help sheet reachable from the header lists the bindings the
  studio answers to. Each binding states the gesture and its effect as two
  things, not one sentence, so the list can be read down a column of key caps.
- **FR-9.8** The studio wears its own character as its mark: the header logo
  and the browser favicon are the same render, produced by `render/mark.ts`
  rather than authored as an asset. The mark is its own character, not the
  default template: the **round** family at equal width and height and
  `roundness` 1, which is what makes it a circle rather than an oval or a
  rounded square; a body filling most of its box rather than the template's
  43%; and eyes both larger than the template's and set closer than their own
  width apart, close enough to read as a face and far enough that a 16-pixel
  raster still shows two of them. Its layout box is the size it inks, not the
  scene's, so a larger mark does not push the header down over the stage.
- **FR-9.9** The same help sheet carries a guide to the studio as a second tab:
  what a bubble is, and what each surface of the shell is for, in es/en.

### FR-10 Export & runtime

- **FR-10.1** Snapshot: current stage as SVG string and PNG raster at chosen
  resolution (512/1024/2048) with background: transparent | solid color |
  linear gradient | radial gradient (two stops, configurable). "Current stage"
  includes the **pose** — a head turned by dragging (FR-8.1) — and excludes the
  ambient breath, which is a phase the user did not choose and would make the
  same snapshot unreproducible.
- **FR-10.2** Character file: one bubble + its effective kit (own kit if present,
  else starter kit) → `*.bubble-avatar.json` (schema in `03-data-model.md`).
- **FR-10.3** Loop picker for export: choose which loops are embedded (default all).
- **FR-10.4** Runtime: `<BubbleAvatar definition={...} loop="name" autoplay size={n}/>`
  React component; pure function of props; no storage/network access; renders
  identical SVG to the studio stage for the same definition + state.
- **FR-10.5** Export package (ZIP): definition JSON + README + minimal usage
  example. (Runtime ships as a package, not inlined per export.)
- **FR-10.6** The export frame is drawn **on the stage**, where the framing
  decision is made, and the export panel states what the package will contain
  before it is built: loop and mood counts, how many moods the prune drops
  (FR-10.2's effective kit is filtered to what the chosen loops reference), and
  the estimated weight.

### FR-11 Non-functional

- **FR-11.1** All domain logic (geometry, document ops, playback) is pure
  TypeScript with **zero React/DOM imports**.
- **FR-11.2** Playback/ambient animation writes go straight to DOM via refs —
  no React re-render per frame (React renders only on durable state changes).
- **FR-11.3** Validation gate: `pnpm check` = engine freshness (n/a v1), format,
  typecheck strict, full tests, production build.

### FR-12 Responsive & touch

> Added after the studio had shipped desktop-only. The original spec named a
> single 1024×720 floor and no pointer other than a mouse; these are the rules
> that replace that assumption. Nothing here reaches `src/domain` or
> `src/render` — the layout is a shell concern, and the goldens are byte-proof
> that it stayed one.

- **FR-12.1** Three layouts, chosen by width alone: **phone** below 768px,
  **tablet** 768–1023px, **desktop** 1024px and up. Desktop is the three-column
  shell already specified in part 05 §1. One media query owns the choice; every
  other adaptation that CSS can express stays in CSS.
- **FR-12.2** At 360px nothing overflows horizontally, and the stage keeps at
  least 40% of the viewport height — below that the character stops being the
  thing the studio is about.
- **FR-12.3** On phone the inspector is a bottom sheet with three detents
  (handle / half / tall). The tall detent still leaves the stage visible:
  FR-4.4 requires a mood to be judged against the character, and a sheet that
  covered it would break the same rule the mood editor's scoped modal exists to
  keep (part 05 §2).
- **FR-12.4** Every drag-to-reorder works with a coarse pointer, activated by a
  long press. The keyboard/button path beside each list (part 05 §3) is
  unchanged and remains the accessible route; the drag sits on top of it.
- **FR-12.5** Under `(pointer: coarse)` every interactive target is at least
  44×44 CSS px. A control may keep a smaller _drawn_ mark — the step grip is
  6px wide and stays so — provided its hit area meets the floor.
- **FR-12.6** Stage zoom is reachable by pinch as well as by the zoom pill, and
  writes the same view state, which still never autosaves or reaches an export.
- **FR-12.7** FR-8.6's follow survives touch. Because a finger only exists
  while it is down, and FR-8.1 has a grab take the pose back from the cursor,
  that rule becomes conditional on pointer type: a **mouse** press still
  switches the follow off, a **touch** press does not — with the follow on, a
  dragged finger feeds the aim; with it off, the same drag turns the head 1:1.

---

<a id="part-03"></a>

## 03 · Data Model — Bubble Avatar v4

> Original schema designed for this project. No compatibility with any external
> format is intended. IDs are opaque strings with prefixes: `bbl_`, `mood_`,
> `loop_`, `prim_`, `stp_` + random suffix (see `domain/ids.ts`).

### 0. Conventions

- Lengths in abstract **u** units; angles in degrees; colors as `#rrggbb`.
- Everything persisted is JSON-serializable; no Dates, no Maps.
- Unknown extra fields are rejected on import (strict validation) to catch
  version mismatches early.

### 1. Studio document (project file `*.bubble-studio.json`)

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

### 2. Bubble (character)

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

### 3. Kit (behavior library)

```jsonc
{
  "moods": [/* Mood[] */],
  "loops": [/* Loop[] */],
}
```

#### Mood

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
  "head": { "x": 4, "y": 0, "z": -3 }, // degrees: pitch, yaw, roll (FR-4.10)
  "colorOverride": null, // null | { "body"?: "#...", "eyes"?: "#..." }
}
```

Deltas are **added** to resting values (scale multiplies). No absolute
positions → moods transfer across bodies (FR-4.6).

`head` is the pose the mood turns the **whole character** to (FR-4.10) — the
same three axes, and the same signs, that a drag on the stage sets. It is
added to the pose direct manipulation is holding rather than replacing it, so
a character the user has turned to see side-on keeps that view while it
animates, and the sum is folded back into the half turn either side of zero.
It is not a delta on the eyes: the eyes are anchored to the surface and travel
with it, which is why a posed mood sweeps them across the face rather than
leaving them painted where they were.

#### Loop

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

### 4. Runtime (live) state — never persisted directly

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

### 5. Copy-on-write kit rule (FR-5/FR-4 interplay)

- A bubble with `ownKit === null` _inherits_ `starterKit` (read-only).
- The **first** mood or loop mutation clones the _entire_ starter kit into
  `ownKit` atomically, then applies the edit there. (Keeps ID references valid.)
- Later edits touch `ownKit` only. Duplicating a bubble deep-copies `ownKit`.
- Effective kit = `ownKit ?? starterKit`.

### 6. Portable character file (`*.bubble-avatar.json`)

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

### 7. Validation rules (enforced by `document/validate.ts`)

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

### 8. Versioning & migration policy

- Additive changes bump `version` and ship a `migrate(vN→vN+1)` in
  `document/migrate.ts`; imports run the migration chain then validate.
- Old files keep loading forever via migrations; nothing is ever rejected for
  being merely old.

#### v1 → v2 (shape family, FR-2.6) — **landed**

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

#### v5 → v6 (a mood turns the body, FR-4.10) — **landed**

v6 adds `head` to a mood: three angles that turn the whole character while
that mood is displayed. Before it, a mood moved the eyes on a body that never
moved, so every animation in the library was a face working on a statue.

A v5 mood predates the field and joins v6 facing straight ahead — `{0, 0, 0}`
— which is precisely what it already drew, so no saved character changes and
the render goldens do not move. Shape-only, like every migration except the
v4 → v5 content one, and it reaches every kit the document holds: the shared
one and any a bubble has forked.

The portable avatar format took the same step at its own v5, with the same
default, because the runtime still has to read files written before poses
existed.

#### v4 → v5 (the starter library reaches saved projects, FR-4.7/FR-5.7) — **landed**

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

#### v3 → v4 (a depth for every assembled primitive, FR-2.3) — **landed**

v4 gives each `body.extras` entry a `depth`, because an extra is a solid
assembled around the body rather than a decal riding its surface. A v3 extra
predates it, so the migration writes `min(width, height) * 0.85` — the same
rule the surface took at v3, and the thickness the renderer effectively assumed
while it was scaling extras by the surface's own foreshortening.

The render goldens did not move: at rest an extra's own foreshortening is 1 in
both axes, exactly as the surface Jacobian it replaced was.

The same version also caps `extras` at 16 (`MAX_EXTRAS`), so "assembled" stays
a construction rather than a scene graph.

#### v2 → v3 (authored depth, FR-2.2) — **landed**

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

---

<a id="part-04"></a>

## 04 · Architecture

### 1. Layer diagram

```
┌──────────────────────────── app/ (React) ────────────────────────────┐
│  StudioShell · panels (Look/Moods/Loops/Share) · Stage · transport   │
│  durable state: useStudioStore (reducer)  ·  i18n  ·  persistence    │
└──────────────┬───────────────────────────────┬───────────────────────┘
               │ calls (pure)                  │ owns
┌──────────────▼──────────────┐   ┌────────────▼────────────────────────┐
│  render/ (pure TS)          │   │  playback/ (pure TS engine, in      │
│  scene.ts  doc+live→Scene   │   │  domain): clock, LoopPlayer, blink  │
│  svg.ts    Scene→SVG string │   │  emits LiveState on tick(tNow)      │
└──────────────┬──────────────┘   └────────────┬────────────────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼────────────────────────┐
│                domain/ (pure TS, zero React/DOM imports)              │
│  geometry (blob paths, projection, easing) · document (types, create, │
│  mutate, kit copy-on-write, validate, migrate) · ids · ambient        │
└───────────────────────────────────────────────────────────────────────┘
```

Dependency rule: arrows point downward only. `domain/` imports nothing from
`render/` or `app/`. Enforced by ESLint `import/no-restricted-paths` (F0) and
by the test suite importing `domain/` in a bare node environment.

### 2. State management

**Durable document state** — single `StudioDocument` in a reducer store
(`useStudioStore`): all FR mutations are named actions (`bubble.add`,
`mood.updateDeltas`, `loop.reorderSteps`, …) implemented as pure functions in
`document/mutate.ts`. The reducer validates invariants transactionally: an
action either applies completely or returns the previous state + error
(FR-5.6 blocking rule lives here).

**High-frequency state** — a `StageEngine` (one per stage) owns the
`LoopPlayer` + ambient math and writes results **directly to DOM nodes via
refs** (transform/attribute patches) inside one rAF loop. React never re-renders
per frame (FR-11.2). React subscribes only to coarse engine status
(`idle|playing|paused`, current step index) via `useSyncExternalStore` for the
transport pill.

**Undo (v1 minimal):** drag operations stash pre-drag values and restore on
Esc; structural edits rely on explicit cancel in editors (FR-4.4).

### 3. Rendering pipeline

1. `buildScene(bubble, live, ambientOffset) → Scene` — a plain data tree
   (`{tag, attrs, children}`) in _scene units_.
2. `sceneToSvg(scene, {viewBox, background}) → string` — deterministic
   serializer (stable attribute order) used by both the DOM (via
   `innerHTML` on a static wrapper, then per-frame attribute patching) and
   snapshot export (FR-10.1).
3. Per-frame updates patch only: surface `transform`, eye `transform`,
   blink `scaleY`, color fills on mood change. Scene rebuild happens only when
   _structure_ changes (body edited, bubble switched).

Determinism requirement (tested): same inputs → byte-identical SVG string.

### 4. Playback engine

- `LoopPlayer(loopDef, moodLookup)` — pure state machine advanced by
  `advance(tAbsMs)`; computes step index, blend progress, pingpong direction;
  applies `springSpeed` and per-style base durations; interpolates mood deltas
  with easing (`easing.ts`: linear, easeInOut, spring approximation).
- `BlinkScheduler` — deterministic pseudo-random (seeded) intervals within
  min/max; produces blinkPhase 0→1→0 over durationMs; composes by scaling eye
  height after mood deltas (FR-5.5).
- Frame-rate independence (FR-6.3): `advance()` is a pure function of absolute
  time; tests drive it with a fake clock (`advance(t)`, `advance(t+16)`,
  `advance(t+1000)`) and assert identical outcomes vs frame counts.

### 5. Persistence

`app/persistence/local.ts` — `load(): StudioDocument | null`,
`save(doc)` (JSON, debounced 300 ms, synchronous schema re-validation on load;
corrupt data → backup copy + fresh document, never a crash). Storage key:
`bubble-studio.document.v1`.

### 6. Export & runtime

- `export/avatar-file.ts` — resolves effective kit, inlines it, prunes loops to
  selection, validates, serializes (FR-10.2/3).
- `export/snapshot.ts` — background painters (transparent/solid/linear/radial)
  - PNG rasterization via canvas drawImage of an SVG blob (browser-only; the
    pure parts are tested in node).
- `runtime/` — `BubbleAvatar.tsx`: props `definition`, `loop?`, `autoplay`,
  `size`, `paused?`; internally reuses `render/` + `playback/`; zero app
  imports (FR-10.4).

### 7. i18n

`app/i18n.ts` — one module holding a `MessageKey` union and a flat map per
locale; `translator(locale)` returns `t(key)`. Spanish is the source of truth;
`en` must define the same key set.

Parity is enforced by the **type system**, not a test: both maps are declared
`Record<MessageKey, string>`, so a key added to one and missed in the other
fails `pnpm typecheck`. (An earlier draft of this section claimed a test
enforced parity and placed the dictionaries in `i18n/{es.ts,en.ts}`; neither
was ever true.)

### 8. Directory map

The tree below is the real one (35 non-test modules). It replaces a map drafted
before implementation which named 35 paths, of which **18 never existed** and 17
did — so roughly half of it was aspirational, and the halves were not visually
distinguishable. Treat this section as descriptive, and re-derive it with
`find src -name '*.ts*' | grep -v '\.test\.'` rather than trusting it to stay
current.

```
src/
  domain/            # pure: no React, no DOM (lint-enforced)
    ids.ts
    geometry/{primitives.ts,projection.ts,shapes.ts}
    document/{types.ts,create.ts,mutate.ts,validate.ts,migrate.ts}
    playback/{LoopPlayer.ts,easing.ts,ambient.ts}
  render/            # pure
    color.ts  scene.ts  svg.ts
    goldens/{resting.svg,ambient.svg,live-3000.svg}
  export/            # mostly pure; png raster browser-only
    avatar.ts  zip.ts
  runtime/
    BubbleAvatar.tsx
  app/
    studio/{StudioView.tsx,store.ts}
    studio/panels/{LookPanel.tsx,MoodsPanel.tsx,LoopsPanel.tsx,SharePanel.tsx}
    studio/panels/look/{fields.tsx,SurfaceSection.tsx,EyesSection.tsx,
                        ExtrasSection.tsx,AmbientSection.tsx}
    stage/{Stage.tsx,StageEngine.ts}
    i18n.ts  persistence.ts  styles.css
  test/fixtures/{minimal.json,full.json}
```

Names that differ from the draft and are worth knowing: kit copy-on-write lives
inside `document/mutate.ts` rather than its own `kit.ts`; blink and step
durations live in `playback/ambient.ts` and `playback/LoopPlayer.ts` rather than
separate modules; both export builders are in `export/avatar.ts`; and the i18n
dictionaries are one `i18n.ts`, not a directory.

### 9. Key ADRs (ours)

- **ADR-1 (chosen):** single versioned document with ID-referenced loop steps —
  reordering/deleting can never corrupt references.
- **ADR-2 (chosen):** deterministic pure render+playback core so the studio
  stage, snapshots, and the runtime share one code path and tests can be
  string-exact.
- **ADR-3 (chosen):** rAF writes bypass React; React renders only durable
  state — keeps 60 fps with zero vdom churn.

---

<a id="part-05"></a>

## 05 · UI Design — Studio

> Original visual design for helpbubble. Functional coverage per FR-9; look &
> feel is ours (helpbubble brand: warm indigo, rounded, airy).

> **This is a target, not a description.** Written before the UI existed, it
> still describes where the studio is going. Items marked **[built]** exist
> today; **[target]** ones do not yet, and are tracked as roadmap P4. Do not
> read an unmarked sentence as a claim about what runs.
>
> The rail and inspector ship at the sizes below (72px / 360px, `w-18` /
> `w-90`); an earlier note here recorded them as 176px and 288px, which the P4
> UI pass closed, and the rail was 56px until its thumbnails were enlarged.
>
> **The F5 visual pass has been read** against a fresh `pnpm e2e` archive
> (eleven frames under `docs/screenshots/`). §1–§4 hold as described, with one
> defect found and fixed in the same pass: the background segmented control
> clipped "Degradado" to "Degrada…" at the inspector's 360px, and now reads
> "Lineal" / "Linear" — the pair the Share bullets below already name.
>
> Two things the frames show that are _not_ defects, recorded so the next read
> does not re-litigate them. The snapshot preview sits small in its
> checkerboard: it renders `restingScene()` through the same serializer as the
> download, at the scene's own viewBox, so a tighter preview would be a
> preview that lies. And the starter moods and loops carry English names under
> a Spanish UI: those are document data, matched by name by `topUpKit()`, so
> translating them would strand every saved project's kit.
>
> As of the P4 completion pass there are no **[target]** items left in §1–§4:
> every one has been built and is covered by a test that names its FR. What is
> still unverified is not the behaviour but the _look_ — the visual pass
> against this document is F5 work, against fresh `pnpm e2e` screenshots.
> Where the built shape differs from the sketch below, the **[built]**
> paragraph is the description and the bullets are the original target.
>
> **The track redesign (F6) rewrote most of §1 and §2.** Playback left the
> stage for a full-width track that carries the sequence with it, and the
> panels were rebuilt around what that took off them. Where a bullet list
> below still describes the older shape it is marked as the original target
> and the prose above it is what runs. The one item that could _not_ ship as
> the design canvas drew it is recorded in §4: its tertiary text colour did
> not clear the contrast bar §3 sets, and the token is the lifted value.

### 1. Layout

```
┌─────┬───────────────────────────────┬───────────────────────────┐
│ rail│  STAGE (canvas)               │  INSPECTOR                │
│     │  ● resting                    │  ┌─────────────────────┐  │
│ [B] │                               │  │ Look|Moods|Loops|Share │
│ [B] │        (bubble render)        │  └─────────────────────┘  │
│ [B] │                               │  (panel content,          │
│ [+] │                               │   scrollable)             │
├─────┴───────────────────────────────┴───────────────────────────┤
│ ▶ ⏸  idle VIDA  1.62 s / 2.90 s      parpadeo · muelle · 4 pasos │
│ 0        1.0 s        2.0 s                                     │
│ ▐ happy 1.20 s ⌇ curious 0.90 s ⌇ sleepy 0.70 s              [+]│
└─────────────────────────────────────────────────────────────────┘
```

- **Rail (72px):** vertical bubble thumbnails (live mini-renders) at 56px,
  active highlighted, `+` at bottom. The column is sized off the thumbnail
  rather than the other way round: the mini-render is the thing being read, so
  it takes the width and leaves the same 8px gutter either side the narrower
  56/40 pair had. Measured in the browser by the rail smoke scenario, because
  a Tailwind class is not a width until something lays it out. Context menu (right-click / kebab): rename,
  duplicate, move up/down, delete (confirm).
  **[built]** all of the above: the list with live mini-render thumbnails,
  active highlight, add, and a per-bubble context menu (kebab or right-click)
  carrying rename, duplicate, move up/down and delete-with-confirm. The menu
  closes on Escape or an outside click.
- **Stage:** soft radial gradient backdrop (indigo-950→black), bubble centered
  at `min(94%, 40rem)` of the column's short side — the scene's viewBox is
  square, so the render is sized off the short side and the long one is padding.
  It was `min(80%, 32rem)` capping an intrinsic 512px box, which on a wide
  window left the character at its natural size with the stage growing around
  it. The Share panel's export frame reads the same expression, because a frame
  that does not cover exactly the box the render occupies is decorative
  (FR-10.6).
  Overlays: top-left status pill (`● playing idle` / `paused`), top-right gizmo
  button, bottom-right a **zoom** pill — slider and field, 25–200% — that
  scales how big the character is drawn without touching the document. It is
  view state: it does not autosave, does not survive a reload, and no snapshot,
  ZIP or runtime ever sees it. It reaches the render as a `--stage-zoom`
  custom property on the stage column, which is also how the export frame
  follows it: the frame is portalled in from a panel that knows nothing about
  the stage, and one property on their common ancestor is what keeps the two
  exactly the same size (FR-10.6). The column clips, so a frame zoomed past it
  stops at its edge instead of drawing over the header and the inspector. The transport was a dock floating here until the track redesign; it
  is the full-width band below all three columns now (FR-6.6, and the bullet
  after this one).
  **Drag turns the head** (FR-8.1, amended — see `docs/02` and the session-2
  recon notes); position is set numerically in the Look panel. Esc restores the
  pre-drag rotation.
  **[built]** all of the above. Drag-to-turn with Esc restore — Esc restores
  the pose held when the drag began, not the resting pose, which is what
  FR-8.3 asks for and what the code did _not_ do until the P4 completion pass.
  The projected surface the face is anchored to, the radial backdrop, the
  top-left status pill (dot + words, so state never rests on colour alone).
  Playback is not here any more: the track below owns it for the whole app and
  is reachable from every tab, and where the dock hid itself on a kit with no
  loops (FR-5.2), the track offers to make the first one — it is structure, so
  it stays. Top-right, the gizmo button opens a rotation pad
  covering X, Y and Z across ±180° — a drag reaches X and Y across that same
  full turn, so the roll is what remains reachable only here — and the guide toggle
  draws the wireframe: a lat/long mesh over the solid, both hemispheres, with a
  highlight tracing the character's own silhouette rather than an ellipse
  around it (FR-8.4). The same mesh comes up on its own for the length of a
  drag, which is when a character most needs to say it is a solid; the toggle
  and the drag are held separately, so a drag never switches off a mesh the
  user asked for. The character casts a contact shadow
  here too — stage chrome like the guide, never baked into an export, since an
  avatar dropped into someone else's page has no ground to cast onto. Every
  overlay is a sibling of the engine's host element, never a child, or the next
  frame's `innerHTML` write erases it.

  The redesign added three things to that corner. A readout of the head's
  three angles, so a pose can be read without opening the pad that authored
  it. A reset beside the two toggles — undoing a pose is what is most often
  wanted right after setting one, and it used to live inside the pad, which
  had to be opened to reach it; there is one reset now, not two. And a hint,
  bottom-centre, saying the stage can be dragged — which retires itself the
  first time the head is turned, because an affordance hint that outlives the
  affordance is clutter.

- **Header:** the app's name, whether the document is saved (FR-9.6) and a
  shortcuts sheet (FR-9.7). Autosave is silent by design, and silence is
  indistinguishable from a storage that refused the write, so the header
  states which of the three it is — with a word beside the mark, never the
  mark alone (§3). The sheet lists what the studio actually answers to,
  gestures included; it claims no binding that does not work.
- **Inspector (360px):** tab strip + scrollable panel.
- **Track (full width, below all three):** **[built]** the transport, and the
  sequence it drives, as a permanent band rather than an overlay on the stage
  (FR-6.6). Row one is play/pause, stop, the loop picker with its group badge,
  the elapsed readout, and the loop's own settings — blink schedule, spring
  speed, playback mode, and how many steps make how long a cycle. Row two is
  the timeline (FR-6.7): a ruler in seconds, and one chip per step **as wide as
  that step's hold**, with the entry transition drawn on the seam it belongs
  to rather than in a row that can be scrolled away from the pair it joins.

  Three heights. Normal is 152px; the Share tab folds it to a 44px row, since
  nothing there is editing a sequence and playback should still be one gesture
  away; the Moods tab opens it to 212px for the mood tray. The height is fixed
  rather than content-driven, so the stage does not resize as steps come and
  go.

  **The playhead is the one thing here React does not draw.** FR-11.2 keeps the
  per-frame path out of the tree, so `StageEngine` publishes elapsed time into
  a `StageClock` (`app/stage/clock.ts`) and the track writes `style.left` by
  hand from a subscription. A playhead on React state would re-render every
  chip — and every mini-render on them — sixty times a second.

  Two numbers on this band describe different things and only coincide in
  `loop` mode. The ruler spans the **strip**: the authored steps end to end.
  The readout states the **cycle**: what playback takes, which for a pingpong
  includes the leg back. The playhead walks the strip in both directions
  rather than the sequence growing a second row for the return.

### 2. Panels

#### Look (body & resting face)

**[built]** every section below, the shape-family control, an Ambient card for
idle motion (FR-7.1), and drag-to-scrub on every numeric label (FR-9.5) — press
the label and drag horizontally to move the value by the field's own step. The
cards collapse and reopen, remembering nothing across a reload by design.

The track redesign reshaped the fields rather than the sections. A numeric
field puts its label **above** its box, so two fit a row of the 360px column
and a long label ("Profundidad") stops squeezing the number it belongs to;
the value is right-aligned and tabular, so changing one field does not shift
the digits of the one beside it. Colours are three columns — the channel, the
swatch at the column's width, and its hex underneath, which is the part that
tells two near-identical swatches apart. A card header carries what its
section currently says (the shape family, `0/16` against the extras cap), so
a collapsed card still answers the question it was collapsed on, and the two
properties that belong to a whole section rather than to one number — the eye
link, ambient on/off — sit on the header beside it.

The wireframe toggle (FR-8.4) shipped on the stage's top-right cluster
rather than inside the Surface card: it is a stage overlay, and it belongs
beside the gizmo it is used with rather than in a panel the user may have
scrolled away from.

Sections as collapsible cards:

1. **Surface** — a segmented shape family, seven options wrapping onto two
   rows (round / organic / drop / capsule / cylinder / cone / diamond, FR-2.6);
   the organic parameters — lobes, wobble, seed (FR-2.7) — appear only while
   organic is the family, since they do not bite on the others;
   a **size** row — slider and field, 25–200% — above
   width/height/depth/roundness/perspective numeric steppers (unit suffixes u/×),
   and a rotation slider ±180°.

   The size is a percentage of the width a new bubble starts at, derived from
   the three dimensions rather than stored beside them: they are the truth, and
   a stored scale is a second truth that can disagree with them. Moving it
   multiplies all three by one factor in a single patch — depth included,
   because a body that grew in width and height alone would flatten as it grew,
   and the surface is a solid (FR-2.8), not an outline. The slider is for
   finding a size against the stage; the field beside it is for stating one,
   and it carries the same drag-to-scrub every numeric field does (FR-9.5).
   The slider has no visible label of its own — the field names the pair, and a
   second caption over a second copy of the number reads as two controls.

2. **Colors** — body / accent / eyes swatch pickers (preset palette + hex input).
3. **Extras** — list of primitives with kind icon, up/down z buttons, edit
   expander (same numeric controls, including a depth of its own since each one
   is a solid), remove; "Add primitive" button. The card title carries the count
   against the cap (`0/16`, FR-2.3) and the add control disables at sixteen.
4. **Eyes** — linked toggle (chain icon); shared: a **size** row (slider and
   field, 25–200%) over spacing, width, height, roundness; per-side (collapses
   to one when linked): offsetX/Y, rotation, scaleX/Y.

   The size works like the body's — a percentage of the width a new face
   starts at, derived from the two dimensions and committed as one patch.
   Roundness is deliberately outside it: that is what shape the eye is rather
   than how big, and scaling it would turn a rectangle into a capsule on the
   way up. Its label says _eye_ size where the body's says only size, because
   two fields called the same thing in one column are ambiguous to a screen
   reader as surely as to a test.

#### Moods

**[built]** all of the above, and the track redesign reshaped it twice.

The grid is three columns of true mini-renders, filterable by name (FR-4.9)
with a count of what is on screen rather than of the library, and each card
badged with how many loops play it (FR-4.8). Click previews on the stage
(FR-4.4); double-click opens the editor.

**Card actions live on a bar at the foot of the column, not on a kebab.** One
of them has to say _why_ it is unavailable: every one of the 24 starter moods
is in at least one starter loop, so deleting any of them used to be offered,
confirmed, and only then refused by the reducer with E_REF. The bar disables
the control and names the reason (FR-4.8); FR-5.6 is unchanged and still the
backstop for every path that does not go through this panel. The bar carries
the mood's thumbnail, its name, how many loops use it, ↑/↓ — which were the
kebab's keyboard path for reordering and are still the only one — edit,
duplicate and delete-with-confirm. Cards also reorder by dragging (FR-4.2).

**The editor opens with the pose** (FR-4.10): three sliders, one per axis,
turning the whole character rather than its eyes. They sit above everything
else in the editor because that is what they are about, and they span the
same ±180° the stage gizmo does — both set the same kind of angle, and a
narrower control would silently clamp an imported mood that turns further
than we guessed was expressive.

**The rest of the editor is two XY pads, not fourteen sliders.** A per-eye offset is two
numbers that mean one place, so it is dragged as one place, on a pad per eye
that states the ±40u it spans; scale and rotation are one compact row each.
The pad is a pointer affordance only — each axis also has a real range input,
visually hidden, because a div that swallows arrow keys is not a control. A
`Vinculados / Independientes` segmented control makes linking an editing
mode: while it is on, every edit **copies** onto the other side as it is made,
and turning it on brings the two into step at once rather than waiting for
the next edit to touch one. Copies, not mirrors — a mood's deltas aim a gaze,
and both eyes of a face looking left are turned left. Mirroring linked eyes
sent the two pad dots to opposite corners, which is a squint, and left no way
to point a mood anywhere without unlinking first. Independent is the default,
because two eyes that differ are most of what a mood is.

Linking brings a control of its own with it: **Separación**, a single slider
that moves the pair apart or together about its own midpoint, so widening the
gap never also slides the gaze sideways. It shows only while linked — two eyes
edited apart already sit at whatever distance their pads were left at, and a
control that re-centred them would fight the side being dragged. The value is
derived from the two offsets rather than stored beside them, so it cannot
disagree with the pads it describes, and dragging either pad afterwards keeps
the separation while the gaze moves. The one-shot mirror
action remains, and is where FR-3.3's handedness rule still lives — roll and
yaw flip sign, pitch and the scales do not. Rename, the colour override covering body and
eyes independently with a clear action (FR-4.3), and Save / Cancel, where
Cancel discards the draft and puts the saved mood back on the stage (FR-4.4).

The whole editor now fits the column without scrolling, which is the point:
the thing being judged is the stage behind it.

- Grid of mood cards (mini stage render + name), `+` card. Click = preview on
  stage (FR-4.4); double-click = open **Mood editor** (modal over inspector):
  per-eye delta sliders grouped Rotation (X/Y/Z ±30°), Scale (X/Y 0.3–2),
  Offset (±40u), with "mirror left→right" action; color override section
  (body/eyes optional swatches, "clear override"); Save / Cancel (cancel
  restores pre-edit stage, FR-4.4). Kebab on cards: duplicate, delete (blocked
  with toast if referenced — FR-5.6), reorder via drag.

  _(The paragraph above this list is the description; the list is the original
  target. The kebab and the slider stack are both gone.)_

#### Loops

**[built]** all of the above, and the track redesign moved half of it out.

**The sequence is on the track now** (§1): steps are chips whose widths are
their durations, ordered by dragging them there, retimed by their edges
(FR-5.9), and joined by transitions edited on the seams. Playback mode and
spring speed went with them, because they change what the sequence does and
belong beside it. The FR-5.8 summary went too — the track states the step
count, the whole cycle and the blink schedule, and each step's own duration
is both the width and the caption of its chip. A second summary in this
column would be the same numbers, further from the thing they describe.

What is left is the part the track has no room for. The list is grouped by
`group` in first-appearance order, and each row carries the loop's **own
proportions** as a bar plus its cycle length, so a loop can be told apart by
its shape before it is played. The loop's own settings — rename (blank names
are not committed, matching FR-1.2's rule for bubbles), the group control,
duplicate and delete — sit in a card that starts collapsed, as does the blink
card (toggle, min/max interval, duration), because the list is what the
column is for and these are settings you go looking for.

**The step editor is pinned to the foot of the column.** It describes
whichever chip the track has lit, so it must not scroll its own subject out
of view: which step of how many, when it starts, ← → to reorder (FR-5.2's
keyboard path — the chips answer a drag), remove, the mood it plays, its hold
**in seconds** (the unit the timeline is ruled in; milliseconds beside a
second-ruled strip makes the reader convert), and its entry transition. With
no step selected it says to pick one rather than showing controls attached to
nothing.

Groups are free strings. The two the starter catalogue authors are translated;
anything else — an imported loop's own word — reaches the UI as typed, and is
kept selectable so its loops are never stranded without a chip.

- Left: loop list grouped by `group` label (Life / Reactions custom chips);
  `+` new loop. Selecting a loop loads the **timeline**.
- Timeline (bottom of panel, full width): horizontal step chips — mood
  thumbnail, name, holdMs stepper, transition select — drag to reorder
  (buttons ‹ › as accessible fallback); `+` opens mood picker; ✕ removes step.
  _Built vertically, not horizontally:_ at the inspector's 360px a row of
  chips carrying a select, a stepper and three buttons clips, so steps stack
  and each one keeps its controls on two lines. The reorder buttons are ↑ ↓
  rather than ‹ › for the same reason — they name the direction the list
  actually moves in.
- Loop settings row: mode segmented control (Loop / Once / Ping-pong),
  springSpeed slider 0.1–3, blink card (toggle + min/max interval + duration).
- Transport "Play" always plays the selected loop. It lives on the stage dock
  (§1), which shares its loop selection with this panel.

  _(The paragraphs above are the description; this list is the original
  target. The step list, the mode and spring controls and the summary are all
  on the track now, and the dock is a track.)_

#### Share (export)

**The export frame is drawn on the stage** (FR-10.6), not described as a
number in the panel: framing is a decision made by looking at the character,
and a crop stated only as `1024` has to be imagined over it. The frame covers
exactly the box the render occupies — the scene's viewBox is square and the
stage caps it at the same `min(94%, 40rem)` the frame uses — with corner
marks, a label naming the size and background it will have, and a line saying
which stage chrome (the guide, the contact shadow) the export leaves behind.
Like every stage overlay it is a sibling of the engine's host element, never
a child; it is portalled onto the stage column from the panel that owns the
size and background state.

**The loop picker is chips, not twenty checkboxes** (FR-10.3), grouped the way
the catalogue is, with a per-group clear/restore so "just the reactions" is
one press rather than ten. Under it, what the package will contain before it
is built: loops, moods, how many moods the prune drops, and the weight —
every number read off the avatar `buildPortableAvatar` would actually build,
so the panel cannot promise a file the button does not write. It is the
definition that is weighed, not the ZIP: the README and the example are fixed
overhead that no choice in this panel moves.

Downloads are rows that say what each artifact is and what is inside it.

**[built]** all of the above. Resolution choice; transparent, solid, linear and
radial backgrounds with configurable stops; a live preview of the framed result
on a checkerboard, rendering the same scene and background as the download so
the pickers are judged by eye; SVG and PNG download; a loop checklist that
starts with everything checked (FR-10.3) and drives the mood pruning as well as
the embedded loops; the character JSON; the ZIP, which now carries the
`example.tsx` FR-10.5 asks for; project export; and import behind a
confirmation that lists what is in the file — N bubbles, M moods, K loops —
counted across the starter kit _and_ every private kit a bubble has diverged
into. The language control ships in the header rather than this panel.

- **Snapshot card:** resolution segmented (512/1024/2048), background picker
  (transparent/solid/linear/radial + color stops), buttons _Download SVG_ /
  _Download PNG_, live mini preview of framed result.
- **Character card:** shows active bubble; loop checklist (all checked);
  _Download .bubble-avatar.json_; _Download package (.zip)_.
- **Project card:** _Export project_ / _Import project_ (file picker →
  confirmation dialog with summary: N bubbles, M moods, K loops → Replace /
  Cancel) (FR-9.3).
- **Language:** es/en segmented control (FR-9.4).

### 3. Interaction states & a11y

- **[built]** Every numeric input: label + unit suffix, ↑↓ steppers, arrow-key
  support, and drag-to-scrub on the label (`NumberField` in
  `panels/look/fields.tsx`).
- **[built]** Focus rings visible on dark stage — a single `:focus-visible`
  rule in `styles.css` paints the accent on every surface. Every list that
  drags also reorders from a button: rail move up/down, step ↑ ↓, and the mood
  kebab's move up/down. The drag sits on top of the buttons; it never replaces
  them.
- **[built]** The mood editor and the import confirmation are modal dialogs
  (`Modal` in `studio/ui.tsx`): named, `aria-modal`, focus moves in on open,
  Tab cycles inside rather than escaping to the page behind, and Escape or the
  backdrop closes.
- **[built]** Empty state: no bubbles → "Crea tu primera bubble" + `+` hint.
- **[built]** Destructive actions confirm: deleting a **bubble** (FR-1.5), a
  **loop**, or a **mood**, and replacing the project on **import** (FR-9.3).
  Re-derive with
  `grep -rn "confirm(" src/app --include=*.tsx | grep -v test`, which should
  return four guarded call sites. A confirmed mood delete can still be refused
  by the reducer if a loop references it (E_REF, FR-5.6) — the gate and the
  invariant are independent.
- **[built]** Status pill uses dot + text, not colour alone. Every text pair
  clears 4.5:1 and every non-text mark clears 3:1 — asserted in
  `src/app/theme.test.ts`, which parses the real tokens out of `styles.css`, so
  a palette edit that breaks the rule fails the suite instead of shipping.
  Run `pnpm vitest run src/app/theme.test.ts` to re-derive rather than trusting
  this line.

### 4. Visual language

All three bullets are **[built]** as Tailwind v4 `@theme` tokens in
`src/app/styles.css`; components reference them by utility name (`bg-panel`,
`text-ink-dim`, `rounded-card`) rather than repeating hex literals.

- Font: `Inter` first in `--font-sans`, falling back to the system stack;
  `--radius-card` is 14px, inside the documented 12–16px. Spacing runs on
  Tailwind's 4px base (`--spacing: .25rem`) using 8px and 12px steps — a finer
  grid than the 8px this section originally specified.
- Palette: bg `#0b0d16` stage / `#121527` panels; accent `#8be9ff`; text
  `#e8eaf6`; danger `#ff5d73` all ship verbatim.

  **The primary moved.** This section originally specified primary `#6c7bff`,
  and the UI used it as the fill behind white text. That pairing measures
  3.55:1 — under the 4.5:1 §3 requires — and the hover fill was worse at
  2.66:1. The indigo therefore split by role, keeping the same hue (234°):
  `--color-primary` `#505bbd` (5.88:1) and `--color-primary-hi` `#5662cc`
  (5.23:1) for fills that carry text, and `--color-brand` `#6c7bff` — the
  original value — for marks that never sit behind text: the active rail ring,
  the slider fill and thumb, the resting status dot.

  Note the avatar's own default body colour is still `#6c7bff`; it lives in
  `domain/document/create.ts` as document data, is independent of these chrome
  tokens, and is a fill rather than text, so the text rule does not apply.

  The implementation also adds surface tokens the original palette did not
  name — `--color-stage-glow` (stage backdrop), `--color-panel-2` /
  `--color-panel-3` (card and control grounds), `--color-line` (borders) and
  `--color-ink-dim`.

  **The track redesign adds five more**, and one of them is a correction
  rather than an addition. `--color-ink-mute` `#848bb4` is a third ink below
  `ink-dim`, for ruler labels and the one-line note under a card. The design
  canvas drew that role at `#6f759b`, which measures 4.04:1 on `panel` and
  3.75:1 on `panel-2` — under §3's 4.5:1, so it could not ship as text. The
  lifted value clears the bar on all four surfaces the studio paints.
  `--color-line-soft` `#1c2038` (hairlines dividing lanes inside the track),
  `--color-line-hi` `#2c3255` (the step chip's edge, which has to read on
  `panel-2` where `line` disappears), `--color-outline` `#3b4270` (secondary
  button border) and `--color-track` `#313760` (unselected step-proportion
  bars) are marks and boundaries, never text. They sit **below** the 3:1
  non-text bar on purpose: none of them is the only carrier of anything — a
  proportion bar always sits beside its duration in words, a bordered control
  always states its own label — and `theme.test.ts` asserts that deliberate
  choice rather than leaving it to look like an oversight.

- Motion: panel transitions are 150ms ease-out, inside the ≤ 160ms budget;
  stage animation is owned by the engine. A `prefers-reduced-motion` block
  collapses every transition to ~0ms.

---

<a id="part-06"></a>

## 06 · Export Formats & Runtime

### 1. Snapshot (FR-10.1)

- Source: `sceneToSvg(scene, {viewBox, background})` — same scene as the stage
  at snapshot time (current live state frozen; ambient offset included, engine
  time frozen at capture).

  **[built], with one deliberate split.** The snapshot carries the **pose** —
  a head turned by dragging the stage (FR-8.1) reaches the preview and both
  downloads, because "the current stage" is what FR-10.1 asks for and the
  export frame drawn over that stage says so. It does **not** carry the
  ambient breath: `restingScene(bubble, 0, head)` keeps engine time at zero,
  so the same character in the same pose is always the same bytes. A pose is
  an instruction the user gave; a breath is a phase they did not choose, and
  a snapshot that caught one could not be re-made.

  The ZIP's `bubble.svg` stays unposed on purpose (§5): it sits beside a
  definition that has no pose either, and its README says which it is.

- Backgrounds:
  - `transparent` — no background rect.
  - `solid` — `<rect fill="#..."/>`.
  - `linear` / `radial` — `<defs><gradient>` two user-configured stops.
    All four are implemented in `render/svg.ts` and covered by tests; the Share
    panel currently offers only transparent, solid and linear, with fixed
    stops. Exposing radial and the stop pickers is roadmap P4 (FR-10.1).
- PNG: rasterize the SVG string via `Image` + canvas at target resolution
  (square 1:1), `image/png` blob download. Browser-only path; gradient/scene
  construction is pure and node-tested.

### 2. Character definition `*.bubble-avatar.json`

Shape per `03-data-model.md` §6. Rules:

- Kit is **inlined**: if the bubble owns a kit, use it; else inline a deep copy
  of the starter kit (a portable file must be self-contained).
- `loops` array lists exported loop IDs; non-listed loops are pruned; pruning
  never orphans moods (moods referenced by remaining steps are always kept;
  unreferenced moods are pruned to keep files lean).
- Output is validated (schema + referential integrity) **before** download;
  export of an invalid document is impossible by construction.

### 3. Runtime `BubbleAvatar` (FR-10.4)

```tsx
import { BubbleAvatar } from "@helpbubble/bubble-avatar-react";
import definition from "./mango.bubble-avatar.json";

<BubbleAvatar definition={definition} loop="idle" autoplay size={240} />;
```

- Props: `definition` (parsed JSON, validated once), `loop?` (id or name;
  default: first loop), `autoplay=true`, `paused?` (controlled), `size`
  (px, square), `ariaLabel?`.
- Behavior: renders the same SVG scene builder as the studio; runs its own
  engine instance (rAF, paused when `document.hidden` or `paused`); honors
  blink config; falls back to resting face when `loop` omitted.
- Constraints: no network, no storage, no context requirements; safe in SSR
  (renders resting face statically, hydrates animation client-side).

### 4. Export package (ZIP)

Target layout:

```
mango-bubble/
  mango.bubble-avatar.json
  README.md            # install + usage snippet (generated, es/en)
  example.tsx          # minimal React usage
```

ZIP built client-side (store-only compression; content is tiny).

**Ships today:** the definition JSON, a 1024px `bubble.svg` snapshot, and a
plain `README.txt`. The generated bilingual `README.md` and `example.tsx` are
roadmap P4 (FR-10.5) — this section described them before they were written.

### 5. Project backup `*.bubble-studio.json` (FR-9.3)

Full document per `03-data-model.md` §1. Import flow: parse → migrate chain →
validate → confirmation dialog (counts) → replace in-memory + storage. Any
failure aborts with a readable, localized error and leaves current data intact.

---

<a id="part-07"></a>

## 07 · Testing Strategy — TDD is mandatory

### 1. Policy (repo law)

1. **No production code without a failing test first.** Workflow per unit:
   red (test encodes a requirement ID) → green (minimal implementation) →
   refactor (stay green).
2. Every test file references the FR IDs it encodes in its top comment; the
   roadmap task is "done" only when its FR tests pass.
3. `pnpm check` (format + typecheck + lint + tests + build, in that order)
   must be green before any commit is considered final. CI runs the same gate.
   Prettier is pinned exactly, not caret-ranged: a floating minor reflows files
   nobody touched, which reads as a change in every diff that follows it.

### 2. Layers & tools

| Layer            | Tool                             | What is tested                                                                                                                                                                 |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `domain/` (pure) | Vitest (node env)                | Geometry math, document mutations/invariants, kit copy-on-write, validation, migration, playback timing with **fake clocks**, blink determinism, ambient math                  |
| `render/` (pure) | Vitest (node env)                | Scene building from fixtures; **byte-exact** SVG serialization (golden strings); determinism (same input → same bytes)                                                         |
| `export/`        | Vitest                           | Avatar/project file builders (round-trip: export → validate → import → deep-equal), loop pruning, orphan-mood pruning, error codes                                             |
| `app/` UI        | Vitest + Testing Library (jsdom) | User flows: create bubble, edit mood deltas with cancel restoring stage, linked-eye mirroring, loop step reorder keeps moodId, import confirmation gate, i18n key parity es/en |
| `runtime/`       | Vitest + Testing Library         | Renders resting face from a definition; starts/pauses; identical SVG vs studio for same state (FR-10.4)                                                                        |
| Theme a11y       | Vitest (parses `styles.css`)     | Contrast ratios computed from the real tokens: >= 4.5:1 for every text pair, >= 3:1 for non-text marks (`docs/05` §3). A palette edit that breaks the rule fails here          |
| Visual smoke     | Playwright (F5 only)             | Screenshots of studio boot, each panel, a playing loop and the rail context menu; asserts the stage dock and status pill; manual review vs `05-ui-design.md`                   |

### 3. Timing tests (the critical ones — FR-6.3)

`LoopPlayer` is advanced with an injected clock:

```ts
const p = new LoopPlayer(loop, moods);
p.advance(0);
p.advance(1000); // 1 big frame
const q = new LoopPlayer(loop, moods);
for (let t = 0; t <= 1000; t += 16) q.advance(t); // 62 small frames
expect(stateOf(p)).toEqual(stateOf(q)); // frame-rate independence
```

Blink uses a seeded PRNG: same seed → same schedule (assert exact interval
sequence); ambient is a pure function of `(t, config)` (assert zero offset at
t=0 and periodicity).

### 4. Fixtures

`src/test/fixtures/` — canonical documents: `minimal.json` (1 bubble, no kit)
and `full.json` (2 bubbles, own kit on the first, 2 moods and 1 loop in each
kit). Both are loaded through `validateDocument`, so schema drift breaks tests.

These stay hand-written and deliberately small — they are _not_ built from
`starterKit()`. That is what keeps `src/render/goldens/*.svg` frozen when the
starter library grows, and it was re-verified when P3 took the kit to 24 moods
and 20 loops.

`src/test/fixtures/invalid/` — one document per validation rule, each derived
from `minimal.json` and broken in exactly one place. The filename carries the
code it must fail with (`E_REF.step-names-a-missing-mood.json`), and
`validate.test.ts` globs the directory: a new case needs no test edit, a
fixture that fails with the wrong code fails by name, and one that trips a
second rule as well fails the "exactly one rule each" case. A roster in that
test mirrors the `ErrorCode` union, so a code shipped without a fixture breaks
the suite.

Writing them found dead weight: `E_ID` was declared in the union and emitted
nowhere — docs/03 §7 rule 2 asks for unique ids, not for an id _format_ — so
it is gone rather than given a fixture that could not be written.

The inline cases in `validate.test.ts` stay. They cover the same codes reached
from other places in the tree (a broken ref inside an `ownKit`, a bad
transition, a non-integer seed), which one file per code cannot express.

### 4b. Current state (re-derive; do not trust)

As of the help sheet and the mark (F9): **44 Vitest files, 737 tests**, plus
**1 Playwright spec** of **14 scenarios** — boot, panels, a playing loop and
the rail menu, joined by the mood editor's focus behaviour, the gizmo, the
wireframe, the Share preview, drag-to-scrub, drag-to-reorder, a 1024×720
check that the track's first row and the inspector do not clip, and the help
sheet's backdrop reaching every window edge. Production bundle 361.87 kB JS /
39.35 kB CSS (108.56 / 7.80 gzipped).

Five of those scenarios exist because jsdom cannot decide them. The playing
loop asserts the **playhead has moved**: jsdom can prove the writer runs, not
that the engine's frames arrive. The narrow-window case is a layout question,
which jsdom has no answer to at all. So is the help sheet's backdrop: it is
`absolute inset-0`, so what it actually covers depends on which ancestor is
positioned, and only a real box model can say. And so is the cursor follow:
jsdom lays nothing out, so the stage box the pointer is measured against is
0×0 there and the aim never leaves dead centre. And so are the triad's
colours: they are `var(--color-axis-*)` written into an SVG through
`innerHTML`, and whether a custom property resolves across that boundary is
something only a real style engine reports.

The nine tests over F7's 637 are F8's: four pin what `springSpeed` does to a
`spring()` curve and one that the loop's own value reaches `LoopPlayer`
(FR-5.4); one that linked eyes land on the same point rather than opposite
ones; and three for the separation slider — that it spreads the pair
symmetrically, that a pad dragged afterwards keeps the gap, and that the row
is there only while linked. Two more were rewritten rather than added, since the
mirrored behaviour they asserted is the defect.

The 37 tests over F6's 600 are the mood pose's (F7), and they are spread
rather than gathered into a file of their own, because the pose reaches every
layer that already read a rotation: the composed value in `render.test.ts`
(including a loop that turns the character), the shorter-arc travel in
`playback.test.ts`, the v5 -> v6 migration proving itself a no-op in
`migrate.test.ts`, the portable format's matching step in `avatar.test.ts`,
the 24 posed starter records in `content.test.ts`, and the editor's three axes
in `MoodsPanel.test.tsx`.

Before them, the 134 tests over the 466 were F6's track redesign. Four files
are new — `Track.test.tsx` (the largest single addition in the suite),
`stage/clock.test.ts` for the seam the playhead rides,
`panels/moods/XYPad.test.tsx`, and `persistence.test.ts` for the save state
the header now reports — joined by a `theme.test.ts` block recording which of
the new tints sit under the 3:1 non-text bar deliberately. The rest landed as
rewrites of the panels the track took work away from.

Ten tests over the 456 that preceded them, in two batches.

Five are `solid.test.ts`'s pole-on and convergence blocks, and each failed
against the sampler as it stood. Three cover the pole: a solid of revolution
seen down its own axis is the ellipse its widest ring projects to, no bin near
the pole collapses into a notch, and a bin counts as reached only when a real
sample reached it. Two cover the sampler's convergence, which is the measure
that cannot be fooled by real geometry — compare a reading against a heavily
oversampled reading of the same solid and anything the shape really has
cancels. That is what caught the shallow-body case the pole tests miss, and it
is the tool to reach for when a silhouette looks wrong and it is not obvious
whether the shape or the sampler is at fault.

Five more are `migrate.test.ts`'s v4 -> v5 block: the top-up closes the library
gap, keeps every mood the project already had by id, leaves a renamed mood
alone, reaches a bubble's own kit as well as the shared one, and does not run
again on a v5 document — which is what keeps a deleted starter mood deleted.

The 91 tests over F5's 360 are the solid body's: `solid.test.ts` is the new
file (the turned silhouette, its agreement with the analytic ellipsoid, the
memo, and the assertion that an organic body's lumps travel), and the rest are
spread across authored depth and its v3 migration, the radial wobble, the
wireframe mesh, the face clip, the rim light, extras sharing the body's volume,
the cube family, and the depth every assembled primitive now carries. The
bundle moved 7.9 kB, almost all of it `solid.ts`.

Earlier, the 17 tests over P4's 343 were F5's own: the library top-up through
the store and its Moods-panel row, and the nine `invalid/` fixtures with the
three cases that police them.

Earlier in the P4 completion pass the reading was 292.47 / 28.59 kB across 343
tests and 4 e2e scenarios.

The JS grew 17.9 kB over P3 (274.55 kB) and the CSS 2.4 kB (26.20 kB). That is
the whole of P4's remaining surface arriving at once: the modal and menu
primitives, the mood editor with fourteen delta sliders, the loop summary and
blink card, the rotation gizmo and projection guide, the Share preview and loop
picker, and the two drag behaviours.

The test count grew 89 over P3's 254, across eight new files. Three are pure
domain — `playback/summary.test.ts`, `document/summary.test.ts` and
`document/library.test.ts` — and five are app: `ui.test.tsx`,
`dragReorder.test.tsx`, `panels/MoodsPanel.test.tsx`,
`panels/LoopsPanel.test.tsx` and `panels/look/fields.test.tsx`. Two of those
panels had been covered only indirectly through `StudioView.test.tsx` before,
which is why several of their behaviours had never been asserted at all.

One trap when re-deriving the CSS figure: Tailwind v4 scans every non-ignored
file in the repo for class candidates, **markdown included**. An untracked
research note containing the words "shadow" and "invisible" in prose adds
`.shadow` and `.invisible` rules and inflates the CSS by ~0.27 kB. Measure on a
clean tree, or the number reflects your scratch files rather than the app.

Earlier readings, kept as the trend rather than as claims about today: P3 was
274.55 / 26.20 kB, P2 269.46 kB JS, and the first P4 UI pass 267.09 kB JS
against a CSS that had roughly doubled from P2's 13.98 kB when the design
tokens, the collapsible-card chrome and the explicit range/swatch styling
arrived.

Re-derive rather than trusting these: `pnpm test` prints the file and test
counts, `pnpm build` prints the bundle sizes. They are recorded here as a
tripwire — if they disagree with a fresh run, this doc is stale, not the run.

### 5. Regression discipline

Any bug fix lands with the test that reproduces it (red → green). Golden SVG
files change only with an explicit snapshot update in the same diff, reviewed
visually (F5 screenshots) when geometry is touched.

A regression test that has only ever been seen passing is not yet evidence.
Confirm it fails against the unfixed code before trusting it — the defect sweep
(roadmap G) did this per fix, and the mood-preview test was verified by removing
the wiring again and watching it fail. When the test cannot be written before
the fix, remove the fix afterwards to check the test notices.

Where a change alters the goldens, the commit says which values moved and why
(e.g. eye corner radii scaling by exactly the fixture's 0.9 roundness), so a
reviewer can tell a deliberate visual change from an accidental one.

---

<a id="part-08"></a>

## 08 · Roadmap

> Execution order is fixed; TDD per `07-testing-strategy.md`. Each phase lists
> acceptance criteria (AC) — all must be green before the next phase starts.

### R — Design docs (done)

`CLEANROOM.md`, research notes, docs 01–08. AC: docs complete & consistent.

### F0 — Scaffold

Vite + React 19 + TS strict + Vitest + Tailwind 4; ESLint with layer-boundary
rule (domain imports nothing upward); `pnpm check` script; empty app boots.

- **AC:** `pnpm check` green; CI-equivalent local gate documented in README.

### F1 — Domain core (pure, TDD)

Order: ids → document types/create → validate → mutate (FR-1, FR-2 data, FR-3
data, FR-4.1–4.3, FR-5.1–5.6) → kit copy-on-write → geometry (blob path FR-2,
projection FR-8.2) → easing/durations → LoopPlayer + blink (FR-5, FR-6.2–6.4)
→ ambient (FR-7) → migrate stub.

- **AC:** full domain suite green incl. frame-rate-independence tests; zero
  React/DOM imports (lint-enforced).

### F2 — Render (pure, TDD)

`scene.ts` (doc+live→Scene) and `svg.ts` (Scene→string, deterministic);
golden-SVG tests; snapshot background painters (pure parts).

- **AC:** byte-exact goldens for resting/playing/blinking states; determinism
  test green.

### F3 — Studio UI (React, behavior-tested then visual)

Store + actions wiring; Shell layout; Look panel (FR-2, FR-3, FR-9.1); Moods
panel + editor modal (FR-4); Loops panel + timeline (FR-5); transport + stage
engine (FR-6, FR-8, FR-11.2); persistence autosave (FR-9.2); i18n es/en
(FR-9.4).

- **AC:** Testing Library flows green; manual visual pass vs `05-ui-design.md`;
  autosave round-trip (reload restores document).

### F4 — Export & runtime (TDD)

Avatar/project file builders (FR-10.2/3, FR-9.3); snapshot UI + PNG (FR-10.1);
`BubbleAvatar` runtime (FR-10.4); ZIP package (FR-10.5).

- **AC:** round-trip tests green; runtime renders identical SVG to studio for
  same definition+state.

### G — Defect sweep (done)

Seven defects found by auditing the running app against this spec: a loop-less
kit crashing the studio, pause and stop not stopping the frame loop, an
unplayable loop throwing inside rAF, eye roundness and mood rotation X/Y never
reaching the renderer, a runtime `size` prop that sized only its wrapper, and a
CI pnpm pin that conflicted with `packageManager`. Each landed with the
regression test that reproduced it first.

- **AC:** each fix has a test confirmed red before it and green after.

### P — Parity (done)

Bring the app level with what the concept demands, per the feature inventory in
`docs/research/blackbox-notes.md` session 3.

Every FR the four sub-phases name is covered by a test that cites it. The last
piece of UI this phase was waiting on — the row that calls `topUpLibrary()` —
landed in F5.

- **P1 (done)** Volume: anchor the face on a projected surface (FR-8.2), shade
  the body, and keep a resting character alive — blinking, micro-saccades,
  breathing (FR-7).
- **P2 (done)** Shape vocabulary: the `round`, `organic` and `drop` families
  and their parameters (FR-2.6, FR-2.7), schema v2 plus the v1→v2 migration,
  and a shape control in the Look panel. Later extended to seven families —
  `capsule`, `cylinder`, `cone` and `diamond` — with no schema change, since
  widening an enum leaves every saved document valid.

  The geometry had landed a step earlier (`9d957cf`) but nothing imported it —
  `scene.ts` still drew one superellipse. The wire-up is what closed P2:
  `Surface` carries the family, `migrate()` became a real chain, and the
  portable avatar format bumped alongside with `readPortableAvatar()` still
  accepting v1 files. The three render goldens are byte-unchanged across that
  commit, which is the evidence the migration default is behaviour-preserving
  rather than merely plausible.

- **P3 (done)** Content: the starter library ships **24 moods** (FR-4.7) across
  the six bands the spec names — alert, calm, warm, negative, sleepy, playful —
  and **20 loops** split 10 `life` / 10 `reaction` (FR-5.7), all original.

  Lives in a new pure `src/domain/content/` module of literal records
  (`moods.ts`, `loops.ts`), with `starterKit()` composing it, so `create.ts`
  stays about document creation. Loops name moods by a stable local key, never
  by index. `content.test.ts` guards the counts, the band spread, name and key
  uniqueness, and that every delta and timing sits inside the range
  `validate.ts` accepts — so a bad record fails at its source rather than as a
  document-validation error three layers away.

  Two things the wire-up fixed on the way through. `starterKit(ids)` now fills
  injected mood and loop ids **positionally with a fallback**; previously a
  partial list (`playback.test.ts` passes two mood ids) left the remaining ids
  `undefined`. And the fake-`Random` step-id trick collided past the ninth step
  — it fed `n / 10 ** len(n)` to `newId`, so step 10 produced step 1's id — and
  is now a seeded LCG, still deterministic across runs.

  The predicted snags landed exactly as predicted and are fixed:
  `StudioView.test.tsx` derives the new-mood name from
  `starterKit().moods.length + 1` instead of hard-coding `"mood 5"`, and
  `mutate.test.ts`'s reorder case passes the complete id array `permute()`
  requires. Every mood is referenced by at least one loop, which is what keeps
  the E_REF path (FR-5.6) that test relies on true. The render goldens came out
  **unchanged**, as predicted — they are driven by `test/fixtures/full.json`,
  not by `starterKit()`.

  _Found by running the app rather than the tests, and since decided:_
  `starterKit()` is called only from `createDefaultDocument()`, so the library
  reaches **new** documents only. A project already in localStorage keeps the
  kit it was saved with, and a returning user still sees four moods while the
  tests assert twenty-four.

  Of the three options that were open — leave it, offer an explicit action,
  migrate on load — the decision is the middle one. Migrating on load would
  resurrect a mood the user had deliberately deleted, on every reload, which
  is worse than the gap it closes. `domain/document/library.ts` therefore
  holds an additive `topUpKit()`: it appends every library mood and loop the
  kit lacks and touches nothing else, so no existing loop can lose its
  referent. Matching is by name, because a saved document carries no link back
  to the library entry it came from — a renamed starter mood reads as missing
  and the entry returns _beside_ the rename rather than overwriting it.
  `topUpLibrary(doc, bubbleId)` routes it to the kit that bubble actually
  reads: the shared starter kit when it inherits (so sibling bubbles gain the
  content and nothing forks behind the user's back), its private kit when it
  has already diverged.

  _Closed in F5:_ the Moods panel measures the gap with `libraryGap()` and
  offers it as a row for as long as there is one, dispatching `library/topUp`.

- **P4 (done)** Remaining UI surfaces.

  The first pass built the stage transport dock and status pill (FR-6.2), rail
  thumbnails with rename/duplicate/reorder/delete (FR-1.2, FR-1.4), loop
  duplicate and the accessible ↑ ↓ step reorder (FR-5.2, FR-5.5), mood
  duplicate, collapsible inspector cards on shared tokens, and the rail and
  inspector at their then-documented 56px / 360px (the rail is 72px now — see
  docs/05 §1).

  The completion pass closed the rest:

  - **The defect first.** FR-8.3 says Esc restores the pre-drag rotation;
    `Stage.tsx` reset it to zero, and the test that asserted the zero
    behaviour was rewritten and watched fail before the fix.
  - **Loops** (FR-5.8, FR-5.2): a summary of steps, holds, whole cycle and
    blink schedule; rename; the blink card; and a list grouped by `group` with
    a control that moves loops between groups. `summarizeLoop()` shares
    `cycleSteps()` with `LoopPlayer`, so the summary cannot drift from the
    playback it describes — a pingpong cycle is longer than its holds sum to,
    and both now say so from one place.
  - **Moods** (FR-4.1–4.3): a modal editor carrying all seven deltas per eye —
    rotation X and Y had been in the renderer since `0f29cee` with no control
    to set them — plus a mirror action, a colour override covering body _and_
    eyes independently, and a per-card menu with edit, duplicate, move up/down
    and delete-with-confirm. `mood/reorder` finally has a call site.
  - **Stage** (FR-8.2, FR-8.4): a rotation gizmo spanning ±180° on all three
    axes, where a drag reaches X and Y across that whole range at 0.3° per
    pixel and wraps rather than stopping, leaving the roll to the gizmo; and the
    projection guide, whose arcs are sampled through the same `project()` the
    eyes go through, so it shows where an anchor would really land. Both are
    siblings of the engine's host element, asserted directly, because a child
    is erased by the next `innerHTML` write.
  - **Share** (FR-10.1, FR-10.3, FR-10.5, FR-9.3): a live preview of the
    framed result, radial backgrounds with configurable stops, a loop
    checklist that also drives the mood pruning, an import confirmation that
    counts what is in the file instead of a hard-coded `confirm()` string, and
    the `example.tsx` the package was missing.
  - **Direct manipulation** (FR-9.5, FR-1.4, FR-5.2): drag-to-scrub on every
    numeric label, and drag-to-reorder for the rail, the mood grid and the
    loop timeline — the ↑ ↓ buttons stay as the accessible path underneath.

  _Two shared primitives made the rest possible._ `Modal` and
  `Menu`/`MenuItem` now live in `studio/ui.tsx`; the menu is the rail's own,
  lifted, with the rail's existing tests as the evidence the lift changed no
  behaviour. The modal is scoped to its positioned ancestor rather than the
  viewport, and portals into the inspector column: the point of editing a mood
  is watching the stage change under the slider, so a full-screen dim would
  hide the thing being edited, and rendering in place would let the column's
  scroll box clip the dialog header.

  _One test taught a lesson worth keeping._ The rail's drag case was first
  written against two bubbles the studio both names "Bubble" — a list of two
  identical names reads the same reversed, so it passed with the wiring
  removed. It now seeds the Alpha/Beta fixture. A regression test seen only
  passing is not evidence.

- **AC:** `pnpm check` green per step; every FR above covered by a test that
  names it; a visual pass in a real browser, not only jsdom. The first two
  hold at 343 tests across 31 files. The browser pass was **done in F5**,
  against a re-archived `pnpm e2e` run.

### F5 — Hardening & final verification (done)

All five items closed, in the order they are listed.

1. **The starter-library affordance.** `topUpLibrary()` has a call site: a
   `library/topUp` action through the same transactional commit as every other
   mutation, and a Moods-panel row that measures the gap with `libraryGap()`
   and shows only while it is non-zero. It needs no confirmation because the
   domain function only ever appends. A fresh document is built from the
   current library, so the row is invisible there by construction — which is
   also why the test that asserts it stays hidden was checked against an
   unconditional row before being trusted.
2. **The smoke is ten scenarios**, weighted towards what jsdom models loosely:
   the mood editor's focus behaviour, the gizmo surviving a rendered frame,
   the guide reaching the SVG, the Share preview, and both drags. Both drag
   tests were confirmed to fail against a sabotaged build rather than trusted
   for passing.
3. **The visual pass is read.** Eleven frames against `docs/05` §1–§4; one
   defect, a background segment clipping "Degradado" to "Degrada…" at 360px,
   now "Lineal" / "Linear". Two non-defects are written into `docs/05` so the
   next read does not re-open them.
4. **The `invalid/` fixtures** exist: nine documents, one per validation rule,
   each broken in exactly one place, globbed by `validate.test.ts` from their
   filenames. Writing them found `E_ID` declared in the union and emitted
   nowhere; it is gone.
5. **The audit is recorded** as `docs/CLEANROOM.md` §6, with the greps to
   re-derive it. It found one piece of upstream UI copy — the Share panel's
   "Photo Mode", which is their name for that card — now "Instantánea" /
   "Snapshot", the name `docs/05` had used all along. Tagged **v0.1.0**.

- **AC:** all gates green (360 tests / 31 files, 10 e2e scenarios); eleven
  screenshots archived under `docs/screenshots/`; audit clean and recorded.

### F6 — The track redesign (done)

Direction A of a two-direction design canvas, built in nine steps, each
green on `pnpm check` before the next began.

**The thesis, in one move.** Playback was a pill floating over the character.
It is a permanent full-width band under all three columns now (FR-6.6), and
it carries the sequence with it (FR-6.7): a step is a chip exactly as wide as
its hold, the ruler is in seconds, and a transition is edited on the seam it
happens on. Three things follow from that and are worth stating.

_The playhead is not React state._ FR-11.2 keeps the per-frame path out of the
tree, so `StageEngine` publishes elapsed time into `app/stage/clock.ts` and
the track writes `style.left` by hand. `Track.test.tsx` counts renders across
a published frame; the e2e suite asserts the playhead has actually moved,
because jsdom can prove the writer runs but not that the frames arrive.

_Two totals, and they differ._ The ruler spans the authored strip; the readout
states the cycle playback takes, which for a pingpong includes the leg back.
The playhead walks the strip in both directions rather than the sequence
growing a second row for the return.

_A scrub rides the same seam backwards._ `clock.seek` moves the loop clock
from the UI rather than leaking the engine instance up into the shell, and a
scrub on a stopped stage pauses it there — stopped rewinds on every update,
so a scrub that left it stopped would do nothing visible.

**What the panels became.** The Loops panel lost half of itself to the track
and kept the catalogue, the loop's own settings and an editor for the step in
hand, pinned so it cannot scroll its own subject away. The Moods grid became
searchable (FR-4.9) and badged with usage (FR-4.8), and its card actions left
the kebab for a bar that can say _why_ a delete is unavailable — every one of
the 24 starter moods is in a starter loop, so the old path was offer,
confirm, refuse. The mood editor's fourteen stacked sliders became two XY
pads: an offset is two numbers that mean one place. Look laid its fields two
to a row. Share draws the export frame on the stage, where framing is decided,
and states what the package will weigh before it is built (FR-10.6).

**One thing the canvas drew that could not ship as drawn.** Its tertiary text
colour, `#6f759b`, measures 4.04:1 on `panel` — under the 4.5:1 docs/05 §3
requires. `--color-ink-mute` is the lifted value that clears the bar on all
four surfaces, and `theme.test.ts` now also records which of the new tints
sit under the 3:1 non-text bar deliberately, so the choice does not read as
an oversight later.

**Two habits that paid.** Every regression test was checked against a
sabotaged build before being trusted — which is how the drag scale, the
pad's Y direction, the loop-id guard on the playhead and the pre-empted
delete all earned their tests. And Testing Library's drag helpers turned out
not to carry `clientX` into React's synthetic event, silently landing every
drop at the end of the sequence; the drag tests build their events by hand,
and the real path was confirmed in Chrome with a genuine `DragEvent`.

- **AC:** all gates green — **600 tests / 36 files**, **11 e2e scenarios**
  (the eleventh is a 1024×720 check that the track's first row and the
  inspector do not clip); goldens byte-unchanged, verified by diffing
  `src/render/` and `src/domain/geometry/` against the branch point; every
  screen read against its artboard in a real browser at 1440px.

### F7 — A mood turns the body (done)

Reported as a gap by the user, confirmed by a black-box session against the
deployed reference (`docs/research/blackbox-notes.md`, 2026-08-26): their
expressions carry a three-axis rotation of the whole character, every one of
their preset thumbnails shows the body at a different orientation because of
it, and playback travels between those poses. Ours moved the eyes on a body
that never moved, so every animation in the library was a face working on a
statue.

**Schema v6** adds `head` to a mood. Three decisions in it are worth keeping.

_It composes, it does not replace._ The mood's pose is added to whatever
direct manipulation is holding, so a user who turned the character to see it
side-on keeps that view while it animates. `buildScene` does the addition
once, at the top, which is why all seven readers of the head rotation cannot
drift apart.

_The travel takes the shorter arc per axis._ From 170° to −170° is twenty
degrees across the back, not three hundred and forty across the front. The
eye deltas never hit this because they live inside ±30; a body pose spans the
whole turn. Their own engine avoids the same defect by interpolating the
rotation as a rotation, which was the fact worth taking from the observation
rather than the technique.

_The migration is a no-op by construction._ A v5 mood joins v6 facing
straight ahead, which is exactly what it drew, so no saved character changes
and the goldens are byte-identical. The portable format took the same step at
its own v5, because the runtime still reads files written before poses
existed.

**The starter library uses it**, or the feature would have shipped invisible:
24 poses in a table beside the moods, authored from what each one means and
deliberately small — a body swinging tens of degrees per keyframe reads as a
character being shaken rather than one reacting.

One note for whoever verifies this next in a browser. `requestAnimationFrame`
stalls in an unfocused automated tab, which freezes the engine and makes a
posed loop look static through the automation even though it is not. The
composed path is covered deterministically instead (`render.test.ts`, "a loop
turns the character"), and the visual check was done by clicking between two
moods, which needs no frame loop at all.

- **AC:** all gates green — **637 tests / 36 files**, 11 e2e scenarios;
  goldens byte-unchanged against the branch point; the observation logged and
  committed before the implementation, per docs/CLEANROOM.md.

### F8 — The knob that did nothing, and the link that squinted (done)

Two defects, both found by looking rather than by a failing test: the first by
trying to cite FR-5.4 on a test, the second reported from the editor with a
screenshot of two eyes pointing opposite ways.

**FR-5.4 · `springSpeed` reached the renderer and changed nothing.** It is
authored in the Loops panel, range-checked at 0.1–3, migrated, exported, and
read by `LoopPlayer` — which handed it to `spring(speed)`, where
`durationSec = 0.9 / s` divided by the same `s` that multiplied both terms:

```
k             = t * 0.9 / s
-6 * s * k    = -5.4 * t          <- s gone
2π * 1.2s * k = 2π * 1.08 * t     <- s gone
```

Every speed in the legal range returned one identical curve, to twelve
decimals.

The word meant two different things, and the choice was **curve, not timing**.
The spec said "scales transition durations globally", which would have widened
or narrowed the transition window — and the window is the final 40% of a hold,
which `summarizeLoop()` reports and the track draws step widths from, so timing
would have moved arithmetic that is already on screen. As a curve knob the
window is untouched and only the travel through it changes: higher speed
arrives sooner and rings more. FR-5.4's wording was corrected to match rather
than the other way round.

Dropping the `/ s` was not enough on its own, and the test says so: it left the
slow end short, `spring(0.1)` reaching 0.54 at t=0.999 before the `c >= 1`
branch snapped it to 1. The residual is therefore detrended by its own end
value — `1 - r(t) + t·r(1)` — which lands every speed on 1 with no jump and
moves s=1 by at most 0.004, so the starter library animates as authored. The
goldens are resting and ambient frames and came out byte-identical.

**FR-4.1 · linked eyes were mirrored, not copied.** The editor's
`Vinculados` mode ran each edit through `mirrorEye`, the handedness rule
FR-3.3 applies to the **resting face** — where the two eyes are geometry, and
handed. A mood's deltas are not geometry; they aim a gaze, and both eyes of a
face looking left are turned left. Mirroring put the two pad dots in opposite
corners, so a linked mood could not be pointed anywhere: the reported symptom
was a character that squints at itself whenever the two sides are in step.
Linked now copies. The one-shot `Reflejar izquierdo → derecho` action keeps
`mirrorEye`, which is the case it was written for.

Copying alone would have left the pair welded together, so linking also brings
a **Separación** slider: it moves the two eyes apart or together about their
own midpoint, which is what keeps widening the gap from also sliding the gaze
sideways. The value is derived (`right.offsetX - left.offsetX`) rather than
stored, so nothing can drift out of step with the pads, and a pad dragged
afterwards carries the separation along with it. It appears only while linked;
that condition earned its test against a build where the row was
unconditional.

- **AC:** all gates green — **643 tests / 36 files**, 11 e2e scenarios;
  goldens byte-unchanged; the `springSpeed` test confirmed against a
  `LoopPlayer` sabotaged to pass 1, and all three eye-link tests watched red
  before the copy landed; the linked pads read the same X/Y in a real browser,
  not only in jsdom.

### Beyond the roadmap — the 3D question

`docs/research/3d-bubble-exploration.md` is an investigation, not a committed
phase. It measured that our body outline does not turn: `surfacePath` takes no
rotation, so an `organic` character keeps the same lumps in the same screen
positions and merely squashes, which is the strongest "flat sticker" tell we
have. It also found three defects worth fixing whichever way that goes — the
shading gradient walks off the character past ~140° of yaw, extras get no
foreshortening or depth sort so they slide across a turning head like decals,
and there is no contact shadow at all.

**Built.** See the outcome section of that document: the body is a solid, the
silhouette turns, depth is authored (schema v3), the guide is a wireframe
raised on a drag, the face clips at the limb, and the body carries a rim light
that a roll no longer drags around with it. The three defects below are all
closed.

Those three were ordinary defect work. The larger idea — deriving the
silhouette from a radius field over the sphere, measured at 1.5% of a frame
and prototyped to keep the goldens frozen — needs a decision first, chiefly
whether the 3D shape stays derived from today's `lobes`/`wobble`/`seed` or
becomes an authored field with a v3 migration. It is not scheduled.

---

<a id="part-cleanroom"></a>

## CLEANROOM Protocol — Bubble Avatar Studio

> **Status:** Active policy for the entire lifetime of this repository.
> **Owner:** helpbubble
> **Purpose:** Ensure that this codebase is an independent, original work and does
> not constitute a derivative of any third-party source code, so that helpbubble
> may license its own product freely.

### 1. What this project is

Bubble Avatar Studio is an original implementation of a _concept_: a browser-based
authoring studio for procedural 2D avatars (parametric body geometry, expressions,
animation timelines, portable exports). Concepts, ideas, features, and functionality
are not protected by copyright. Only the specific _expression_ — source code,
comments, and creative written prose — is.

This project therefore re-implements the concept from a **functional specification**,
with entirely original code, naming, file formats, architecture vocabulary, UI copy,
and visual design.

### 2. Authorized sources (Tier 2)

The functional specification in `docs/` was derived exclusively from:

| Source                                                                                                        | Use                                                             |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Public README of the upstream project (`github.com/smontlouis/bible-strong-avatar-lab`, README page)          | Feature inventory — facts only                                  |
| Live deployed application (`avatars.bible-strong.app`), operated as a black box by driving it as a user would | Behavioral observation notes                                    |
| Upstream non-code prose docs (`CONTEXT.md`, `docs/adr/*.md`) read via public GitHub raw URLs                  | Facts about intent/architecture extracted into original wording |

**Rule applied to all prose sources:** every sentence in `docs/` and in this
repository's code is original writing. Facts and ideas were extracted; no text was
copied, paraphrase-copied, or structurally mirrored.

### 3. Prohibited sources (never, under any circumstances)

No contributor, agent, or contractor working on this repository may read, browse,
clone into their workspace for reference, prompt an AI with, or otherwise study:

- Any upstream source file: `src/**`, `packages/**`, `legacy/**`, `scripts/**`
- Any upstream build/config content used as an implementation reference
- Compiled or minified output of the upstream application
- The upstream Git history

If contamination occurs (someone reads prohibited material), they must be removed
from implementation duty for this repository and the incident recorded in §5 below.

### 4. Independence checklist

- [x] Own data format (`Bubble Avatar` JSON schema, versioned independently)
- [x] Own naming: domain terms chosen fresh ("Bubble", "pose layer", "mood", etc.)
- [x] Own visual design system for the Studio UI
- [x] Own architecture decisions, recorded as our own ADRs where significant
- [x] No upstream code, identifiers copied with cosmetic renaming, or translated text

### 5. Contamination / incident log

| Date | Incident      | Resolution |
| ---- | ------------- | ---------- |
| —    | none recorded | —          |

No contamination has occurred: no prohibited source in §3 has been read at any
point in this project's life. The §6 audit below is a separate thing — a sweep
of what we shipped, not a report of anything we read.

### 6. Pre-release audit (F5, 2026-08-25)

Swept `src/`, `e2e/` and `docs/` (excluding `docs/research/`, which quotes the
upstream by design) for anything of theirs that had reached ours.

**Clean:** no upstream project, author or repository name anywhere in the
source; no upstream vocabulary as an identifier — the §2 mapping holds, and
the code says bubble, resting face, live state, starter kit, own kit, mood,
loop throughout; no French or Chinese strings, which are two of the three
localizations the live app was observed in and would be the obvious trace of
copied UI copy; no upstream code, minified or otherwise, and no dependency on
anything they publish. `package.json` carries React and the toolchain, nothing
else.

**One finding, fixed in the same pass.** The Share panel's first card was
titled "Photo Mode" — in both locales, untranslated in Spanish, which is what
gave it away. That is upstream's own name for that feature, recorded verbatim
in `docs/research/blackbox-notes.md`. Observing that they have such a card is
a fact about capability and is fair; shipping their name for it is copied UI
copy under §3. It now reads "Instantánea" / "Snapshot", which is what
`docs/05` had called the card all along.

**Two considered and cleared.** Our starter mood library shares seven names —
happy, curious, sad, proud, playful, drowsy, surprised — with the twenty-three
expression names the live app was observed to carry, and one loop name (idle).
These are the common English words for the states themselves, not names for a
product feature: an emotion library that avoided "happy" and "sad" would be
a worse library, and the capability is what parity means. The other seventeen
moods and nineteen loops are ours outright, as are every delta and every
timing. Likewise "Spring speed" follows from `transition: "spring"` in our own
schema (docs/03 §5) rather than from anything of theirs, and "Blink" names a
behaviour our own FR-5.5 specifies.

Re-derive with:

```bash
grep -rniE "bible.?strong|smontlouis|avatar.?lab" src e2e docs --exclude-dir=research
grep -rnP "[\x{4e00}-\x{9fff}]" src        # Chinese strings
```

_This file must be updated if any incident ever occurs. An honest log preserves the
credibility of this protocol._

---

<a id="research-upstream"></a>

## Research Notes — Upstream Facts (original wording)

> Provenance: facts extracted under CLEANROOM.md §2 from public README page,
> `CONTEXT.md`, ADR-0022, ADR-0023, and black-box observation of the live app.
> All sentences below are original summaries written by this project. Facts only;
> no upstream prose is reproduced.

### 1. Product concept (facts)

- Browser-only authoring studio for procedural 2D avatars rendered as SVG.
- Character body assembled from one primary facial surface plus additional
  primitives with 3D-inspired parameters (dimensions, roundness, position, local
  rotation, perspective approximation, colors, optional wireframe guides).
- No backend: everything lives in browser local storage; JSON files are the
  portable interchange.
- Ships as: Studio app + reusable runtime libraries (React binding and a plain
  JS/ESM DOM renderer) consuming a single portable avatar definition file.
- UI localization observed: English, French, Simplified Chinese.

### 2. Domain vocabulary (facts we re-map to our own terms)

| Upstream term           | Meaning (fact)                                                                        | Our chosen term  |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| Avatar                  | Reusable character; persistent visual identity = body + colors + neutral eyes         | **Bubble**       |
| Neutral appearance      | Persistent base look before any expression is applied                                 | **Resting face** |
| Pose                    | Current temporary visual configuration; not persisted directly                        | **Live state**   |
| Base behavior library   | Bundled immutable expressions/animations inherited until first customization          | **Starter kit**  |
| Avatar behavior library | Per-avatar copy created atomically on first behavior edit (copy-on-write)             | **Own kit**      |
| Expression              | Saved preset; eye values RELATIVE to resting face; optional temporary color overrides | **Mood**         |
| Animation               | Ordered mood steps + transitions + blink settings                                     | **Loop**         |
| Playback                | The running execution of an Animation; owns live state until user grabs control       | **Playback**     |

We deliberately use different words than upstream so our codebase vocabulary is ours.

### 3. Behavioral invariants (facts)

1. A character inherits the starter kit until its FIRST mood/loop edit.
2. That first edit clones moods AND loops together (references stay valid) — atomic copy-on-write.
3. After that, edits affect only the owning character; duplicating a character duplicates its own kit.
4. Transferring a loop between characters must carry every mood it references.
5. The primary surface carries the facial coordinate frame and both eyes; secondary
   primitives are independent (own size/position/rotation).
6. Moods stay compatible across different bodies because eye deltas are expressed in
   the common facial frame, not absolute coordinates.
7. Live preview updates during editing, but in-editor unsaved edits must remain
   cancelable (reversible).
8. Playback exclusively controls the live state; direct manipulation on canvas
   pauses playback. Switching characters keeps playback position.

### 4. Document model lessons (from ADR facts)

- One versioned studio document, persisted as a whole — not separate silos.
- Moods have durable IDs; loop steps reference mood BY ID, never by array index
  (reordering/deleting must not corrupt loops).
- Mutations preserve cross-object invariants transactionally.
- Pre-release schema: bundled current version is the baseline; no legacy migrations kept.
- Terminology must be consistent across tabs/editor/player/export (they had three
  competing names once; we pick ours once and enforce).

### 5. Architecture boundaries (facts worth adopting as our own decisions too)

- Pure geometry/document logic lives framework-independent (no React imports).
- Durable editor state in React; high-frequency animation values outside the React
  render path (motion values / direct rAF writes).
- Exports receive explicit data as arguments; never reach into storage themselves.
- Generated standalone runtime artifact is committed and freshness-checked in CI-style validation.
- Studio controller pattern: one coordinator hook owning operations over the document;
  view components stay declarative.

### 6. Feature inventory (facts from public feature list)

Characters: create/rename/duplicate/reorder/delete. Body from primary facial surface +
extra primitives; per-primitive dimensions, roundness, position, local rotation,
perspective, colors, wireframe guides. Eyes editable jointly (linked size/proportion/
position) or independently. Direct canvas manipulation: translate + rotate handles.
Ambient subtle motion on body and eyes at rest.
Moods: create/save/duplicate/reorder/delete; relative eye deltas; optional temporary
body/eye color overrides per mood.
Loops: steps from moods with per-step hold time and transition style; playback modes
loop / play-once / ping-pong; configurable automatic blinking; preview/play/pause/stop.
Export: SVG or PNG snapshots with transparent / solid / linear-gradient /
radial-gradient backgrounds; resolution choice; portable `.avatar.json` consumed by
React package or framework-free ESM package; integration ZIP bundling definition +
wrapper + instructions without duplicating engine code; full project JSON backup +
import-with-confirmation.
Studio UX: canvas left / inspector right; four areas (body, moods, loops, export);
autosave to local storage; language switcher.

### 7. Deliberate divergences (our choices, ours to change freely)

- Own file format name and shape (`bubble-avatar.v1.json`, project `.bubble-studio.json`).
- Own brand voice and UI visual design (helpbubble palette/layout), same functional coverage.
- Spanish-first i18n (es/en) instead of en/fr/zh.
- We may simplify: single React runtime package now; ESM wrapper later if needed.

---

<a id="research-blackbox"></a>

## Black-box Observation Notes — Live App Session

> Method: headless Chromium driven as a plain user against `avatars.bible-strong.app`
> (2026-08). Screenshots archived at `/tmp/opencode/blackbox/`. No source code read.
> All wording below is original.

### Global layout

- Two-pane split: **dark stage (~64%) left**, **light inspector (~36%) right**,
  plus a **bottom dock** overlaying both panes' lower edge.
- Top-left: product brand. Top-right: GitHub link + language dropdown (flag icon).
- Stage widgets: "PLAYING <name>" status pill (top-left), reset-view button,
  a circular 3-axis rotation gizmo widget (top-right, colored axis rings),
  small X/Y/Z color legend (bottom-right), central bottom "Photo Mode" button +
  round info button. Footer credit line under the stage.
- Bottom dock: horizontal strip of small animation thumbnails (current selection
  highlighted), playback status pill repeated ("PLAYING proud"), pause/play
  round button, square stop-like button.
- Bottom navigation tabs across dock: [character name] · Pose · Expressions ·
  Animations · Export. Active tab highlighted.

### Boot behavior

- On load, an animation is already running ("proud") without user action;
  status pill reflects it. Avatar canvas shows a big rounded blob character
  (blue ellipse body, two dark capsule eyes).

### Avatars panel (character name tab / initial state)

- Heading "Avatars"; grid of character cards: SVG thumbnail + name below
  (observed 10: Strobi, Freddy, Citrus, Nova, Grok bot, Sunee, Kirby, Cloudee,
  Cubee, Onee) + dashed "+" add-card; count badge top-right; hint
  "Double-click to edit". Selected card outlined.
- Card thumbnails are live mini renders of each character.

### Pose tab (inspector)

Sections observed (headings): Pose · Body · Body color · Head rotation · Eyes ·
Eye color · Width · Height · Proportional size · Position and spacing · Left eye ·
Right eye · Local rotation · Projection · Perspective.

Controls: numeric inputs with unit suffixes — degrees (°) for rotations,
units (u) for sizes/positions, multiplier (×) for perspective; one checkbox
(linked eyes); paired Left/Right eye sub-columns; buttons labeled e.g.
"Rotation X↔", "Horizontal↔" acting as link/unlink pair toggles per property group.
17 text/number inputs + 1 checkbox visible.

Interpretation: body = width/height/proportions; head rotation X/Y/Z in degrees;
eye block = per-eye width/height (proportional size), horizontal/vertical offset,
spacing between eyes, per-eye local rotation, global perspective factor.

### Expressions tab

Heading "Expressions", count "27 PRESETS", hint "Double-click to edit".
Grid of numbered mood thumbnails (00–26); most inherit body color, two showed
temporary color overrides (one red-bodied, one pale-blue-bodied). Dashed "+"
card to add. Clicking a preset applies it to the stage immediately (implied by
selection outline following clicks).

Pose-tab dump also revealed expression-level sliders: per-eye Rotation X/Y/Z,
Horizontal/Vertical offsets, Spacing, Perspective — i.e., editing a mood means
adjusting those deltas relative to resting face.

### Animations tab

Headings "Expressions" (source list) + "Motion". Count "23 ANIMATIONS".
Grouped catalog:

- **Life cycle:** sleeping, waking, idle, listening, thinking, searching, working
- **Reactions:** excited, bored, suspicious, angry, drowsy, happy, curious,
  confused, surprised, proud, shy, sad, laughing, scared, playful, celebrate
  Timeline strip of numbered step cells 00–25 (drag/reorder implied), plus
  controls: "Spring speed↔" (transition tuning), "Blink" toggle, "Random
  expression" button. Playback runs in stage with PLAYING pill.

### Export tab

Two accordions:

1. **Photo Mode** — "Prepare a static image directly in the main preview."
2. **Export Avatar** — "Choose animations, then use the same JSON definition
   with React or JavaScript." Shows selected-character summary card; Format
   chooser with two option cards: _React / TypeScript_ ("Runtime JSON +
   createAvatar") and _JavaScript / ESM_ ("Runtime JSON + avatar-web");
   animations selector "23/23 SELECTED" with Customize expander; "Quick Start"
   code snippet section below.

Also a flat checkbox-list dump earlier showed all 23 animation names as
selectable items (the export picker).

### Cross-cutting behaviors noted

- Selection model: exactly one character active; all tabs operate on it.
- Playback keeps running across tab switches (pill persists).
- Canvas manipulation: gizmo implies orbit-style head rotation; direct drag
  supported per README (not exercised headlessly).
- Autosave: no explicit save button anywhere → persistence is automatic.

### Session 2 — 2026-08-23 (behavior-only)

> Method: the live app driven as an ordinary user in a normal Chrome window.
> Only rendered output was consulted — screenshots and on-screen text. No source,
> bundle, network payload or exported file was opened. Screenshots kept out of the
> repo. Purpose: settle behavioral questions before finishing our own studio; our
> visual design remains our own per `05-ui-design.md`.

#### Transport has three states, not two

The status pill reads PLAYING, PAUSED or STOPPED, and the dock carries a
play/pause toggle plus a separate square stop control. Stopping does three things
at once: the pill flips to STOPPED, the step strip snaps back to its first cell,
and the character returns to a neutral face. Pausing simply freezes where it is.
Our transport currently models only a play/pause boolean.

#### Dragging the canvas rotates the head — it does not move the character

Dragging across the stage left the silhouette centred where it was and instead
turned the head: the eyes travelled across the face, the body foreshortened, and
the small three-ring orientation widget in the stage corner followed the drag. A
reset control sits beside that widget. Nothing observed moved the character's
position by dragging, which contradicts our FR-8.1 as written.

#### Head rotation composes with, and survives, playback

A rotation set by dragging persisted while an animation played, across a tab
change, and across a character switch — it behaves as live view state layered on
top of the animation rather than something playback overwrites.

#### Applying an expression takes ownership of the live state

Clicking an expression card while an animation was running flipped the pill from
PLAYING to PAUSED. Manual expression selection pauses playback, the same
exclusivity rule our FR-6.1 states.

#### Playback continues across character switches

Selecting a different character mid-playback kept the same animation running by
name, and the dock's step thumbnails re-rendered in the new character's colours.
The characters share one preset library, so the animation remains applicable.

#### Blink settings live inside the per-animation editor

Opening an animation's editor (double-click) replaces the panel with a dedicated
editing view: name and description, a playback-mode dropdown, a timeline of step
cells that reorder by dragging with a duration field for the selected step, and a
blink card — an enable switch, a first-blink delay, minimum and maximum interval,
and blink duration, all in milliseconds. Its footer offers delete, duplicate and
save. Leaving the editor resumed playback on its own. Note our `BlinkConfig` has
no first-blink delay; FR-5.5 does not require one.

#### Cards everywhere are live mini-renders

Character cards, expression presets and animation entries all draw the actual
character rather than an icon, and expression/animation catalogues are grouped and
counted ("27 presets", "23 animations", life-cycle versus reactions).

### Session 3 — 2026-08-23 (feature inventory for parity)

> Same method and limits as session 2: rendered output only, described in our
> own words. Purpose: decide what "feature parity" has to cover.

#### Silhouettes are organic, not just superellipses

The character gallery spans shapes our geometry cannot currently express. Several
are irregular and lumpy — a wide slumped form, a cloud of overlapping lobes, a
teardrop, a blob with a bite taken out of one side — while others are a plain
circle or a rounded square, which our superellipse already covers. One character
is a body ringed by radiating petals, i.e. a surface plus a set of extra
primitives arranged around it, which our extras model does cover.

Conclusion: parity needs a shape vocabulary beyond one superellipse — an organic
outline whose radius varies around the perimeter — plus the extras we have.

#### Pose controls

Body: colour, and head rotation X/Y/Z in degrees. Eyes: colour, per-eye width,
height and a proportional-size control, per-eye horizontal and vertical position,
a shared spacing, and per-eye tilt. Projection: a perspective factor described as
simulated face depth, plus a toggle that draws the projection surface as a guide.

Two notes that matter for us. Eye position is described as shared coordinates
projected onto the selected shape — the same anchor-on-a-surface model, and
confirmation that the shape is a selectable property of the character. And the
numeric labels can be dragged sideways to scrub their value, the way a design
tool does, rather than only typed into.

#### The animation panel summarises what will happen

Alongside playback mode it shows how many expressions the animation steps
through with each step's duration, the delay before the first blink, the
randomised interval range between blinks, and how long a blink takes. Ours
exposes the same underlying values as raw inputs but never summarises them.

#### Parity gaps, as a list

1. An organic outline family; a per-character shape choice.
2. A large expression library (theirs shows 27) rather than our four.
3. An animation catalogue grouped into life-cycle and reaction sets (theirs
   shows 23) rather than our two.
4. A projection guide overlay.
5. Drag-to-scrub numeric labels.
6. A summary of an animation's timing and blink behaviour.

### Session 2026-08-25 — body construction and a full-range turn

> Method unchanged: the deployed app driven as a plain user, screenshots only.
> No source code read, nothing saved back to their app. Wording is ours.

#### Half a turn shows the back of the head

Setting Rotation Y to 180 on their stage hides both eyes and leaves the
silhouette at its **full width** — the body is not foreshortened at all, it is
simply turned around. That is the reading a real rotation gives (a half turn
maps the silhouette onto itself), and it is what our projection now produces;
before this session ours collapsed the face frame to a fifth of its size at the
same angle. Their gizmo rings flip with the pose, so the widget doubles as the
readout for which way round the head is.

#### Body construction: a primary shape plus assembled primitives

Double-clicking a character opens a panel headed _body construction_, described
as choosing the primary shape and then assembling primitives around it. The
primary is flagged as the one that **carries the eyes** — the face anchors ride
it, exactly the relationship our `restingFace` has with `body.surface`.

Six primary families are offered, each with an icon: **sphere, cube, capsule,
cylinder, cone, diamond**. Ours has three (round, organic, drop), so this is the
concrete list behind parity gap 1.

The primary's numeric fields are scale, width, height, **depth** and roundness.
Depth being authored is the notable one: we derive our ellipsoid's depth radius
from the in-plane radii (`DEPTH_RATIO * min(rx, ry)`), so a character cannot be
made shallow or deep. It is the same field the projection question left parked.

Up to 16 further shapes can be added around the primary ("add a shape", 0/16),
which is a richer relationship than our flat `body.extras` list — theirs are
part of the body's construction rather than decals over it.

#### Editing shows a silhouette highlight

While a body is being edited the stage draws a bright outline tight around the
character's own outline (not an ellipse), which reads as "this is the shape you
are editing". Separate from the projection guide, which draws the surface.

#### Parity gaps, updated

7. Six primary shape families rather than three.
8. An authored depth for the body, rather than a derived one.
9. ~~Assembled primitives as part of body construction, capped at 16.~~
   **Closed.** Extras carry their own depth and foreshorten by their own solid
   rather than by the surface beneath them, and the count is capped at 16 and
   shown against the cap.
10. A silhouette highlight while a body is being edited.

### Session 2026-08-25 (b) — how their 3D is actually made

Driven as a user again, screenshots only. One new method note: their character
answers `document.elementFromPoint` as a `path`, and the wireframe overlay is
vector too. **Their renderer is SVG, not WebGL.** That is a fact about
capability, and it settles a question our own exploration doc had left open on
architectural grounds — matching them never needed a 3D library.

#### Their character has no shading at all

At rest their orange character is a single flat fill. No gradient, no specular,
no rim light, no contact shadow, no stroke. We had assumed the reverse and it
inverts the obvious plan: on lighting we were already ahead, and the gap was
entirely geometry and interaction.

#### The silhouette genuinely turns

Dragged through roughly 50° of yaw, a character built from a body and three
lobes shows its lobes swing from the left side around to the back while the
crown grows new bumps. The outline reshapes; it does not squash. Our own
measurements said ours could not do this — the outline was computed once and
given a uniform scale.

#### The body is a primary solid plus assembled 3D primitives

The wireframe shows a curved lat/long grid over a rounded-superellipsoid body,
with each lobe carrying its own silhouette. In the ordinary render they merge
into one continuous contour, because they share a fill and carry no stroke.

#### Eyes are cut off by the body, not faded

At about 35° of yaw the far eye is a white sliver truncated flat along the
body's own contour. Ours faded out on an opacity ramp, which reads as a decal
ghosting rather than as something going round the side of a solid.

#### A wireframe appears while the pointer is held on the character

A full sphere grid with the far-side lines visible through it, plus a bright
outline hugging the silhouette. It is up only for the duration of the press.
This is a large part of why the thing announces itself as a solid object, and
ours had nothing equivalent — one equator and one meridian, behind a toggle.

#### Parity gaps, updated

11. Eyes clipped by the silhouette rather than faded at the rim.
12. A wireframe mesh raised for the duration of a pointer press, rather than
    only from a toggle.

### Session: how the drag itself is tuned (2026-08-25)

Driven as a user in a browser — clicks, drags and screenshots only, per
`docs/CLEANROOM.md` §2/§3. Nothing of theirs was fetched, viewed or read
beyond the rendered page a visitor sees.

Their pose panel reports the head rotation as three numbers, which makes the
drag measurable without any guesswork: drag a known number of pixels across the
stage, then read the number off their own UI. Character used was the plain
round one, whose symmetry keeps a yaw unambiguous.

#### The rate is flat at a shade under 0.3° per pixel

| gesture            | yaw before | yaw after | change |
| ------------------ | ---------- | --------- | ------ |
| 100px right        | 148.7      | 177.7     | +29.0  |
| 200px left         | 177.7      | 119.7     | −58.0  |
| 100px down (pitch) | 2.3        | −25.8     | −28.1  |

Exactly double the travel gives exactly double the angle, so there is no
acceleration curve and no dead zone at the start of a press — 100px is 29° from
anywhere. Both axes move at the same rate.

#### Which pointer axis drives which rotation, and with what sign

Horizontal travel drives the yaw and vertical travel the pitch, never crossed.
Dragging right raises the yaw, so the character turns toward the viewer's
right and follows the pointer. Dragging down lowers the pitch, so the character
looks downward — the pitch takes the vertical travel with the sign flipped,
which is what makes the face go the way the hand goes on a screen whose y runs
downward.

#### A drag is not bounded at a quarter turn

The yaw passed 148, then 177, then 222, and read 334 after further dragging;
the pitch was observed past −69. So a drag alone reaches the whole turn,
including the back of the head, and their rotation gizmo is not the only route
to a large angle. Ours stopped dead at ±60 and left the rest to the gizmo,
which is most of why a long gesture felt unresponsive: the pointer kept
travelling while the character had already stopped.

Long drags also nudged the roll a little, and their rate over a 300px gesture
came out slightly above the 0.29 the short ones agree on — there may be some
settling or inertia in their drag. Not characterized further; the short-gesture
number is the one worth matching.

#### Parity gaps, updated

13. A drag reached only ±60 of yaw and pitch, where theirs reaches a full turn.
14. Our drag rate was 0.2° per pixel against their 0.29, and our pointer axes
    were crossed: horizontal travel drove the pitch, so dragging right tipped
    the character upward instead of turning it.

### Session 2026-08-26 — an expression carries a body pose

> Same method and limits as every session above: the deployed app driven as a
> user, screenshots and clicks only. No source, no bundle, no network payloads.
> Character used was the lumpy orange one, whose asymmetry makes a rotation
> unmistakable — the round one is a sphere revolved, so a yaw leaves its
> silhouette unchanged and hides exactly the thing being looked for.

#### An expression stores a three-axis rotation, not only eye deltas

Their expression editor has a rotation card under the section about the body,
with three numbered fields — one per axis, in degrees to one decimal, and both
signs occur. Two presets read:

| preset | X    | Y     | Z     |
| ------ | ---- | ----- | ----- |
| 12     | −8.8 | −8.7  | −10.8 |
| 17     | −4.4 | +14.1 | −16.1 |

So the value is per-expression, not one global pose. The magnitudes are in the
low tens rather than anywhere near a half turn.

#### It moves the whole character, and the grid says so at a glance

Every one of the 27 preset thumbnails draws the character at a visibly
different orientation — the silhouette leans, the ears land in different
places, and the proportions change as the body turns. Clicking two of them in
turn moved the whole body on the stage, not just the eyes, and their
three-axis rotation widget re-oriented to match each one. That widget is the
clearest tell available without measuring pixels: it is a picture of the
current orientation, and it changes when an expression is applied.

#### Playback moves the body continuously, not in steps

Two frames captured seconds apart during one animation showed markedly
different silhouettes and widget orientations. So a pose is not merely
snapped to at each keyframe; the engine travels between the poses the way it
travels between the eye deltas.

#### How they describe the travel

Their motion card states that the transition interpolates the stored values
and that the rotation specifically is interpolated as a rotation — spherically,
between quaternions — rather than one axis at a time. A single spring-speed
number governs the whole thing (7 on this character). Worth knowing because
per-axis interpolation of Euler angles takes the long way round whenever two
poses straddle the wrap, which is a real defect and not a stylistic one.

#### Also seen, not acted on

Their expressions carry a stable public key separate from the display name,
described as what an application loading the avatar would name it by. Ours
have such a key in the starter content but not in the document (see
`domain/content/moods.ts`, where `key` is local and `starterKit()` is the only
thing that resolves it). Noted for a future parity pass, not this one.

#### Parity gaps, updated

15. Their expressions carry a body pose — three rotation axes per expression,
    interpolated across a loop's steps — and ours carry only per-eye deltas
    and an optional colour. Our animations move the eyes on a body that never
    moves.

---

<a id="research-3d"></a>

## Exploring a solid-object bubble

> **Status: built.** Option B shipped; what follows was the investigation that
> led to it, with an outcome section at the end recording what the build
> measured and where it disagreed with the guesses here.
> Method: reading our own render layer, plus measurements taken against it
> (recorded below). Behavioural targets come from `blackbox-notes.md`; no
> upstream source was read, per `docs/CLEANROOM.md` §3.

### The question

Make the character read as a real geometric solid that can be turned a full
360°, the way a rendered 3D object does — without changing the visual style we
have now.

### What we already have, and what is actually missing

The surprise is that **half of this is already built**, and the missing half is
narrower than it looks.

`projectFace` (`src/domain/geometry/projection.ts`) is genuine 3D: it treats the
face as anchors on an **ellipsoid**, yaws and pitches them in three dimensions,
foreshortens them locally, and returns a signed `depth` so an anchor that has
rotated behind the surface fades out. Its own comment names the reason — "a
shear only reads as a tilted sticker." That work is done and it is correct.

The body is the part that is not 3D. `surfacePath` takes `shape`, `width`,
`height`, `roundness`, `lobes`, `wobble`, `seed` — **and no rotation**. The
outline is computed once, then `buildScene` applies a uniform
`scale(scaleX scaleY)` to it. Measured directly:

```
organic path @ any yaw: M 97.91 0 C 99.93 4.29 102.33 8.9 ...
=> identical bytes at every head rotation; only a uniform scale() differs.
```

For the `round` family this is invisible and mathematically exact — an
ellipsoid's silhouette under orthographic projection really _is_ a scaled
ellipse, which is precisely what `apparent()` computes. For `organic` and
`drop` it is wrong in the way that matters most here: **a lumpy solid must show
different lumps as it turns.** Ours keeps the same bumps pinned in the same
screen positions and merely squashes them. That is the single strongest "flat
sticker" tell, and it lands exactly on the shape families that give characters
their identity.

### Measured: a 3D silhouette is affordable in plain SVG

The natural fix is to promote the shape from a 2D outline to a **radius field
over the sphere**, `R(θ, φ)` — a base ellipsoid modulated by the same kind of
harmonics `wobbleAt` already uses — then derive the outline per frame by
sampling the surface, rotating it, projecting, and taking the maximum extent per
screen angle.

Prototyped and timed against our own numbers:

```
3D silhouette: 64x32 samples -> 64 outline points
cost: 0.247 ms/frame  (16.7ms budget => 1.5% of one frame)
max outline radius change between yaw 0 and yaw 90: 17.6 px  <- the lumps travel
```

1.5% of a frame. This needs **no WebGL, no canvas, and no new dependency**, and
it stays a pure deterministic function of its inputs — so `src/render` keeps its
purity rule, the SVG stays byte-stable, and snapshots, thumbnails, the ZIP
export and the SSR runtime all keep working unchanged.

**The goldens stay frozen, and that is the proof of correctness.** A radius
field that reduces to a plain ellipsoid when `shape === "round"` produces
exactly today's silhouette, because `apparent()` is already the analytic
solution for that case. This is the same safety argument P2 used for
`surfacePath` vs `blobPath`: if `resting.svg`, `ambient.svg` or `live-3000.svg`
move, the wire-up is wrong. Stop and look.

### Defects found while probing 360°

These are real and worth fixing regardless of which direction we take.
**Three of the four are fixed** — see the commits following v0.1.0. What each
one needed is recorded under it.

**1. The light walks off the character past ~140°.** `shadingFor` positions the
gradient with `0.5 - 0.15 - (head.y / 90) * 0.22` — linear and unbounded, where
it should be trigonometric. Measured sweep:

```
yaw=  0  shadingCx= 0.350      yaw=150  shadingCx=-0.017
yaw= 90  shadingCx= 0.130      yaw=180  shadingCx=-0.090
yaw=120  shadingCx= 0.057      yaw=270  shadingCx=-0.310
```

Past 150° the lit crown is outside the shape entirely, so the body flattens into
a dead silhouette at exactly the angles a 360° turn has to survive.

**Fixed.** The travel is a rotation, not a ramp: a sine, bounded to ±0.14 and
closing the loop at 360°, with its amplitude picked to match the old slope at
zero. A small turn therefore looks exactly as it did, cx at rest is still 0.35
to the last bit, and the goldens did not move.

**2. Extras do not participate in the projection at all.** `buildScene` gives
each extra `translate(x y) rotate(deg)` — no foreshortening, no depth, and their
z-sort is the static authored value rather than their rotated depth. On a
turning head they slide across the body like decals instead of orbiting it. The
petal-ringed character in the parity inventory is the case that breaks hardest.

**3. There is no back of the head.** At 180° the eyes correctly reach opacity
0, which leaves a featureless blob — and, per defect 1, a badly lit one.

**4. There is no contact shadow.** The scene draws body, extras and eyes and
nothing else. A ground shadow is the cheapest and strongest volume cue there is,
and its absence is a large part of why the character reads as floating art
rather than a solid sitting in a space.

**Fixed, stage-only** — which answers open question 3 below. An avatar
composited into someone else's page has no ground to cast onto, so a baked
shadow would follow it into every PNG, every ZIP, the runtime and all 24 mood
thumbnails. `Scene.shadow` is opt-in the way `Scene.guide` is; the studio stage
is the only caller that asks. The shadow takes the body's resting position and
never the ambient bob, so a breathing character rises off a shadow that stays
put, and its width follows the silhouette's own foreshortening.

### Options

**A — Real WebGL (three.js).** Genuine meshes and lighting. It also discards
ADR-2, every golden, the byte-stable SVG contract, the SSR-safe runtime,
snapshot/ZIP export and all 24 mood thumbnails, and adds roughly 600 KB. It
contradicts nearly every architectural decision this repo has made. Not
recommended as a first move.

**B — 3D radius field with an analytic silhouette in SVG.** The core of the
idea, measured above at 1.5% of a frame. Keeps purity, determinism, goldens and
every downstream consumer. Makes the silhouette genuinely turn.

**C — Lighting and grounding.** Rim/fresnel term, a specular that tracks the
light, and a contact shadow. Independent of B, cheap, and probably the largest
perceived-realism gain per line of code.

**D — 360° correctness.** Defects 1–3 above.

_Where this stands:_ D is done and the cheap half of C (the contact shadow) with
it; the rim/fresnel and tracking specular are not. B is untouched and still
wants the conversation below.

The honest sequencing is **C → D → B**: C and D are small, self-contained, and
would make the current model noticeably more solid on their own, which also
gives us a fair baseline to judge whether B's silhouette work is worth its
complexity. B is the real answer to "it should be a 3D object," but it is the
one that wants a design conversation first — chiefly how a 3D shape family gets
authored and stored, since `Surface` currently persists a 2D vocabulary.

### Open questions for that conversation

1. Does the 3D shape stay _derived_ from today's `lobes`/`wobble`/`seed` (no
   schema change, every existing character gains volume for free), or does it
   become an authored 3D field (richer, but a v3 migration and new UI)?
2. Should 360° show a distinct back of the head, or is a featureless turned-away
   solid the right read for these characters?
3. ~~How far does the "Blender" cue go — is a contact shadow in scope for the
   exported snapshot and the runtime, or studio-stage only?~~ **Answered:
   studio-stage only.** If a shadow ever belongs in an export it wants to be an
   authored property of the character, not a render-time default.

### Outcome — what the build measured

Option B is in. `src/domain/geometry/solid.ts` revolves each family's flat
outline about the vertical axis, rotates the solid, projects it and reads the
silhouette back as a radius per screen angle. Five things this document got
wrong or left open, and what the build found:

**Option A was not just architecturally wrong, it was not even a match.** A
black-box pass established that their renderer is SVG (their character answers
`elementFromPoint` as a `path`). Nothing about their result needed WebGL.

**The lumps could not have travelled without changing the 2D outline first.**
A surface of revolution about the vertical axis has, under pure yaw, a
silhouette that is _exactly_ its flat outline scaled in x. So lifting `organic`
to a solid was only worth anything because its wobble moved from the
superellipse sampling parameter to the polar angle: keyed on the parameter, the
modulation is constant around every revolved ring, the solid is a surface of
revolution, and the lumps provably cannot move however lumpy the field is. That
was the single load-bearing change, and it is what the travel test guards.

**This document's "organic and drop" is wrong about drop.** Drop is a solid of
revolution, so it gains volume from pitch and from combined poses, never from
yaw alone. Only `organic` gains anything under a yaw-only turn.

**Sampling by parameter leaves real holes.** Families sample themselves by
their own parameter, which clusters points where it moves slowly — a cone puts
almost everything on its flat base and carries no vertex at all between 5° and
25°. Revolving only ever sweeps a point toward the vertical, so those angles
had nothing to fill them and the silhouette came out 16% too wide at the
shoulders. Profiles are now resampled evenly along the perimeter first.

**Cost is higher than the 0.247 ms prototyped here, and it did not matter.**
192 profile samples × 48 azimuths → 96 knots measures about a tenth of a frame.
A last-call memo keyed on the eleven inputs the outline actually depends on
makes that free unless the head is moving, which is the only time it is spent.

Resolution of the open questions:

1. **Derived, not authored.** The 3D shape comes from today's `lobes`, `wobble`
   and `seed`, so every saved character gained volume without a migration. The
   only schema change was `Surface.depth` (v3), which was parity gap 8 and is
   about how deep a solid is, not what shape it is.
2. **No back of the head.** Half a turn shows a full-width, featureless, lit
   solid — which is what turning a solid around actually shows, and what the
   reference does. The rim light is what keeps it from reading as a dead blob,
   which was the real complaint behind defect 3.
3. Already answered: the contact shadow is studio-stage only.

Defect 3 is therefore closed as answered rather than fixed, and all four
defects this document raised are now resolved.
