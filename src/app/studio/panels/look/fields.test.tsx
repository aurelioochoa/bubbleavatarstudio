// FR-9.5: a numeric field is dialled in three ways — typed, stepped, or
// scrubbed by dragging its label — so a value can be found without keyboard
// round-trips. The first two are native; this pins the third.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NumberField } from "./fields";

beforeEach(cleanup);

function setup(props: Partial<Parameters<typeof NumberField>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <NumberField
      label="Ancho"
      value={10}
      step={1}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, label: screen.getByTestId("scrub-Ancho") };
}

/** jsdom has no PointerEvent; dispatch plain events carrying coordinates. */
function pointer(el: Element, type: string, props: Record<string, number>) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

describe("drag-to-scrub (FR-9.5)", () => {
  it("raises the value as the label is dragged right", () => {
    const { onChange, label } = setup();
    pointer(label, "pointerdown", { pointerId: 1, clientX: 100 });
    pointer(label, "pointermove", { pointerId: 1, clientX: 140 });
    expect(onChange).toHaveBeenLastCalledWith(20);
  });

  it("lowers it dragging left, and seeds from where the drag started", () => {
    const { onChange, label } = setup();
    pointer(label, "pointerdown", { pointerId: 1, clientX: 100 });
    pointer(label, "pointermove", { pointerId: 1, clientX: 60 });
    expect(onChange).toHaveBeenLastCalledWith(0);
    // The field is controlled and `value` never moved, so a second drag must
    // start from 10 again rather than from wherever the last one ended.
    pointer(label, "pointerup", { pointerId: 1, clientX: 60 });
    pointer(label, "pointerdown", { pointerId: 1, clientX: 0 });
    pointer(label, "pointermove", { pointerId: 1, clientX: 40 });
    expect(onChange).toHaveBeenLastCalledWith(20);
  });

  it("moves by the field's own step, not by whole units", () => {
    const { onChange, label } = setup({ value: 1, step: 0.05 });
    pointer(label, "pointerdown", { pointerId: 1, clientX: 100 });
    pointer(label, "pointermove", { pointerId: 1, clientX: 108 });
    // Two steps of 0.05, and no float dust on the way (1.1, not 1.10000001).
    expect(onChange).toHaveBeenLastCalledWith(1.1);
  });

  it("respects the range the field was given", () => {
    const { onChange, label } = setup({ value: 10, min: 8, max: 12 });
    pointer(label, "pointerdown", { pointerId: 1, clientX: 100 });
    pointer(label, "pointermove", { pointerId: 1, clientX: 400 });
    expect(onChange).toHaveBeenLastCalledWith(12);
    pointer(label, "pointermove", { pointerId: 1, clientX: -400 });
    expect(onChange).toHaveBeenLastCalledWith(8);
  });

  it("ignores movement that is not a drag, and stops at pointerup", () => {
    const { onChange, label } = setup();
    pointer(label, "pointermove", { pointerId: 1, clientX: 400 });
    expect(onChange).not.toHaveBeenCalled();
    pointer(label, "pointerdown", { pointerId: 1, clientX: 100 });
    pointer(label, "pointerup", { pointerId: 1, clientX: 100 });
    pointer(label, "pointermove", { pointerId: 1, clientX: 400 });
    expect(onChange).not.toHaveBeenCalled();
  });
});
