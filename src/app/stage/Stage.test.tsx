// FR-8 direct manipulation: each drag axis seeds from its own start value,
// and Escape restores the resting rotation. Engine is mocked; we assert on
// the opts StageEngine.update receives.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { Stage } from "./Stage";
import { StageEngine } from "./StageEngine";
import { createDefaultDocument } from "../../domain/document/create";
import { effectiveKit } from "../../domain/document/mutate";

vi.mock("./StageEngine", () => ({
  StageEngine: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    update: vi.fn(),
  })),
}));

type EngineMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const engineOf = (): EngineMock => {
  const results = vi.mocked(StageEngine).mock.results as Array<{
    value: EngineMock;
  }>;
  const last = results.at(-1);
  if (!last) throw new Error("StageEngine never constructed");
  return last.value;
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderStage() {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const kit = effectiveKit(bubble, doc);
  const { container } = render(
    <Stage
      bubble={bubble}
      kit={kit}
      loopId={kit.loops[0]?.id ?? null}
      mode="stopped"
      onPause={() => {}}
    />,
  );
  const el = container.querySelector('[aria-label="bubble stage"]');
  if (!el) throw new Error("stage element missing");
  return el;
}

// jsdom has no PointerEvent; dispatch plain events with coordinates
// assigned as own properties so React handlers can read them.
function firePointer(el: Element, type: string, props: Record<string, number>) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

function drag(el: Element, dx: number, dy: number) {
  firePointer(el, "pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
  firePointer(el, "pointermove", {
    pointerId: 1,
    clientX: 100 + dx,
    clientY: 100 + dy,
  });
  firePointer(el, "pointerup", { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
}

function lastHead(): { x: number; y: number; z: number } {
  const calls = engineOf().update.mock.calls as Array<
    [{ headRotation: { x: number; y: number; z: number } }]
  >;
  const last = calls.at(-1);
  if (!last) throw new Error("engine.update never called");
  return last[0].headRotation;
}

describe("Stage drag (FR-8.3)", () => {
  it("seeds each rotation axis from its own start value across drags", () => {
    const el = renderStage();
    drag(el, 100, 0); // x rotation only
    expect(lastHead().x).toBeCloseTo(20);
    expect(lastHead().y).toBeCloseTo(0);
    drag(el, 0, 100); // y rotation must not clobber/reset x
    expect(lastHead().x).toBeCloseTo(20);
    expect(lastHead().y).toBeCloseTo(20);
  });

  it("Escape restores the resting rotation", () => {
    const el = renderStage();
    drag(el, 100, 100);
    fireEvent.keyDown(el, { key: "Escape" });
    expect(lastHead()).toEqual({ x: 0, y: 0, z: 0 });
  });
});
