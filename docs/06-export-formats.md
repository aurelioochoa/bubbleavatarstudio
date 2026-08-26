# 06 · Export Formats & Runtime

## 1. Snapshot (FR-10.1)

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

## 2. Character definition `*.bubble-avatar.json`

Shape per `03-data-model.md` §6. Rules:

- Kit is **inlined**: if the bubble owns a kit, use it; else inline a deep copy
  of the starter kit (a portable file must be self-contained).
- `loops` array lists exported loop IDs; non-listed loops are pruned; pruning
  never orphans moods (moods referenced by remaining steps are always kept;
  unreferenced moods are pruned to keep files lean).
- Output is validated (schema + referential integrity) **before** download;
  export of an invalid document is impossible by construction.

## 3. Runtime `BubbleAvatar` (FR-10.4)

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

## 4. Export package (ZIP)

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

## 5. Project backup `*.bubble-studio.json` (FR-9.3)

Full document per `03-data-model.md` §1. Import flow: parse → migrate chain →
validate → confirmation dialog (counts) → replace in-memory + storage. Any
failure aborts with a readable, localized error and leaves current data intact.
