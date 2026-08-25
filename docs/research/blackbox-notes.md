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

## Session 2 — 2026-08-23 (behavior-only)

> Method: the live app driven as an ordinary user in a normal Chrome window.
> Only rendered output was consulted — screenshots and on-screen text. No source,
> bundle, network payload or exported file was opened. Screenshots kept out of the
> repo. Purpose: settle behavioral questions before finishing our own studio; our
> visual design remains our own per `05-ui-design.md`.

### Transport has three states, not two

The status pill reads PLAYING, PAUSED or STOPPED, and the dock carries a
play/pause toggle plus a separate square stop control. Stopping does three things
at once: the pill flips to STOPPED, the step strip snaps back to its first cell,
and the character returns to a neutral face. Pausing simply freezes where it is.
Our transport currently models only a play/pause boolean.

### Dragging the canvas rotates the head — it does not move the character

Dragging across the stage left the silhouette centred where it was and instead
turned the head: the eyes travelled across the face, the body foreshortened, and
the small three-ring orientation widget in the stage corner followed the drag. A
reset control sits beside that widget. Nothing observed moved the character's
position by dragging, which contradicts our FR-8.1 as written.

### Head rotation composes with, and survives, playback

A rotation set by dragging persisted while an animation played, across a tab
change, and across a character switch — it behaves as live view state layered on
top of the animation rather than something playback overwrites.

### Applying an expression takes ownership of the live state

Clicking an expression card while an animation was running flipped the pill from
PLAYING to PAUSED. Manual expression selection pauses playback, the same
exclusivity rule our FR-6.1 states.

### Playback continues across character switches

Selecting a different character mid-playback kept the same animation running by
name, and the dock's step thumbnails re-rendered in the new character's colours.
The characters share one preset library, so the animation remains applicable.

### Blink settings live inside the per-animation editor

Opening an animation's editor (double-click) replaces the panel with a dedicated
editing view: name and description, a playback-mode dropdown, a timeline of step
cells that reorder by dragging with a duration field for the selected step, and a
blink card — an enable switch, a first-blink delay, minimum and maximum interval,
and blink duration, all in milliseconds. Its footer offers delete, duplicate and
save. Leaving the editor resumed playback on its own. Note our `BlinkConfig` has
no first-blink delay; FR-5.5 does not require one.

### Cards everywhere are live mini-renders

Character cards, expression presets and animation entries all draw the actual
character rather than an icon, and expression/animation catalogues are grouped and
counted ("27 presets", "23 animations", life-cycle versus reactions).

## Session 3 — 2026-08-23 (feature inventory for parity)

> Same method and limits as session 2: rendered output only, described in our
> own words. Purpose: decide what "feature parity" has to cover.

### Silhouettes are organic, not just superellipses

The character gallery spans shapes our geometry cannot currently express. Several
are irregular and lumpy — a wide slumped form, a cloud of overlapping lobes, a
teardrop, a blob with a bite taken out of one side — while others are a plain
circle or a rounded square, which our superellipse already covers. One character
is a body ringed by radiating petals, i.e. a surface plus a set of extra
primitives arranged around it, which our extras model does cover.

Conclusion: parity needs a shape vocabulary beyond one superellipse — an organic
outline whose radius varies around the perimeter — plus the extras we have.

### Pose controls

Body: colour, and head rotation X/Y/Z in degrees. Eyes: colour, per-eye width,
height and a proportional-size control, per-eye horizontal and vertical position,
a shared spacing, and per-eye tilt. Projection: a perspective factor described as
simulated face depth, plus a toggle that draws the projection surface as a guide.

Two notes that matter for us. Eye position is described as shared coordinates
projected onto the selected shape — the same anchor-on-a-surface model, and
confirmation that the shape is a selectable property of the character. And the
numeric labels can be dragged sideways to scrub their value, the way a design
tool does, rather than only typed into.

### The animation panel summarises what will happen

Alongside playback mode it shows how many expressions the animation steps
through with each step's duration, the delay before the first blink, the
randomised interval range between blinks, and how long a blink takes. Ours
exposes the same underlying values as raw inputs but never summarises them.

### Parity gaps, as a list

1. An organic outline family; a per-character shape choice.
2. A large expression library (theirs shows 27) rather than our four.
3. An animation catalogue grouped into life-cycle and reaction sets (theirs
   shows 23) rather than our two.
4. A projection guide overlay.
5. Drag-to-scrub numeric labels.
6. A summary of an animation's timing and blink behaviour.

## Session 2026-08-25 — body construction and a full-range turn

> Method unchanged: the deployed app driven as a plain user, screenshots only.
> No source code read, nothing saved back to their app. Wording is ours.

### Half a turn shows the back of the head

Setting Rotation Y to 180 on their stage hides both eyes and leaves the
silhouette at its **full width** — the body is not foreshortened at all, it is
simply turned around. That is the reading a real rotation gives (a half turn
maps the silhouette onto itself), and it is what our projection now produces;
before this session ours collapsed the face frame to a fifth of its size at the
same angle. Their gizmo rings flip with the pose, so the widget doubles as the
readout for which way round the head is.

### Body construction: a primary shape plus assembled primitives

Double-clicking a character opens a panel headed *body construction*, described
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

### Editing shows a silhouette highlight

While a body is being edited the stage draws a bright outline tight around the
character's own outline (not an ellipse), which reads as "this is the shape you
are editing". Separate from the projection guide, which draws the surface.

### Parity gaps, updated

7. Six primary shape families rather than three.
8. An authored depth for the body, rather than a derived one.
9. Assembled primitives as part of body construction, capped at 16.
10. A silhouette highlight while a body is being edited.
