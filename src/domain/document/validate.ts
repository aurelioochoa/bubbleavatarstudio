// Validation per docs/03 §7. Pure structural + referential + range checks.
import { SHAPE_FAMILIES } from "../geometry/shapes";
import type { Bubble, Kit, Mood } from "./types";

export type ErrorCode =
  | "E_VERSION"
  | "E_KIND"
  | "E_SHAPE"
  | "E_ID_DUP"
  | "E_REF"
  | "E_RANGE"
  | "E_NAME"
  | "E_COLOR"
  | "E_MIRROR";

export interface ValidationIssue {
  code: ErrorCode;
  path: string;
  detail?: string;
}

export type ValidateResult =
  { ok: true } | { ok: false; issues: ValidationIssue[] };

const HEX = /^#[0-9a-f]{6}$/;
const EXTRA_KINDS = new Set(["blob", "capsule", "circle", "ring"]);
const COLOR_ROLES = new Set(["body", "accent", "custom"]);
const TRANSITIONS = new Set(["linear", "ease", "spring", "step"]);
const MODES = new Set(["loop", "once", "pingpong"]);
const SHAPES = new Set<string>(SHAPE_FAMILIES);

/** FR-2.3. How many primitives may be assembled around the primary shape. */
export const MAX_EXTRAS = 16;

class Ctx {
  readonly issues: ValidationIssue[] = [];

  fail(code: ErrorCode, path: string, detail?: string): void {
    this.issues.push({ code, path, ...(detail ? { detail } : {}) });
  }

  check(cond: boolean, code: ErrorCode, path: string, detail?: string): void {
    if (!cond) this.fail(code, path, detail);
  }
}

function num(
  ctx: Ctx,
  v: unknown,
  path: string,
  min: number,
  max: number,
): void {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    ctx.fail(
      "E_RANGE",
      path,
      `expected number in [${String(min)}, ${String(max)}]`,
    );
  }
}

function pos(ctx: Ctx, v: unknown, path: string): void {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    ctx.fail("E_RANGE", path, "expected positive number");
  }
}

function int(
  ctx: Ctx,
  v: unknown,
  path: string,
  min?: number,
  max?: number,
): void {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    ctx.fail("E_RANGE", path, "expected integer");
    return;
  }
  if ((min !== undefined && v < min) || (max !== undefined && v > max)) {
    ctx.fail(
      "E_RANGE",
      path,
      `expected integer in [${String(min)}, ${String(max)}]`,
    );
  }
}

function str(ctx: Ctx, v: unknown, path: string): void {
  if (typeof v !== "string") ctx.fail("E_SHAPE", path, "expected string");
}

function nonEmptyName(ctx: Ctx, v: unknown, path: string): void {
  if (typeof v !== "string" || v.trim().length === 0) {
    ctx.fail("E_NAME", path, "expected non-empty name");
  }
}

function color(ctx: Ctx, v: unknown, path: string): void {
  if (typeof v !== "string" || !HEX.test(v))
    ctx.fail("E_COLOR", path, "expected #rrggbb");
}

function oneOf<T extends string>(
  ctx: Ctx,
  v: unknown,
  set: Set<T>,
  path: string,
): void {
  if (typeof v !== "string" || !set.has(v as T)) {
    ctx.fail("E_SHAPE", path, `expected one of ${[...set].join("|")}`);
  }
}

function validateMoodEye(ctx: Ctx, e: unknown, path: string): void {
  if (typeof e !== "object" || e === null) {
    ctx.fail("E_SHAPE", path);
    return;
  }
  const m = e as Record<string, unknown>;
  num(ctx, m.rotationXDeg, `${path}.rotationXDeg`, -360, 360);
  num(ctx, m.rotationYDeg, `${path}.rotationYDeg`, -360, 360);
  num(ctx, m.rotationZDeg, `${path}.rotationZDeg`, -360, 360);
  num(ctx, m.scaleX, `${path}.scaleX`, 0.1, 3);
  num(ctx, m.scaleY, `${path}.scaleY`, 0.1, 3);
  num(ctx, m.offsetX, `${path}.offsetX`, -400, 400);
  num(ctx, m.offsetY, `${path}.offsetY`, -400, 400);
}

function validateMood(ctx: Ctx, m: unknown, path: string): void {
  if (typeof m !== "object" || m === null) {
    ctx.fail("E_SHAPE", path);
    return;
  }
  const mood = m as Record<string, unknown>;
  str(ctx, mood.id, `${path}.id`);
  nonEmptyName(ctx, mood.name, `${path}.name`);
  validateMoodEye(ctx, mood.left, `${path}.left`);
  validateMoodEye(ctx, mood.right, `${path}.right`);
  const co = mood.colorOverride;
  if (co !== null && co !== undefined) {
    if (typeof co !== "object") {
      ctx.fail("E_SHAPE", `${path}.colorOverride`);
      return;
    }
    const c = co as Record<string, unknown>;
    if (c.body !== undefined) color(ctx, c.body, `${path}.colorOverride.body`);
    if (c.eyes !== undefined) color(ctx, c.eyes, `${path}.colorOverride.eyes`);
  }
}

function validateKit(ctx: Ctx, kit: unknown, path: string): asserts kit is Kit {
  if (typeof kit !== "object" || kit === null) {
    ctx.fail("E_SHAPE", path);
    return;
  }
  const k = kit as Record<string, unknown>;
  if (!Array.isArray(k.moods)) {
    ctx.fail("E_SHAPE", `${path}.moods`);
    return;
  }
  if (!Array.isArray(k.loops)) {
    ctx.fail("E_SHAPE", `${path}.loops`);
    return;
  }

  const moodIds = new Set<string>();
  (k.moods as unknown[]).forEach((m, i) => {
    const p = `${path}.moods[${String(i)}]`;
    validateMood(ctx, m, p);
    const id = (m as Mood | null)?.id;
    if (typeof id === "string") {
      ctx.check(!moodIds.has(id), "E_ID_DUP", `${p}.id`);
      moodIds.add(id);
    }
  });

  const loopIds = new Set<string>();
  (k.loops as unknown[]).forEach((l, i) => {
    const p = `${path}.loops[${String(i)}]`;
    if (typeof l !== "object" || l === null) {
      ctx.fail("E_SHAPE", p);
      return;
    }
    const loop = l as Record<string, unknown>;
    str(ctx, loop.id, `${p}.id`);
    if (typeof loop.id === "string") {
      ctx.check(!loopIds.has(loop.id), "E_ID_DUP", `${p}.id`);
      loopIds.add(loop.id);
    }
    nonEmptyName(ctx, loop.name, `${p}.name`);
    str(ctx, loop.group, `${p}.group`);
    oneOf(ctx, loop.mode, MODES, `${p}.mode`);
    num(ctx, loop.springSpeed, `${p}.springSpeed`, 0.1, 3);
    if (!Array.isArray(loop.steps)) {
      ctx.fail("E_SHAPE", `${p}.steps`);
      return;
    }
    const stepIds = new Set<string>();
    (loop.steps as unknown[]).forEach((s, j) => {
      const sp = `${p}.steps[${String(j)}]`;
      if (typeof s !== "object" || s === null) {
        ctx.fail("E_SHAPE", sp);
        return;
      }
      const step = s as Record<string, unknown>;
      str(ctx, step.id, `${sp}.id`);
      if (typeof step.id === "string") {
        ctx.check(!stepIds.has(step.id), "E_ID_DUP", `${sp}.id`);
        stepIds.add(step.id);
      }
      str(ctx, step.moodId, `${sp}.moodId`);
      if (typeof step.moodId === "string" && !moodIds.has(step.moodId)) {
        ctx.fail("E_REF", `${sp}.moodId`, "unknown moodId");
      }
      num(ctx, step.holdMs, `${sp}.holdMs`, 0, 60_000);
      oneOf(ctx, step.transition, TRANSITIONS, `${sp}.transition`);
    });
    const blink = loop.blink;
    if (typeof blink !== "object" || blink === null) {
      ctx.fail("E_SHAPE", `${p}.blink`);
      return;
    }
    const b = blink as Record<string, unknown>;
    if (typeof b.enabled === "boolean" && b.enabled) {
      pos(ctx, b.minIntervalMs, `${p}.blink.minIntervalMs`);
      pos(ctx, b.maxIntervalMs, `${p}.blink.maxIntervalMs`);
      pos(ctx, b.durationMs, `${p}.blink.durationMs`);
      if (
        typeof b.minIntervalMs === "number" &&
        typeof b.maxIntervalMs === "number" &&
        b.minIntervalMs > b.maxIntervalMs
      ) {
        ctx.fail("E_RANGE", `${p}.blink.minIntervalMs`, "min > max");
      }
    }
  });
}

function mirrorConsistent(face: Bubble["restingFace"]): boolean {
  const { left, right } = face;
  return (
    right.offsetX === -left.offsetX &&
    right.offsetY === left.offsetY &&
    right.rotationDeg === -left.rotationDeg &&
    right.scaleX === left.scaleX &&
    right.scaleY === left.scaleY
  );
}

function validateBubble(
  ctx: Ctx,
  b: unknown,
  path: string,
): asserts b is Bubble {
  if (typeof b !== "object" || b === null) {
    ctx.fail("E_SHAPE", path);
    return;
  }
  const bubble = b as Record<string, unknown>;
  str(ctx, bubble.id, `${path}.id`);
  nonEmptyName(ctx, bubble.name, `${path}.name`);

  const body = bubble.body;
  if (typeof body !== "object" || body === null) {
    ctx.fail("E_SHAPE", `${path}.body`);
    return;
  }
  const bodyRec = body as Record<string, unknown>;

  const surface = bodyRec.surface;
  if (typeof surface !== "object" || surface === null) {
    {
      ctx.fail("E_SHAPE", `${path}.body.surface`);
      return;
    }
  }
  const s = surface as Record<string, unknown>;
  oneOf(ctx, s.kind, new Set(["blob"]), `${path}.body.surface.kind`);
  oneOf(ctx, s.shape, SHAPES, `${path}.body.surface.shape`);
  pos(ctx, s.width, `${path}.body.surface.width`);
  pos(ctx, s.height, `${path}.body.surface.height`);
  pos(ctx, s.depth, `${path}.body.surface.depth`);
  num(ctx, s.roundness, `${path}.body.surface.roundness`, 0, 1);
  num(ctx, s.perspective, `${path}.body.surface.perspective`, 0, 1);
  num(ctx, s.x, `${path}.body.surface.x`, -2000, 2000);
  num(ctx, s.y, `${path}.body.surface.y`, -2000, 2000);
  num(ctx, s.rotationDeg, `${path}.body.surface.rotationDeg`, -180, 180);
  if (s.lobes !== undefined)
    int(ctx, s.lobes, `${path}.body.surface.lobes`, 3, 10);
  if (s.wobble !== undefined)
    num(ctx, s.wobble, `${path}.body.surface.wobble`, 0, 1);
  if (s.seed !== undefined) int(ctx, s.seed, `${path}.body.surface.seed`);

  if (!Array.isArray(bodyRec.extras)) {
    ctx.fail("E_SHAPE", `${path}.body.extras`);
    return;
  }
  // FR-2.3: a body is a primary shape plus assembled primitives, and the count
  // is bounded so "assembled" stays a construction rather than a scene graph.
  ctx.check(
    (bodyRec.extras as unknown[]).length <= MAX_EXTRAS,
    "E_RANGE",
    `${path}.body.extras`,
  );
  (bodyRec.extras as unknown[]).forEach((e, i) => {
    const p = `${path}.body.extras[${String(i)}]`;
    if (typeof e !== "object" || e === null) {
      ctx.fail("E_SHAPE", p);
      return;
    }
    const extra = e as Record<string, unknown>;
    str(ctx, extra.id, `${p}.id`);
    oneOf(ctx, extra.kind, EXTRA_KINDS, `${p}.kind`);
    pos(ctx, extra.width, `${p}.width`);
    pos(ctx, extra.height, `${p}.height`);
    pos(ctx, extra.depth, `${p}.depth`);
    num(ctx, extra.roundness, `${p}.roundness`, 0, 1);
    int(ctx, extra.z, `${p}.z`);
    oneOf(ctx, extra.colorRole, COLOR_ROLES, `${p}.colorRole`);
    color(ctx, extra.color, `${p}.color`);
  });

  const colors = bubble.colors;
  if (typeof colors !== "object" || colors === null) {
    ctx.fail("E_SHAPE", `${path}.colors`);
    return;
  }
  const c = colors as Record<string, unknown>;
  color(ctx, c.body, `${path}.colors.body`);
  color(ctx, c.accent, `${path}.colors.accent`);
  color(ctx, c.eyes, `${path}.colors.eyes`);

  const face = bubble.restingFace;
  if (typeof face !== "object" || face === null) {
    {
      ctx.fail("E_SHAPE", `${path}.restingFace`);
      return;
    }
  }
  const f = face as Record<string, unknown>;
  const eye = f.eye;
  if (typeof eye !== "object" || eye === null) {
    ctx.fail("E_SHAPE", `${path}.restingFace.eye`);
    return;
  }
  pos(
    ctx,
    (eye as Record<string, unknown>).width,
    `${path}.restingFace.eye.width`,
  );
  pos(
    ctx,
    (eye as Record<string, unknown>).height,
    `${path}.restingFace.eye.height`,
  );
  num(
    ctx,
    (eye as Record<string, unknown>).roundness,
    `${path}.restingFace.eye.roundness`,
    0,
    1,
  );
  pos(ctx, f.spacing, `${path}.restingFace.spacing`);
  for (const side of ["left", "right"] as const) {
    const pl = f[side];
    if (typeof pl !== "object" || pl === null) {
      {
        ctx.fail("E_SHAPE", `${path}.restingFace.${side}`);
        return;
      }
    }
    const plRec = pl as Record<string, unknown>;
    num(ctx, plRec.offsetX, `${path}.restingFace.${side}.offsetX`, -400, 400);
    num(ctx, plRec.offsetY, `${path}.restingFace.${side}.offsetY`, -400, 400);
    num(
      ctx,
      plRec.rotationDeg,
      `${path}.restingFace.${side}.rotationDeg`,
      -180,
      180,
    );
    num(ctx, plRec.scaleX, `${path}.restingFace.${side}.scaleX`, 0.1, 3);
    num(ctx, plRec.scaleY, `${path}.restingFace.${side}.scaleY`, 0.1, 3);
  }
  const linked = f.linked;
  if (typeof linked !== "boolean") {
    ctx.fail("E_SHAPE", `${path}.restingFace.linked`);
    return;
  }
  if (linked) {
    ctx.check(
      mirrorConsistent(face as unknown as Bubble["restingFace"]),
      "E_MIRROR",
      `${path}.restingFace`,
    );
  }

  const ambient = bubble.ambient;
  if (typeof ambient !== "object" || ambient === null) {
    ctx.fail("E_SHAPE", `${path}.ambient`);
    return;
  }
  const a = ambient as Record<string, unknown>;
  if (typeof a.enabled !== "boolean")
    ctx.fail("E_SHAPE", `${path}.ambient.enabled`);
  num(ctx, a.bodyAmplitude, `${path}.ambient.bodyAmplitude`, 0, 50);
  pos(ctx, a.bodyPeriodMs, `${path}.ambient.bodyPeriodMs`);
  num(ctx, a.eyeAmplitude, `${path}.ambient.eyeAmplitude`, 0, 50);
  pos(ctx, a.eyePeriodMs, `${path}.ambient.eyePeriodMs`);

  if (bubble.ownKit !== null && bubble.ownKit !== undefined) {
    validateKit(ctx, bubble.ownKit, `${path}.ownKit`);
  }
}

export function validateDocument(doc: unknown): ValidateResult {
  const ctx = new Ctx();
  if (typeof doc !== "object" || doc === null) {
    return { ok: false, issues: [{ code: "E_SHAPE", path: "$" }] };
  }
  const d = doc as Record<string, unknown>;
  ctx.check(d.version === 4, "E_VERSION", "$.version");
  ctx.check(d.kind === "bubble-studio-project", "E_KIND", "$.kind");
  if (!Array.isArray(d.bubbles)) {
    ctx.fail("E_SHAPE", "$.bubbles");
    return { ok: false, issues: ctx.issues };
  }
  const bubbleIds = new Set<string>();
  (d.bubbles as unknown[]).forEach((b, i) => {
    const p = `$.bubbles[${String(i)}]`;
    validateBubble(ctx, b, p);
    const id = (b as unknown as Record<string, unknown>).id;
    if (typeof id === "string") {
      ctx.check(!bubbleIds.has(id), "E_ID_DUP", `${p}.id`);
      bubbleIds.add(id);
    }
  });
  if (d.activeBubbleId !== null) {
    ctx.check(
      typeof d.activeBubbleId === "string" && bubbleIds.has(d.activeBubbleId),
      "E_REF",
      "$.activeBubbleId",
    );
  }
  if (d.locale !== undefined)
    ctx.check(d.locale === "es" || d.locale === "en", "E_SHAPE", "$.locale");
  validateKit(ctx, d.starterKit, "$.starterKit");
  return ctx.issues.length === 0
    ? { ok: true }
    : { ok: false, issues: ctx.issues };
}
