# 02 · Functional Specification

> Every requirement has an ID used by tests (TDD: a requirement is not "done"
> until a test that encodes it exists and passes). Derived from
> `docs/research/*` under the clean-room protocol. "Bubble" = character;
> "mood" = expression preset; "loop" = animation; terms per `upstream-facts.md` §2.

## FR-1 Characters (Bubbles)

- **FR-1.1** Create a bubble from a default template; it appears selected in the list.
- **FR-1.2** Rename inline; name is required, non-empty, trimmed.
- **FR-1.3** Duplicate a bubble: deep copy with fresh IDs, name suffixed " copy".
- **FR-1.4** Reorder bubbles (list position persists).
- **FR-1.5** Delete a bubble with confirmation; if it was active, selection moves
  to the first remaining bubble (or none if empty).
- **FR-1.6** Exactly zero or one bubble is _active_; all editor tabs operate on it.

## FR-2 Body

- **FR-2.1** Body = one primary **surface** + zero or more **extra primitives**.
- **FR-2.2** Surface params: width, height, **depth**, roundness (0–1), position
  (x,y), rotation (deg), perspective (0–1). All editable via numeric inputs.
  Depth is the solid's front-to-back size and is **authored, not derived** — a
  character can be a flat disc or a deep barrel. Before v3 the projection
  computed its own depth radius as `min(width, height) * 0.85`, so every solid
  was as thick as its narrow axis allowed and nothing could be shaped in z.
- **FR-2.3** Extra primitive kinds: `blob`, `capsule`, `circle`, `ring`; each has
  its own size, roundness, position, rotation, z-order, and color role
  (`body` | `accent` | custom hex).
- **FR-2.4** Extras can be added, edited, reordered (z), and removed.
- **FR-2.5** The surface carries the **face frame**: eye anchors and mood deltas
  are expressed in it (see FR-4.6).
- **FR-2.6** The surface has a **shape family**, chosen per bubble: `round`
  (superellipse from rectangle to ellipse via roundness), `organic` (an outline
  whose radius varies around the perimeter, giving lumpy and lopsided forms),
  `drop` (a teardrop taper), `capsule` and `cylinder` (straight sides with a
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

## FR-3 Eyes

- **FR-3.1** Resting eye shape: width, height, roundness (capsule-like default).
- **FR-3.2** Placement per side: offsetX/offsetY (u), rotation (deg), scale X/Y;
  plus a shared `spacing` between eye centers.
- **FR-3.3** `linked` mode: editing any shape/placement property on one side
  mirrors it to the other (offsetX and rotation mirror sign). Unlinking keeps
  current values and allows divergence; re-linking adopts the left side.
- **FR-3.4** Eye color editable (resting color).

## FR-4 Moods

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

## FR-5 Loops (animations)

- **FR-5.1** A loop = ordered steps; each step references a mood **by ID**, plus
  `holdMs` and `transition` (`linear` | `ease` | `spring` | `step`).
- **FR-5.2** Loop CRUD: create, rename, duplicate, delete; steps add (from mood
  list), remove, reorder; reordering never changes which mood a step references.
- **FR-5.3** Playback modes: `loop` (repeat), `once` (stop at end), `pingpong`
  (forward then reverse).
- **FR-5.4** `springSpeed` (0.1–3) scales transition durations globally.
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

## FR-6 Playback

- **FR-6.1** Starting a loop enters _playback_: playback exclusively owns the
  live state; manual canvas manipulation pauses it.
- **FR-6.2** Transport: play (selected loop), pause/resume, stop (returns to
  resting face). Status pill shows current loop + step.
- **FR-6.3** Timing is computed from absolute timestamps (frame-rate independent):
  advancing 1s of wall time yields identical state regardless of frame count.
- **FR-6.4** Switching the active bubble keeps the current loop and its position
  when the target bubble can play it (same kit lineage), otherwise stops cleanly.
- **FR-6.5** Ambient motion (FR-8) composes with playback output.

## FR-7 Ambient idle motion

- **FR-7.1** Config: enabled, body amplitude/period, eye amplitude/period.
- **FR-7.2** Output is a smooth sinusoidal offset applied to surface position and
  eye offsets, zero at t=0, deterministic given (t, config) — no per-frame drift.

## FR-8 Direct manipulation (stage)

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

## FR-9 Studio shell & persistence

- **FR-9.1** Layout: bubbles rail (left), stage (center), inspector (right) with
  tabs **Look / Moods / Loops / Share**; transport dock on the stage.
- **FR-9.2** Autosave: every committed document mutation persists to local
  storage synchronously (debounce ≤ 300 ms for burst edits); no save button.
- **FR-9.3** Project backup: export full document as `.bubble-studio.json`;
  import replaces the document **after explicit confirmation**, and is rejected
  with a readable error if invalid/unknown version.
- **FR-9.4** Locale switch es/en; default es; choice persists.
- **FR-9.5** Numeric fields accept typing, steppers **and drag-to-scrub** on the
  label, so values can be dialled in without keyboard round-trips.

## FR-10 Export & runtime

- **FR-10.1** Snapshot: current stage as SVG string and PNG raster at chosen
  resolution (512/1024/2048) with background: transparent | solid color |
  linear gradient | radial gradient (two stops, configurable).
- **FR-10.2** Character file: one bubble + its effective kit (own kit if present,
  else starter kit) → `*.bubble-avatar.json` (schema in `03-data-model.md`).
- **FR-10.3** Loop picker for export: choose which loops are embedded (default all).
- **FR-10.4** Runtime: `<BubbleAvatar definition={...} loop="name" autoplay size={n}/>`
  React component; pure function of props; no storage/network access; renders
  identical SVG to the studio stage for the same definition + state.
- **FR-10.5** Export package (ZIP): definition JSON + README + minimal usage
  example. (Runtime ships as a package, not inlined per export.)

## FR-11 Non-functional

- **FR-11.1** All domain logic (geometry, document ops, playback) is pure
  TypeScript with **zero React/DOM imports**.
- **FR-11.2** Playback/ambient animation writes go straight to DOM via refs —
  no React re-render per frame (React renders only on durable state changes).
- **FR-11.3** Validation gate: `pnpm check` = engine freshness (n/a v1), format,
  typecheck strict, full tests, production build.
