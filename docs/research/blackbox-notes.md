# Black-box Observation Notes — Live App Session

> Method: headless Chromium driven as a plain user against `avatars.bible-strong.app`
> (2026-08). Screenshots archived at `/tmp/opencode/blackbox/`. No source code read.
> All wording below is original.

## Global layout

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

## Boot behavior

- On load, an animation is already running ("proud") without user action;
  status pill reflects it. Avatar canvas shows a big rounded blob character
  (blue ellipse body, two dark capsule eyes).

## Avatars panel (character name tab / initial state)

- Heading "Avatars"; grid of character cards: SVG thumbnail + name below
  (observed 10: Strobi, Freddy, Citrus, Nova, Grok bot, Sunee, Kirby, Cloudee,
  Cubee, Onee) + dashed "+" add-card; count badge top-right; hint
  "Double-click to edit". Selected card outlined.
- Card thumbnails are live mini renders of each character.

## Pose tab (inspector)

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

## Expressions tab

Heading "Expressions", count "27 PRESETS", hint "Double-click to edit".
Grid of numbered mood thumbnails (00–26); most inherit body color, two showed
temporary color overrides (one red-bodied, one pale-blue-bodied). Dashed "+"
card to add. Clicking a preset applies it to the stage immediately (implied by
selection outline following clicks).

Pose-tab dump also revealed expression-level sliders: per-eye Rotation X/Y/Z,
Horizontal/Vertical offsets, Spacing, Perspective — i.e., editing a mood means
adjusting those deltas relative to resting face.

## Animations tab

Headings "Expressions" (source list) + "Motion". Count "23 ANIMATIONS".
Grouped catalog:

- **Life cycle:** sleeping, waking, idle, listening, thinking, searching, working
- **Reactions:** excited, bored, suspicious, angry, drowsy, happy, curious,
  confused, surprised, proud, shy, sad, laughing, scared, playful, celebrate
  Timeline strip of numbered step cells 00–25 (drag/reorder implied), plus
  controls: "Spring speed↔" (transition tuning), "Blink" toggle, "Random
  expression" button. Playback runs in stage with PLAYING pill.

## Export tab

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

## Cross-cutting behaviors noted

- Selection model: exactly one character active; all tabs operate on it.
- Playback keeps running across tab switches (pill persists).
- Canvas manipulation: gizmo implies orbit-style head rotation; direct drag
  supported per README (not exercised headlessly).
- Autosave: no explicit save button anywhere → persistence is automatic.
