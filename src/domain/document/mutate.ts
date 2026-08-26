// Immutable document mutations (FR-1..FR-5, docs/03 §5). Every operation
// returns a new document; kits fork copy-on-write on the first behavior edit.
import { newId, type Random } from "../ids";
import { createBubble, starterKit } from "./create";
import type {
  AmbientConfig,
  Body,
  Bubble,
  BubbleColors,
  ExtraPrimitive,
  Kit,
  Loop,
  LoopStep,
  Mood,
  RestingFace,
  StudioDocument,
} from "./types";

export type MutationResult =
  | { ok: true; doc: StudioDocument }
  | { ok: false; code: "E_NOT_FOUND" | "E_REF"; detail: string };

const fail = (
  code: "E_NOT_FOUND" | "E_REF",
  detail: string,
): MutationResult => ({
  ok: false,
  code,
  detail,
});

export interface MutationDeps {
  random?: Random;
}

interface Ctx {
  doc: StudioDocument;
  deps: MutationDeps;
}

function id(ctx: Ctx, prefix: string): string {
  return newId(prefix, ctx.deps.random);
}

function mapBubble(
  ctx: Ctx,
  bubbleId: string,
  fn: (b: Bubble) => Bubble,
): MutationResult {
  const index = ctx.doc.bubbles.findIndex((b) => b.id === bubbleId);
  if (index === -1) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const bubbles = [...ctx.doc.bubbles];
  bubbles[index] = fn(bubbles[index]);
  return { ok: true, doc: { ...ctx.doc, bubbles } };
}

/** Kit the bubble currently uses (own kit, or the starter kit it inherits). */
export function effectiveKit(bubble: Bubble, doc: StudioDocument): Kit {
  return bubble.ownKit ?? doc.starterKit;
}

/**
 * Copy-on-write: the first behavior edit on a bubble that still inherits the
 * starter kit atomically clones the whole kit into `ownKit` (docs/03 §5).
 */
function withOwnKit(
  ctx: Ctx,
  bubbleId: string,
  fn: (kit: Kit, fresh: boolean) => Kit,
): MutationResult {
  return mapBubble(ctx, bubbleId, (b) => {
    if (b.ownKit) return { ...b, ownKit: fn(b.ownKit, false) };
    return { ...b, ownKit: fn(structuredClone(ctx.doc.starterKit), true) };
  });
}

function mapMood(kit: Kit, moodId: string, fn: (m: Mood) => Mood): Kit {
  return { ...kit, moods: kit.moods.map((m) => (m.id === moodId ? fn(m) : m)) };
}

function mapLoop(kit: Kit, loopId: string, fn: (l: Loop) => Loop): Kit {
  return { ...kit, loops: kit.loops.map((l) => (l.id === loopId ? fn(l) : l)) };
}

// ── FR-1 bubble CRUD ────────────────────────────────────────────────────────

export function addBubble(
  doc: StudioDocument,
  name: string,
  deps?: MutationDeps,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const bubble = createBubble(name, id(ctx, "bbl"));
  return {
    ok: true,
    doc: {
      ...doc,
      bubbles: [...doc.bubbles, bubble],
      activeBubbleId: bubble.id,
    },
  };
}

export function renameBubble(
  doc: StudioDocument,
  bubbleId: string,
  name: string,
): MutationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return fail("E_NOT_FOUND", "empty name");
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    name: trimmed,
  }));
}

/** Reorders items by id; ids must be an exact permutation of current ids. */
function permute<T>(items: T[], ids: string[], keyOf: (t: T) => string) {
  if (ids.length !== items.length) return null;
  const byId = new Map(items.map((t) => [keyOf(t), t]));
  const out = ids.map((i) => byId.get(i));
  if (out.some((t) => t === undefined)) return null;
  return out as T[];
}

export function reorderBubbles(
  doc: StudioDocument,
  ids: string[],
): MutationResult {
  const bubbles = permute(doc.bubbles, ids, (b) => b.id);
  if (!bubbles) return fail("E_NOT_FOUND", "bubbles");
  return { ok: true, doc: { ...doc, bubbles } };
}

/** Duplicating a bubble copies its effective kit (own kit, or a clone of starter). */
export function duplicateBubble(
  doc: StudioDocument,
  bubbleId: string,
  deps?: MutationDeps,
): MutationResult {
  const source = doc.bubbles.find((b) => b.id === bubbleId);
  if (!source) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const copy: Bubble = {
    ...structuredClone(source),
    id: id(ctx, "bbl"),
    name: `${source.name} 2`,
    ownKit: structuredClone(effectiveKit(source, doc)),
  };
  return {
    ok: true,
    doc: { ...doc, bubbles: [...doc.bubbles, copy], activeBubbleId: copy.id },
  };
}

export function removeBubble(
  doc: StudioDocument,
  bubbleId: string,
): MutationResult {
  const bubbles = doc.bubbles.filter((b) => b.id !== bubbleId);
  if (bubbles.length === doc.bubbles.length)
    return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const activeBubbleId =
    doc.activeBubbleId === bubbleId
      ? (bubbles[0]?.id ?? null)
      : doc.activeBubbleId;
  return { ok: true, doc: { ...doc, bubbles, activeBubbleId } };
}

export function setActiveBubble(
  doc: StudioDocument,
  bubbleId: string,
): MutationResult {
  if (!doc.bubbles.some((b) => b.id === bubbleId)) {
    return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  }
  return { ok: true, doc: { ...doc, activeBubbleId: bubbleId } };
}

// ── FR-2 body, extras, colors ───────────────────────────────────────────────

export function updateSurface(
  doc: StudioDocument,
  bubbleId: string,
  patch: Partial<Body["surface"]>,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    body: { ...b.body, surface: { ...b.body.surface, ...patch } },
  }));
}

export function addExtra(
  doc: StudioDocument,
  bubbleId: string,
  extra: Omit<ExtraPrimitive, "id">,
  deps?: MutationDeps,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  return mapBubble(ctx, bubbleId, (b) => ({
    ...b,
    body: {
      ...b.body,
      extras: [...b.body.extras, { ...extra, id: id(ctx, "ext") }],
    },
  }));
}

export function updateExtra(
  doc: StudioDocument,
  bubbleId: string,
  extraId: string,
  patch: Partial<ExtraPrimitive>,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    body: {
      ...b.body,
      extras: b.body.extras.map((e) =>
        e.id === extraId ? { ...e, ...patch } : e,
      ),
    },
  }));
}

export function removeExtra(
  doc: StudioDocument,
  bubbleId: string,
  extraId: string,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    body: { ...b.body, extras: b.body.extras.filter((e) => e.id !== extraId) },
  }));
}

export function updateColors(
  doc: StudioDocument,
  bubbleId: string,
  patch: Partial<BubbleColors>,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    colors: { ...b.colors, ...patch },
  }));
}

// ── FR-3 eyes (linked editing mirrors across sides) ─────────────────────────

export function updateEyeShape(
  doc: StudioDocument,
  bubbleId: string,
  patch: Partial<RestingFace["eye"]>,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    restingFace: { ...b.restingFace, eye: { ...b.restingFace.eye, ...patch } },
  }));
}

/** Edit one side; when linked, the other side mirrors (offsetX/rotation negated). */
export function updateEyePlacement(
  doc: StudioDocument,
  bubbleId: string,
  side: "left" | "right",
  patch: Partial<RestingFace["left"]>,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => {
    const face = b.restingFace;
    const edited = { ...face[side], ...patch };
    const other: RestingFace["left"] = face.linked
      ? {
          offsetX: -edited.offsetX,
          offsetY: edited.offsetY,
          rotationDeg: -edited.rotationDeg,
          scaleX: edited.scaleX,
          scaleY: edited.scaleY,
        }
      : face[side === "left" ? "right" : "left"];
    return {
      ...b,
      restingFace: {
        ...face,
        left: side === "left" ? edited : other,
        right: side === "right" ? edited : other,
      },
    };
  });
}

export function setLinked(
  doc: StudioDocument,
  bubbleId: string,
  linked: boolean,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    restingFace: { ...b.restingFace, linked },
  }));
}

export function setSpacing(
  doc: StudioDocument,
  bubbleId: string,
  spacing: number,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    restingFace: { ...b.restingFace, spacing },
  }));
}

export function updateAmbient(
  doc: StudioDocument,
  bubbleId: string,
  patch: Partial<AmbientConfig>,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    ambient: { ...b.ambient, ...patch },
  }));
}

// ── FR-4 moods (relative deltas, cancelable edits) ──────────────────────────

export function addMood(
  doc: StudioDocument,
  bubbleId: string,
  name: string,
  deps?: MutationDeps,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const base: Mood = {
    id: id(ctx, "mood"),
    name: name.trim(),
    left: zeroMoodEye(),
    right: zeroMoodEye(),
    // A new mood faces straight ahead: the user authors the pose, the same
    // way they author the eyes (FR-4.10).
    head: { x: 0, y: 0, z: 0 },
    colorOverride: null,
  };
  return withOwnKit(ctx, bubbleId, (kit) => ({
    ...kit,
    moods: [...kit.moods, base],
  }));
}

function zeroMoodEye() {
  return {
    rotationXDeg: 0,
    rotationYDeg: 0,
    rotationZDeg: 0,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

export function updateMood(
  doc: StudioDocument,
  bubbleId: string,
  moodId: string,
  patch: Partial<Pick<Mood, "name" | "colorOverride">> & {
    left?: Partial<Mood["left"]>;
    right?: Partial<Mood["right"]>;
  },
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  if (!effectiveKit(bubble, doc).moods.some((m) => m.id === moodId)) {
    return fail("E_NOT_FOUND", `mood ${moodId}`);
  }
  return withOwnKit(ctx, bubbleId, (kit) =>
    mapMood(kit, moodId, (m) => ({
      ...m,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.colorOverride !== undefined
        ? { colorOverride: patch.colorOverride }
        : {}),
      left: { ...m.left, ...(patch.left ?? {}) },
      right: { ...m.right, ...(patch.right ?? {}) },
    })),
  );
}

/** Deleting a mood referenced by any loop is blocked with E_REF (FR-5). */
export function removeMood(
  doc: StudioDocument,
  bubbleId: string,
  moodId: string,
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const kit = effectiveKit(bubble, doc);
  if (!kit.moods.some((m) => m.id === moodId))
    return fail("E_NOT_FOUND", `mood ${moodId}`);
  const referencing = kit.loops.filter((l) =>
    l.steps.some((s) => s.moodId === moodId),
  );
  if (referencing.length > 0) {
    return fail("E_REF", `mood ${moodId} used by loop ${referencing[0].id}`);
  }
  return withOwnKit(ctx, bubbleId, (kit2) => ({
    ...kit2,
    moods: kit2.moods.filter((m) => m.id !== moodId),
  }));
}

export function duplicateMood(
  doc: StudioDocument,
  bubbleId: string,
  moodId: string,
  deps?: MutationDeps,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const source = effectiveKit(bubble, doc).moods.find((m) => m.id === moodId);
  if (!source) return fail("E_NOT_FOUND", `mood ${moodId}`);
  const copy: Mood = {
    ...structuredClone(source),
    id: id(ctx, "mood"),
    name: `${source.name} copy`,
  };
  return withOwnKit(ctx, bubbleId, (kit) => {
    const moods = [...kit.moods];
    moods.splice(moods.findIndex((m) => m.id === moodId) + 1, 0, copy);
    return { ...kit, moods };
  });
}

export function reorderMoods(
  doc: StudioDocument,
  bubbleId: string,
  ids: string[],
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  if (!permute(effectiveKit(bubble, doc).moods, ids, (m) => m.id)) {
    return fail("E_NOT_FOUND", "moods");
  }
  return withOwnKit(ctx, bubbleId, (kit) => ({
    ...kit,
    moods: permute(kit.moods, ids, (m) => m.id) ?? kit.moods,
  }));
}

// ── FR-5 loops ──────────────────────────────────────────────────────────────

export function addLoop(
  doc: StudioDocument,
  bubbleId: string,
  init?: Partial<Pick<Loop, "name" | "group" | "mode">>,
  deps?: MutationDeps,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const loop: Loop = {
    id: id(ctx, "loop"),
    name: (init?.name ?? "nuevo").trim(),
    group: init?.group ?? "life",
    steps: [],
    mode: init?.mode ?? "loop",
    springSpeed: 1,
    blink: {
      enabled: true,
      minIntervalMs: 2400,
      maxIntervalMs: 6000,
      durationMs: 140,
    },
  };
  return withOwnKit(ctx, bubbleId, (kit) => ({
    ...kit,
    loops: [...kit.loops, loop],
  }));
}

export function updateLoop(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
  patch: Partial<
    Pick<Loop, "name" | "group" | "mode" | "springSpeed" | "blink">
  >,
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  if (!effectiveKit(bubble, doc).loops.some((l) => l.id === loopId)) {
    return fail("E_NOT_FOUND", `loop ${loopId}`);
  }
  return withOwnKit(ctx, bubbleId, (kit) =>
    mapLoop(kit, loopId, (l) => ({ ...l, ...patch })),
  );
}

export function removeLoop(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  if (!effectiveKit(bubble, doc).loops.some((l) => l.id === loopId)) {
    return fail("E_NOT_FOUND", `loop ${loopId}`);
  }
  return withOwnKit(ctx, bubbleId, (kit) => ({
    ...kit,
    loops: kit.loops.filter((l) => l.id !== loopId),
  }));
}

export function addStep(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
  step: Omit<LoopStep, "id">,
  deps?: MutationDeps,
  /**
   * FR-5.10: where the new step lands, counted before it is inserted — `0`
   * makes it first. Absent, it is appended, which is what every caller but a
   * drop onto the timeline wants. Out of range clamps rather than failing: a
   * drop past the last chip means "after everything", and that is a
   * well-formed intent, not an error.
   */
  at?: number,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const kit = effectiveKit(bubble, doc);
  if (!kit.loops.some((l) => l.id === loopId))
    return fail("E_NOT_FOUND", `loop ${loopId}`);
  if (!kit.moods.some((m) => m.id === step.moodId)) {
    return fail("E_REF", `mood ${step.moodId}`);
  }
  return withOwnKit(ctx, bubbleId, (kit2) =>
    mapLoop(kit2, loopId, (l) => {
      const steps = [...l.steps];
      const where =
        at === undefined
          ? steps.length
          : Math.max(0, Math.min(at, steps.length));
      steps.splice(where, 0, { ...step, id: id(ctx, "stp") });
      return { ...l, steps };
    }),
  );
}

export function updateStep(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
  stepId: string,
  patch: Partial<Omit<LoopStep, "id">>,
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const kit = effectiveKit(bubble, doc);
  if (!kit.loops.some((l) => l.id === loopId))
    return fail("E_NOT_FOUND", `loop ${loopId}`);
  if (
    patch.moodId !== undefined &&
    !kit.moods.some((m) => m.id === patch.moodId)
  ) {
    return fail("E_REF", `mood ${patch.moodId}`);
  }
  return withOwnKit(ctx, bubbleId, (kit2) =>
    mapLoop(kit2, loopId, (l) => ({
      ...l,
      steps: l.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    })),
  );
}

export function removeStep(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
  stepId: string,
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  return withOwnKit(ctx, bubbleId, (kit) =>
    mapLoop(kit, loopId, (l) => ({
      ...l,
      steps: l.steps.filter((s) => s.id !== stepId),
    })),
  );
}

export function reorderSteps(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
  stepIds: string[],
): MutationResult {
  const ctx: Ctx = { doc, deps: {} };
  return withOwnKit(ctx, bubbleId, (kit) =>
    mapLoop(kit, loopId, (l) => {
      const byId = new Map(l.steps.map((s) => [s.id, s]));
      const steps = stepIds
        .map((sid) => byId.get(sid))
        .filter((s): s is LoopStep => s !== undefined);
      return { ...l, steps };
    }),
  );
}

export function duplicateLoop(
  doc: StudioDocument,
  bubbleId: string,
  loopId: string,
  deps?: MutationDeps,
): MutationResult {
  const ctx: Ctx = { doc, deps: deps ?? {} };
  const bubble = doc.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return fail("E_NOT_FOUND", `bubble ${bubbleId}`);
  const source = effectiveKit(bubble, doc).loops.find((l) => l.id === loopId);
  if (!source) return fail("E_NOT_FOUND", `loop ${loopId}`);
  const copy: Loop = {
    ...structuredClone(source),
    id: id(ctx, "loop"),
    name: `${source.name} copy`,
    steps: source.steps.map((s) => ({ ...s, id: id(ctx, "stp") })),
  };
  return withOwnKit(ctx, bubbleId, (kit) => {
    const loops = [...kit.loops];
    loops.splice(loops.findIndex((l) => l.id === loopId) + 1, 0, copy);
    return { ...kit, loops };
  });
}

/** Reset a bubble back to the shared starter kit (drops its own kit). */
export function resetKit(
  doc: StudioDocument,
  bubbleId: string,
): MutationResult {
  return mapBubble({ doc, deps: {} }, bubbleId, (b) => ({
    ...b,
    ownKit: null,
  }));
}

/** Reset the whole document to a fresh default (keeps nothing). */
export function freshDocument(deps?: MutationDeps): StudioDocument {
  const bubble = createBubble("Bubble", newId("bbl", deps?.random));
  return {
    version: 6,
    kind: "bubble-studio-project",
    activeBubbleId: bubble.id,
    locale: "es",
    bubbles: [bubble],
    starterKit: starterKit(),
  };
}
