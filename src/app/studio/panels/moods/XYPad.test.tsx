// FR-4.1: a mood's per-eye offset is two numbers that mean one place, so it is
// edited as one place. The pad replaced two of the fourteen stacked sliders
// the editor used to be.
//
// jsdom lays nothing out, so the pad is given a box by hand: every pointer
// coordinate below is in the space of a 100×100 pad at the viewport origin.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { XYPad } from "./XYPad";

beforeEach(cleanup);

const RANGE = 40;

function setup(x = 0, y = 0) {
  const onChange = vi.fn();
  render(
    <XYPad
      label="Ojo izq."
      xLabel="X"
      yLabel="Y"
      x={x}
      y={y}
      range={RANGE}
      onChange={onChange}
    />,
  );
  const pad = screen.getByTestId("xy-pad");
  pad.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return { pad, onChange };
}

function press(el: Element, type: string, clientX: number, clientY: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, { pointerId: 1, clientX, clientY });
  fireEvent(el, ev);
}

describe("XYPad (FR-4.1)", () => {
  it("puts the dot where the values say, with the origin at the centre", () => {
    setup(0, 0);
    expect(screen.getByTestId("xy-dot").style.left).toBe("50%");
    expect(screen.getByTestId("xy-dot").style.top).toBe("50%");
  });

  it("draws a negative Y above the centre, the way the render reads it", () => {
    // Screen y grows downward and so does offsetY, so −14u is up. Getting this
    // backwards would make the pad disagree with the stage it is judged by.
    setup(-11, -14);
    expect(screen.getByTestId("xy-dot").style.left).toBe("36.25%");
    expect(screen.getByTestId("xy-dot").style.top).toBe("32.5%");
  });

  it("takes a press as a move to that point", () => {
    const { pad, onChange } = setup();
    press(pad, "pointerdown", 75, 25);
    // Three quarters across is +20u; a quarter down is −20u.
    expect(onChange).toHaveBeenCalledWith(20, -20);
  });

  it("keeps following the pointer while it is down", () => {
    const { pad, onChange } = setup();
    press(pad, "pointerdown", 50, 50);
    press(pad, "pointermove", 100, 100);
    expect(onChange).toHaveBeenLastCalledWith(40, 40);
  });

  it("does not follow a pointer that never pressed it", () => {
    const { pad, onChange } = setup();
    press(pad, "pointermove", 90, 10);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops following once the pointer is released", () => {
    const { pad, onChange } = setup();
    press(pad, "pointerdown", 50, 50);
    press(pad, "pointerup", 50, 50);
    onChange.mockClear();
    press(pad, "pointermove", 0, 0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps a drag that leaves the pad to its edges", () => {
    const { pad, onChange } = setup();
    press(pad, "pointerdown", 50, 50);
    press(pad, "pointermove", -400, 400);
    expect(onChange).toHaveBeenLastCalledWith(-40, 40);
  });

  it("lands on whole units, not on wherever the pixel fell", () => {
    const { pad, onChange } = setup();
    press(pad, "pointerdown", 51, 51);
    const [x, y] = onChange.mock.calls.at(-1) as [number, number];
    expect(Number.isInteger(x)).toBe(true);
    expect(Number.isInteger(y)).toBe(true);
  });

  it("offers a real slider per axis for anyone not using a pointer", () => {
    // A pad is a pointer affordance and nothing else; the two sliders are what
    // keyboard and screen-reader users actually operate, which is why they are
    // hidden rather than absent.
    const { onChange } = setup(4, 4);
    const xSlider = screen.getByLabelText("Ojo izq. · X");
    expect(xSlider.getAttribute("type")).toBe("range");
    fireEvent.change(xSlider, { target: { value: "12" } });
    expect(onChange).toHaveBeenLastCalledWith(12, 4);

    fireEvent.change(screen.getByLabelText("Ojo izq. · Y"), {
      target: { value: "-6" },
    });
    expect(onChange).toHaveBeenLastCalledWith(4, -6);
  });

  it("states the span it covers, so the pad is not a mystery box", () => {
    setup();
    expect(screen.getByText("±40 u")).toBeTruthy();
  });
});
