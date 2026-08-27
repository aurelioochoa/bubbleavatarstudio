// FR-12.3: on a phone the inspector is a bottom sheet, and the rule that
// shapes it is FR-4.4 — a mood is judged against the character, so no detent
// may hide the stage. The tall detent is therefore capped below full height,
// which is the one assertion here that is about the product rather than about
// the gesture.
//
// The drag is measured against the viewport rather than against a parent box:
// jsdom gives every element a zero rect, and a sheet that is bottom-anchored to
// the window can honestly ask the window how tall it is.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DETENTS, Sheet, type Detent } from "./Sheet";

beforeEach(cleanup);

/** The sheet's own box; `height` is what every case here reads. */
const sheet = () => screen.getByTestId("sheet");
const grip = () => screen.getByRole("button", { name: "Alto de la hoja" });

// jsdom has no PointerEvent; dispatch plain events with coordinates assigned
// as own properties so React handlers can read them (the same rodeo
// Stage.test.tsx takes).
function firePointer(el: Element, type: string, props: Record<string, number>) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

function drag(byPx: number) {
  const g = grip();
  firePointer(g, "pointerdown", { pointerId: 1, clientY: 400 });
  firePointer(g, "pointermove", { pointerId: 1, clientY: 400 - byPx });
  firePointer(g, "pointerup", { pointerId: 1, clientY: 400 - byPx });
}

function renderSheet(detent: Detent, onDetent = vi.fn()) {
  render(
    <Sheet
      detent={detent}
      onDetent={onDetent}
      label="Inspector"
      gripLabel="Alto de la hoja"
    >
      <p>panel</p>
    </Sheet>,
  );
  return onDetent;
}

describe("Sheet detents (FR-12.3)", () => {
  it("is as tall as the detent it is given", () => {
    renderSheet("half");
    expect(sheet().style.height).toBe(`${String(DETENTS.half * 100)}%`);
  });

  it("never covers the stage, even at its tallest", () => {
    // The claim FR-4.4 rests on. If this ever reads 100%, a mood is being
    // edited against nothing.
    expect(DETENTS.tall).toBeLessThan(1);
    renderSheet("tall");
    expect(Number.parseFloat(sheet().style.height)).toBeLessThan(100);
  });

  it("leaves the stage at least 40% at the resting detent (FR-12.2)", () => {
    expect(DETENTS.half).toBeLessThanOrEqual(0.6);
  });

  it("orders its detents handle < half < tall", () => {
    expect(DETENTS.handle).toBeLessThan(DETENTS.half);
    expect(DETENTS.half).toBeLessThan(DETENTS.tall);
  });
});

describe("Sheet drag", () => {
  it("rises a detent when dragged up", () => {
    const onDetent = renderSheet("handle");
    drag(300);
    expect(onDetent).toHaveBeenCalledWith("half");
  });

  it("falls a detent when dragged down", () => {
    const onDetent = renderSheet("tall");
    drag(-150);
    expect(onDetent).toHaveBeenCalledWith("half");
  });

  it("stays put when the drag is too small to mean anything", () => {
    const onDetent = renderSheet("half");
    drag(8);
    expect(onDetent).not.toHaveBeenCalled();
  });

  it("does not fall below the lowest detent or rise above the highest", () => {
    const down = renderSheet("handle");
    drag(-400);
    expect(down).not.toHaveBeenCalled();

    cleanup();
    const up = renderSheet("tall");
    drag(400);
    expect(up).not.toHaveBeenCalled();
  });

  /**
   * A sheet that eases while the finger is still on it lags behind the finger,
   * which reads as the gesture not having been picked up. It follows during
   * the drag and eases only on release.
   */
  it("follows the finger without easing, and eases once released", () => {
    renderSheet("half");
    const g = grip();

    firePointer(g, "pointerdown", { pointerId: 1, clientY: 400 });
    firePointer(g, "pointermove", { pointerId: 1, clientY: 340 });
    expect(sheet().className).not.toMatch(/transition-\[height\]/);
    const dragged = Number.parseFloat(sheet().style.height);
    expect(dragged).toBeGreaterThan(DETENTS.half * 100);

    firePointer(g, "pointerup", { pointerId: 1, clientY: 340 });
    expect(sheet().className).toMatch(/transition-\[height\]/);
  });
});

describe("Sheet without a drag (part 05 §3)", () => {
  /**
   * Every drag in this studio has a button beside it. Here the grip is that
   * button: pressing it cycles up through the detents and back to the bottom,
   * so the sheet is reachable by keyboard and by anyone who cannot drag.
   */
  it("cycles up through the detents when the grip is pressed", () => {
    const onDetent = renderSheet("handle");
    fireEvent.click(grip());
    expect(onDetent).toHaveBeenCalledWith("half");
  });

  it("wraps from the top back to the handle", () => {
    const onDetent = renderSheet("tall");
    fireEvent.click(grip());
    expect(onDetent).toHaveBeenCalledWith("handle");
  });

  it("does not cycle when the press was the end of a drag", () => {
    // Browsers fire a click after a pointer sequence on the same element; a
    // drag that just moved the sheet must not also cycle it.
    const onDetent = renderSheet("handle");
    const g = grip();
    firePointer(g, "pointerdown", { pointerId: 1, clientY: 400 });
    firePointer(g, "pointermove", { pointerId: 1, clientY: 100 });
    firePointer(g, "pointerup", { pointerId: 1, clientY: 100 });
    onDetent.mockClear();

    fireEvent.click(g);

    expect(onDetent).not.toHaveBeenCalled();
  });
});

describe("Sheet accessibility", () => {
  it("names itself, and its grip says what it moves", () => {
    renderSheet("half");
    expect(screen.getByLabelText("Inspector")).toBe(sheet());
    expect(grip()).toHaveProperty("type", "button");
  });

  it("meets the 44px touch floor on the grip (FR-12.5)", () => {
    renderSheet("half");
    expect(grip().className).toMatch(/\bh-11\b|\bmin-h-11\b/);
  });
});
