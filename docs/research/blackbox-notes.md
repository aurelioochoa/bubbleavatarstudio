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

### Editing shows a silhouette highlight

While a body is being edited the stage draws a bright outline tight around the
character's own outline (not an ellipse), which reads as "this is the shape you
are editing". Separate from the projection guide, which draws the surface.

### Parity gaps, updated

7. Six primary shape families rather than three.
8. An authored depth for the body, rather than a derived one.
9. ~~Assembled primitives as part of body construction, capped at 16.~~
   **Closed.** Extras carry their own depth and foreshorten by their own solid
   rather than by the surface beneath them, and the count is capped at 16 and
   shown against the cap.
10. A silhouette highlight while a body is being edited.

## Session 2026-08-25 (b) — how their 3D is actually made

Driven as a user again, screenshots only. One new method note: their character
answers `document.elementFromPoint` as a `path`, and the wireframe overlay is
vector too. **Their renderer is SVG, not WebGL.** That is a fact about
capability, and it settles a question our own exploration doc had left open on
architectural grounds — matching them never needed a 3D library.

### Their character has no shading at all

At rest their orange character is a single flat fill. No gradient, no specular,
no rim light, no contact shadow, no stroke. We had assumed the reverse and it
inverts the obvious plan: on lighting we were already ahead, and the gap was
entirely geometry and interaction.

### The silhouette genuinely turns

Dragged through roughly 50° of yaw, a character built from a body and three
lobes shows its lobes swing from the left side around to the back while the
crown grows new bumps. The outline reshapes; it does not squash. Our own
measurements said ours could not do this — the outline was computed once and
given a uniform scale.

### The body is a primary solid plus assembled 3D primitives

The wireframe shows a curved lat/long grid over a rounded-superellipsoid body,
with each lobe carrying its own silhouette. In the ordinary render they merge
into one continuous contour, because they share a fill and carry no stroke.

### Eyes are cut off by the body, not faded

At about 35° of yaw the far eye is a white sliver truncated flat along the
body's own contour. Ours faded out on an opacity ramp, which reads as a decal
ghosting rather than as something going round the side of a solid.

### A wireframe appears while the pointer is held on the character

A full sphere grid with the far-side lines visible through it, plus a bright
outline hugging the silhouette. It is up only for the duration of the press.
This is a large part of why the thing announces itself as a solid object, and
ours had nothing equivalent — one equator and one meridian, behind a toggle.

### Parity gaps, updated

11. Eyes clipped by the silhouette rather than faded at the rim.
12. A wireframe mesh raised for the duration of a pointer press, rather than
    only from a toggle.

## Session: how the drag itself is tuned (2026-08-25)

Driven as a user in a browser — clicks, drags and screenshots only, per
`docs/CLEANROOM.md` §2/§3. Nothing of theirs was fetched, viewed or read
beyond the rendered page a visitor sees.

Their pose panel reports the head rotation as three numbers, which makes the
drag measurable without any guesswork: drag a known number of pixels across the
stage, then read the number off their own UI. Character used was the plain
round one, whose symmetry keeps a yaw unambiguous.

### The rate is flat at a shade under 0.3° per pixel

| gesture           | yaw before | yaw after | change |
| ----------------- | ---------- | --------- | ------ |
| 100px right       | 148.7      | 177.7     | +29.0  |
| 200px left        | 177.7      | 119.7     | −58.0  |
| 100px down (pitch)| 2.3        | −25.8     | −28.1  |

Exactly double the travel gives exactly double the angle, so there is no
acceleration curve and no dead zone at the start of a press — 100px is 29° from
anywhere. Both axes move at the same rate.

### Which pointer axis drives which rotation, and with what sign

Horizontal travel drives the yaw and vertical travel the pitch, never crossed.
Dragging right raises the yaw, so the character turns toward the viewer's
right and follows the pointer. Dragging down lowers the pitch, so the character
looks downward — the pitch takes the vertical travel with the sign flipped,
which is what makes the face go the way the hand goes on a screen whose y runs
downward.

### A drag is not bounded at a quarter turn

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

### Parity gaps, updated

13. A drag reached only ±60 of yaw and pitch, where theirs reaches a full turn.
14. Our drag rate was 0.2° per pixel against their 0.29, and our pointer axes
    were crossed: horizontal travel drove the pitch, so dragging right tipped
    the character upward instead of turning it.
