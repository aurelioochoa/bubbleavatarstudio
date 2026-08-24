# 05 · UI Design — Studio

> Original visual design for helpbubble. Functional coverage per FR-9; look &
> feel is ours (helpbubble brand: warm indigo, rounded, airy).

> **This is a target, not a description.** Written before the UI existed, it
> still describes where the studio is going. Items marked **[built]** exist
> today; **[target]** ones do not yet, and are tracked as roadmap P4. Measured
> sizes below are the target — the shell currently ships a 176px rail and a
> 288px inspector. Do not read an unmarked sentence as a claim about what runs.

## 1. Layout

```
┌─────┬───────────────────────────────┬───────────────────────────┐
│ rail│  STAGE (canvas)               │  INSPECTOR                │
│     │                               │  ┌─────────────────────┐  │
│ [B] │        (bubble render)        │  │ Look|Moods|Loops|Share │
│ [B] │                               │  └─────────────────────┘  │
│ [B] │  ┌─────────────────────────┐  │  ─────────────────────────│
│ [+] │  │ ▶ ⏸ ⏹   ● playing: idle │  │  (panel content,          │
│     │  └─────────────────────────┘  │   scrollable)             │
└─────┴───────────────────────────────┴───────────────────────────┘
```

- **Rail (56px):** vertical bubble thumbnails (live mini-renders), active
  highlighted, `+` at bottom. Context menu (right-click / kebab): rename,
  duplicate, move up/down, delete (confirm).
  **[built]** the list, active highlight, add, duplicate, delete-with-confirm.
  **[target]** thumbnails, rename, move up/down, the context menu itself.
- **Stage:** soft radial gradient backdrop (indigo-950→black), bubble centered.
  Overlays: top-left status pill (`● playing idle` / `paused`), top-right gizmo
  button, bottom transport dock (play/pause/stop + loop selector dropdown).
  **Drag turns the head** (FR-8.1, amended — see `docs/02` and the session-2
  recon notes); position is set numerically in the Look panel. Esc restores the
  pre-drag rotation.
  **[built]** drag-to-turn with Esc restore, and the projected surface the face
  is anchored to. **[target]** the status pill, the gizmo and its rotation pad,
  the bottom transport dock, and the guide overlay (FR-8.4) — playback controls
  currently live in the Loops panel instead of on the stage.
- **Inspector (360px):** tab strip + scrollable panel.

## 2. Panels

### Look (body & resting face)

**[built]** every section below, and an Ambient card for idle motion (FR-7.1),
though the cards do not collapse yet. **[target]** collapsing, and
drag-to-scrub on the numeric labels (FR-9.5).

Sections as collapsible cards:

1. **Surface** — width/height/roundness/perspective numeric steppers (unit
   suffixes u/×), rotation slider ±180°.
2. **Colors** — body / accent / eyes swatch pickers (preset palette + hex input).
3. **Extras** — list of primitives with kind icon, up/down z buttons, edit
   expander (same numeric controls), remove; "Add primitive" button.
4. **Eyes** — linked toggle (chain icon); shared: spacing, width, height,
   roundness; per-side (collapses to one when linked): offsetX/Y, rotation,
   scaleX/Y.

### Moods

**[built]** the card grid with true mini-renders, click-to-preview on the stage,
the delta sliders, the colour override and cancelable edits. **[target]** the
modal editor, per-eye editing with mirror, rename/duplicate/reorder, and the
kebab menu.

- Grid of mood cards (mini stage render + name), `+` card. Click = preview on
  stage (FR-4.4); double-click = open **Mood editor** (modal over inspector):
  per-eye delta sliders grouped Rotation (X/Y/Z ±30°), Scale (X/Y 0.3–2),
  Offset (±40u), with "mirror left→right" action; color override section
  (body/eyes optional swatches, "clear override"); Save / Cancel (cancel
  restores pre-edit stage, FR-4.4). Kebab on cards: duplicate, delete (blocked
  with toast if referenced — FR-5.6), reorder via drag.

### Loops

**[built]** the loop list, step list with hold and transition per step, add and
remove step, playback mode, springSpeed, and play/pause/stop. **[target]**
grouping chips, drag-reorder and the ‹ › fallback, the blink card, the loop
summary (FR-5.8), and rename/duplicate.

- Left: loop list grouped by `group` label (Life / Reactions custom chips);
  `+` new loop. Selecting a loop loads the **timeline**.
- Timeline (bottom of panel, full width): horizontal step chips — mood
  thumbnail, name, holdMs stepper, transition select — drag to reorder
  (buttons ‹ › as accessible fallback); `+` opens mood picker; ✕ removes step.
- Loop settings row: mode segmented control (Loop / Once / Ping-pong),
  springSpeed slider 0.1–3, blink card (toggle + min/max interval + duration).
- Transport "Play" always plays the selected loop.

### Share (export)

**[built]** resolution choice, transparent/solid/linear backgrounds, SVG and
PNG download, the character JSON, the ZIP, project export and import behind a
confirmation. **[target]** the radial background and configurable stops, the
live preview, the loop checklist (FR-10.3), and the import summary counts.
The language control ships in the header rather than this panel.

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

- Every numeric input: label + unit suffix, ↑↓ steppers, arrow-key support.
- Focus rings visible on dark stage; all actions keyboard-reachable; drag
  operations have button fallbacks.
- Empty states: no bubbles → stage shows "Crea tu primera bubble" + `+` hint.
- Destructive actions (delete bubble/loop/mood, import replace) always confirm.
- Color contrast ≥ 4.5:1 for text; status pill uses dot + text (not color only).

## 4. Visual language

- Font: system stack (`Inter` fallback); radius 12–16px cards; 8px spacing grid.
- Palette: bg `#0b0d16` stage / `#121527` panels; primary `#6c7bff`; accent
  `#8be9ff`; text `#e8eaf6`; danger `#ff5d73`. (Tailwind theme tokens.)
- Motion: panel transitions ≤ 160ms ease-out; stage animation owned by engine.
