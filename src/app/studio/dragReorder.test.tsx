// Reordering by drag for the three lists that have one — the rail (FR-1.4),
// the mood grid (FR-4.2) and a loop's steps (FR-5.2) — with the ↑ ↓ buttons
// kept as the accessible fallback (docs/05 §2/§3). This pins the drag half —
// the order it produces, and the cases that must not produce one at all.
//
// FR-12.4: the drag runs on Pointer Events. It was native HTML5 drag before,
// which a touchscreen never starts at all — the three lists were simply not
// reorderable with a finger, and no amount of styling would have changed it.
//
// The two pointers get different starts on purpose. A mouse arms on movement,
// because a press that then moves is unambiguous. A finger arms on a held
// press, because a finger that moves straight away is far more likely to be
// scrolling the panel the list sits in, and stealing that would make every
// list a trap.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { HOLD_MS, movedOrder, useDragReorder } from "./dragReorder";

beforeEach(cleanup);
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function List({ onReorder }: { onReorder: (ids: string[]) => void }) {
  const ids = ["a", "b", "c", "d"];
  const drag = useDragReorder(ids, onReorder);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id} data-testid={id} {...drag.itemProps(id)}>
          {id}
          <span data-grip data-testid={`grip-${id}`} />
        </li>
      ))}
    </ul>
  );
}

function setup() {
  const onReorder = vi.fn();
  render(<List onReorder={onReorder} />);
  return { onReorder };
}

// jsdom has no PointerEvent; dispatch plain events with the fields the hook
// reads assigned as own properties (the rodeo Stage.test.tsx takes too).
function firePointer(
  el: Element,
  type: string,
  props: Record<string, number | string>,
) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

/**
 * jsdom has no layout and no `elementFromPoint` at all, so the element under
 * the pointer is supplied outright rather than spied on.
 */
function pointerOver(el: Element | null) {
  (document as unknown as Record<string, unknown>).elementFromPoint = () => el;
}

beforeEach(() => {
  pointerOver(null);
});

const at = (id: string) => screen.getByTestId(id);

/** Inside `act`, so the hold's setState reaches the effects that watch it. */
function hold(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** A mouse drag: press, move past the slop, release over the target. */
function mouseDrag(fromId: string, toId: string | null) {
  const from = at(fromId);
  firePointer(from, "pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 0,
    clientY: 0,
  });
  pointerOver(toId === null ? null : at(toId));
  firePointer(from, "pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 0,
    clientY: 40,
  });
  firePointer(from, "pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 0,
    clientY: 40,
  });
}

/** A touch drag: press, hold, then move and release over the target. */
function touchDrag(fromId: string, toId: string | null, ms = HOLD_MS) {
  const from = at(fromId);
  firePointer(from, "pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: 0,
    clientY: 0,
  });
  hold(ms);
  pointerOver(toId === null ? null : at(toId));
  firePointer(from, "pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: 0,
    clientY: 40,
  });
  firePointer(from, "pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: 0,
    clientY: 40,
  });
}

describe("movedOrder", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves an item down into the target's place", () => {
    expect(movedOrder(ids, "a", "c")).toEqual(["b", "c", "a", "d"]);
  });

  it("inserts before the target when moving up", () => {
    expect(movedOrder(ids, "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("declines a move that would change nothing", () => {
    expect(movedOrder(ids, "b", "b")).toBeNull();
  });

  it("declines an id the list does not hold", () => {
    expect(movedOrder(ids, "zz", "b")).toBeNull();
    expect(movedOrder(ids, "b", "zz")).toBeNull();
  });
});

describe("useDragReorder with a mouse", () => {
  it("reorders on a press that moves and releases over another item", () => {
    const { onReorder } = setup();
    mouseDrag("a", "c");
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a", "d"]);
  });

  it("inserts before the target when dragging up", () => {
    const { onReorder } = setup();
    mouseDrag("d", "b");
    expect(onReorder).toHaveBeenCalledWith(["a", "d", "b", "c"]);
  });

  /** A press that never moves is a click, and the lists are full of buttons. */
  it("does not reorder on a press that never moved", () => {
    const { onReorder } = setup();
    const from = at("a");
    firePointer(from, "pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    });
    pointerOver(at("c"));
    firePointer(from, "pointerup", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does nothing when released over itself", () => {
    const { onReorder } = setup();
    mouseDrag("b", "b");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does nothing when released over no item at all", () => {
    const { onReorder } = setup();
    mouseDrag("b", null);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("marks the item being dragged so it can be shown as lifted", () => {
    setup();
    const from = at("b");
    firePointer(from, "pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    });
    firePointer(from, "pointermove", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 40,
    });
    expect(at("b").getAttribute("data-dragging")).toBe("true");

    firePointer(from, "pointerup", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 40,
    });
    expect(at("b").hasAttribute("data-dragging")).toBe(false);
  });

  /**
   * A step chip carries a resize grip on its edge, which runs its own pointer
   * drag (FR-5.9). A press that starts there is retiming a step, not moving
   * one, and the reorder must keep its hands off it.
   */
  it("ignores a press that starts on a resize grip", () => {
    const { onReorder } = setup();
    const grip = at("grip-a");
    firePointer(grip, "pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    });
    pointerOver(at("c"));
    firePointer(grip, "pointermove", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 40,
    });
    firePointer(grip, "pointerup", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 40,
    });
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("useDragReorder with a finger (FR-12.4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("reorders after the press is held", () => {
    const { onReorder } = setup();
    touchDrag("a", "c");
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a", "d"]);
  });

  /**
   * The one that matters most. Every list here sits in something that scrolls —
   * the mood grid in the inspector's scroll box, the rail strip sideways on a
   * phone — and a finger that starts moving before the hold is scrolling it.
   * Arming on movement would make the whole list unscrollable.
   */
  it("yields to a scroll: a finger that moves before the hold never drags", () => {
    const { onReorder } = setup();
    const from = at("a");
    firePointer(from, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    hold(HOLD_MS / 4);
    pointerOver(at("c"));
    firePointer(from, "pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 40,
    });
    // Even holding afterwards must not arm it: the gesture is already a scroll.
    hold(HOLD_MS);
    firePointer(from, "pointerup", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 60,
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(at("a").hasAttribute("data-dragging")).toBe(false);
  });

  it("does not arm before the hold has elapsed", () => {
    const { onReorder } = setup();
    touchDrag("a", "c", HOLD_MS / 2);
    expect(onReorder).not.toHaveBeenCalled();
  });

  /**
   * Once armed, the page must stop scrolling under the finger — `touch-action`
   * is settled when the gesture begins, so the only thing that still works
   * mid-gesture is refusing the touchmove itself.
   */
  it("blocks the page from scrolling while it drags", () => {
    setup();
    const from = at("a");
    firePointer(from, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    hold(HOLD_MS);

    const scroll = new Event("touchmove", { bubbles: true, cancelable: true });
    document.dispatchEvent(scroll);
    expect(scroll.defaultPrevented).toBe(true);

    firePointer(from, "pointerup", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    const after = new Event("touchmove", { bubbles: true, cancelable: true });
    document.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("abandons the drag when the pointer is cancelled", () => {
    const { onReorder } = setup();
    const from = at("a");
    firePointer(from, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    hold(HOLD_MS);
    firePointer(from, "pointercancel", { pointerId: 1, pointerType: "touch" });
    pointerOver(at("c"));
    firePointer(from, "pointerup", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 40,
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(at("a").hasAttribute("data-dragging")).toBe(false);
  });
});
