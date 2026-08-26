# 05 · UI Design — Studio

> Original visual design for helpbubble. Functional coverage per FR-9; look &
> feel is ours (helpbubble brand: warm indigo, rounded, airy).

> **This is a target, not a description.** Written before the UI existed, it
> still describes where the studio is going. Items marked **[built]** exist
> today; **[target]** ones do not yet, and are tracked as roadmap P4. Do not
> read an unmarked sentence as a claim about what runs.
>
> The rail and inspector now ship at the documented sizes (56px / 360px,
> `w-14` / `w-90`); an earlier note here recorded them as 176px and 288px,
> which the P4 UI pass closed.
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

## 1. Layout

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

- **Rail (56px):** vertical bubble thumbnails (live mini-renders), active
  highlighted, `+` at bottom. Context menu (right-click / kebab): rename,
  duplicate, move up/down, delete (confirm).
  **[built]** all of the above: the list with live mini-render thumbnails,
  active highlight, add, and a per-bubble context menu (kebab or right-click)
  carrying rename, duplicate, move up/down and delete-with-confirm. The menu
  closes on Escape or an outside click.
- **Stage:** soft radial gradient backdrop (indigo-950→black), bubble centered.
  Overlays: top-left status pill (`● playing idle` / `paused`), top-right gizmo
  button. The transport was a dock floating here until the track redesign; it
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

## 2. Panels

### Look (body & resting face)

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
   width/height/depth/roundness/perspective numeric steppers (unit suffixes u/×),
   rotation slider ±180°.
2. **Colors** — body / accent / eyes swatch pickers (preset palette + hex input).
3. **Extras** — list of primitives with kind icon, up/down z buttons, edit
   expander (same numeric controls, including a depth of its own since each one
   is a solid), remove; "Add primitive" button. The card title carries the count
   against the cap (`0/16`, FR-2.3) and the add control disables at sixteen.
4. **Eyes** — linked toggle (chain icon); shared: spacing, width, height,
   roundness; per-side (collapses to one when linked): offsetX/Y, rotation,
   scaleX/Y.

### Moods

**[built]** all of the above, and the track redesign reshaped it twice.

The grid is three columns of true mini-renders, filterable by name (FR-4.9)
with a count of what is on screen rather than of the library, and each card
badged with how many loops play it (FR-4.8). Click previews on the stage
(FR-4.4); double-click opens the editor.

**Card actions live on a bar at the foot of the column, not on a kebab.** One
of them has to say *why* it is unavailable: every one of the 24 starter moods
is in at least one starter loop, so deleting any of them used to be offered,
confirmed, and only then refused by the reducer with E_REF. The bar disables
the control and names the reason (FR-4.8); FR-5.6 is unchanged and still the
backstop for every path that does not go through this panel. The bar carries
the mood's thumbnail, its name, how many loops use it, ↑/↓ — which were the
kebab's keyboard path for reordering and are still the only one — edit,
duplicate and delete-with-confirm. Cards also reorder by dragging (FR-4.2).

**The editor is two XY pads, not fourteen sliders.** A per-eye offset is two
numbers that mean one place, so it is dragged as one place, on a pad per eye
that states the ±40u it spans; scale and rotation are one compact row each.
The pad is a pointer affordance only — each axis also has a real range input,
visually hidden, because a div that swallows arrow keys is not a control. A
`Vinculados / Independientes` segmented control makes linking an editing
mode: while it is on, every edit mirrors onto the other side as it is made,
and turning it on brings the two into step at once rather than waiting for
the next edit to touch one. Independent is the default, because two eyes that
differ are most of what a mood is. The one-shot mirror action remains for the
independent case, applying FR-3.3's handedness rule — roll and yaw flip sign,
pitch and the scales do not. Rename, the colour override covering body and
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

### Loops

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

### Share (export)

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

## 3. Interaction states & a11y

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

## 4. Visual language

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
