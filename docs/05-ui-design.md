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
  **[built]** all of the above: the list with live mini-render thumbnails,
  active highlight, add, and a per-bubble context menu (kebab or right-click)
  carrying rename, duplicate, move up/down and delete-with-confirm. The menu
  closes on Escape or an outside click.
- **Stage:** soft radial gradient backdrop (indigo-950→black), bubble centered.
  Overlays: top-left status pill (`● playing idle` / `paused`), top-right gizmo
  button, bottom transport dock (play/pause/stop + loop selector dropdown).
  **Drag turns the head** (FR-8.1, amended — see `docs/02` and the session-2
  recon notes); position is set numerically in the Look panel. Esc restores the
  pre-drag rotation.
  **[built]** drag-to-turn with Esc restore, the projected surface the face is
  anchored to, the radial backdrop, the top-left status pill (dot + words, so
  state never rests on colour alone) and the bottom transport dock with its
  loop selector. The dock owns playback for the whole app and is reachable from
  every tab; it hides itself when the kit has no loops (FR-5.2).
  **[target]** the gizmo and its rotation pad, and the guide overlay (FR-8.4).
- **Inspector (360px):** tab strip + scrollable panel.

## 2. Panels

### Look (body & resting face)

**[built]** every section below, the shape-family control, and an Ambient card
for idle motion (FR-7.1). The cards collapse and reopen, remembering nothing
across a reload by design. **[target]** drag-to-scrub on the numeric labels
(FR-9.5), and the projection guide toggle that belongs with the Surface card
(FR-8.4).

Sections as collapsible cards:

1. **Surface** — a segmented shape family (round / organic / drop, FR-2.6);
   the organic parameters — lobes, wobble, seed (FR-2.7) — appear only while
   organic is the family, since they do not bite on the others;
   width/height/roundness/perspective numeric steppers (unit suffixes u/×),
   rotation slider ±180°.
2. **Colors** — body / accent / eyes swatch pickers (preset palette + hex input).
3. **Extras** — list of primitives with kind icon, up/down z buttons, edit
   expander (same numeric controls), remove; "Add primitive" button.
4. **Eyes** — linked toggle (chain icon); shared: spacing, width, height,
   roundness; per-side (collapses to one when linked): offsetX/Y, rotation,
   scaleX/Y.

### Moods

**[built]** the card grid with true mini-renders, click-to-preview on the stage,
the delta sliders (each with a translated label, its own range and a unit), the
colour override with a clear action, duplicate, and cancelable edits.
**[target]** the modal editor, per-eye editing with mirror, rename/reorder, and
the kebab menu.

- Grid of mood cards (mini stage render + name), `+` card. Click = preview on
  stage (FR-4.4); double-click = open **Mood editor** (modal over inspector):
  per-eye delta sliders grouped Rotation (X/Y/Z ±30°), Scale (X/Y 0.3–2),
  Offset (±40u), with "mirror left→right" action; color override section
  (body/eyes optional swatches, "clear override"); Save / Cancel (cancel
  restores pre-edit stage, FR-4.4). Kebab on cards: duplicate, delete (blocked
  with toast if referenced — FR-5.6), reorder via drag.

### Loops

**[built]** the loop list, step list with hold and transition per step, add and
remove step, the accessible ↑ ↓ reorder fallback, playback mode as a segmented
control, springSpeed, and loop duplicate. Playback itself moved to the stage
dock, so this panel no longer carries transport buttons. **[target]** grouping
chips, drag-reorder itself, the blink card, the loop summary (FR-5.8), and loop
rename.

- Left: loop list grouped by `group` label (Life / Reactions custom chips);
  `+` new loop. Selecting a loop loads the **timeline**.
- Timeline (bottom of panel, full width): horizontal step chips — mood
  thumbnail, name, holdMs stepper, transition select — drag to reorder
  (buttons ‹ › as accessible fallback); `+` opens mood picker; ✕ removes step.
- Loop settings row: mode segmented control (Loop / Once / Ping-pong),
  springSpeed slider 0.1–3, blink card (toggle + min/max interval + duration).
- Transport "Play" always plays the selected loop. It lives on the stage dock
  (§1), which shares its loop selection with this panel.

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

- **[built]** Every numeric input: label + unit suffix, ↑↓ steppers, arrow-key
  support (`NumberField` in `panels/look/fields.tsx`).
- **[built]** Focus rings visible on dark stage — a single `:focus-visible`
  rule in `styles.css` paints the accent on every surface. Reorder actions have
  button fallbacks (rail move up/down, step ↑ ↓).
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

- Motion: panel transitions are 150ms ease-out, inside the ≤ 160ms budget;
  stage animation is owned by the engine. A `prefers-reduced-motion` block
  collapses every transition to ~0ms.
