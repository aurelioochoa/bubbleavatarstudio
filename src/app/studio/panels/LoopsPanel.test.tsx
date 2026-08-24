// Loops panel: rename (FR-5.2), the blink card (FR-5.5), the summary a loop
// shows of itself (FR-5.8) and the grouped loop list (docs/05 §2).
//
// Fields are controlled by props and dispatch is a spy that never updates
// them, so each case commits a whole value in one change event.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoopsPanel } from "./LoopsPanel";
import { createDefaultDocument } from "../../../domain/document/create";
import { effectiveKit } from "../../../domain/document/mutate";
import { translator } from "../../i18n";
import type { Kit } from "../../../domain/document/types";

beforeEach(cleanup);

function setup(mutate: (k: Kit) => Kit = (k) => k) {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const kit = mutate(structuredClone(effectiveKit(bubble, doc)));
  const dispatch = vi.fn();
  const first = kit.loops[0];
  if (!first) throw new Error("fixture missing loop");
  render(
    <LoopsPanel
      kit={kit}
      dispatch={dispatch}
      t={translator("es")}
      selectedLoopId={first.id}
      onSelectLoop={() => {}}
    />,
  );
  return { kit, dispatch, loop: first };
}

describe("loop rename (FR-5.2)", () => {
  it("commits the typed name to the selected loop", () => {
    const { dispatch, loop } = setup();
    fireEvent.change(screen.getByLabelText("Nombre del ciclo"), {
      target: { value: "saludo" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { name: "saludo" },
    });
  });

  it("ignores a blank name rather than committing an invalid one", () => {
    const { dispatch } = setup();
    fireEvent.change(screen.getByLabelText("Nombre del ciclo"), {
      target: { value: "   " },
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("blink card (FR-5.5)", () => {
  it("toggles blinking on the selected loop", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = setup();
    await user.click(screen.getByLabelText("Parpadeo"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { blink: { ...loop.blink, enabled: !loop.blink.enabled } },
    });
  });

  it("commits a blink duration without touching the intervals", () => {
    const { dispatch, loop } = setup();
    fireEvent.change(screen.getByLabelText("Duración del parpadeo (ms)"), {
      target: { value: "220" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { blink: { ...loop.blink, durationMs: 220 } },
    });
  });
});

describe("loop summary (FR-5.8)", () => {
  it("reports the step count, each hold and the whole cycle", () => {
    setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.mode = "loop";
      l.steps = [
        { id: "s1", moodId: l.steps[0]?.moodId ?? "", holdMs: 400, transition: "ease" },
        { id: "s2", moodId: l.steps[0]?.moodId ?? "", holdMs: 1600, transition: "ease" },
      ];
      return k;
    });
    const summary = screen.getByTestId("loop-summary").textContent ?? "";
    expect(summary).toContain("2 pasos");
    expect(summary).toContain("0.4 · 1.6 s");
    expect(summary).toContain("2.0 s");
  });

  it("counts the leg a pingpong cycle plays back", () => {
    setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.mode = "pingpong";
      l.steps = [
        { id: "s1", moodId: l.steps[0]?.moodId ?? "", holdMs: 400, transition: "ease" },
        { id: "s2", moodId: l.steps[0]?.moodId ?? "", holdMs: 1600, transition: "ease" },
      ];
      return k;
    });
    // 0.4 + 1.6 + 0.4 back = 2.4s, not the 2.0s the authored steps sum to.
    expect(screen.getByTestId("loop-summary").textContent).toContain("2.4 s");
  });

  it("states the blink interval and duration, and says so when it is off", () => {
    setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.blink = {
        enabled: true,
        minIntervalMs: 2000,
        maxIntervalMs: 5000,
        durationMs: 140,
      };
      return k;
    });
    const summary = screen.getByTestId("loop-summary").textContent ?? "";
    expect(summary).toContain("2.0–5.0 s");
    expect(summary).toContain("140 ms");

    cleanup();
    setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.blink = { ...l.blink, enabled: false };
      return k;
    });
    expect(screen.getByTestId("loop-summary").textContent).toContain(
      "Sin parpadeo",
    );
  });
});

describe("grouped loop list (docs/05 §2)", () => {
  it("groups the chips under a translated heading per group", () => {
    setup();
    // The starter catalogue ships both groups (FR-5.7).
    expect(screen.getByRole("group", { name: "Vida" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Reacciones" })).toBeTruthy();
  });

  it("moves a loop between groups", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = setup();
    const target = loop.group === "life" ? "Reacciones" : "Vida";
    await user.click(screen.getByRole("radio", { name: target }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { group: loop.group === "life" ? "reaction" : "life" },
    });
  });

  it("keeps a group the starter catalogue never names selectable", () => {
    setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.group = "cinemática";
      return k;
    });
    expect(screen.getByRole("radio", { name: "cinemática" })).toBeTruthy();
  });
});
