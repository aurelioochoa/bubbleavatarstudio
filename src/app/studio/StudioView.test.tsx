// FR-9 studio shell smoke test (jsdom). rAF is stubbed; the engine is
// exercised in unit tests, here we verify the UI tree and interactions.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioView } from "./StudioView";

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  globalThis.localStorage?.clear();
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

describe("StudioView", () => {
  it("renders shell with tabs and default bubble", () => {
    render(<StudioView />);
    expect(
      screen.getByRole("heading", { name: "Bubble Avatar Studio" }),
    ).toBeTruthy();
    for (const tab of ["Aspecto", "Ánimos", "Ciclos", "Compartir"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    }
    expect(screen.getByText("Bubble")).toBeTruthy();
  });

  it("switches locale es→en", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.selectOptions(screen.getByLabelText("locale"), "en");
    expect(screen.getByRole("tab", { name: "Look" })).toBeTruthy();
  });

  it("adds a bubble from the rail", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "+ Nueva burbuja" }));
    expect(screen.getAllByText("Bubble")).toHaveLength(2);
  });

  it("flushes autosave on pagehide so quick reloads keep edits (FR-9.2)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "+ Nueva burbuja" }));
    globalThis.dispatchEvent(new Event("pagehide"));
    const raw = globalThis.localStorage.getItem(
      "bubble-studio.document.v1",
    );
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).bubbles).toHaveLength(2);
  });

  it("asks for confirmation before deleting a bubble (FR-1.5)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "+ Nueva burbuja" }));
    vi.stubGlobal("confirm", vi.fn(() => false));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getAllByText("Bubble")).toHaveLength(2);
    vi.stubGlobal("confirm", vi.fn(() => true));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getAllByText("Bubble")).toHaveLength(1);
  });

  it("Look tab shows surface controls", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Aspecto" }));
    expect(screen.getByText("Redondez")).toBeTruthy();
  });

  it("Moods tab lists starter kit moods and supports cancelable edits", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    expect(screen.getByRole("button", { name: "happy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("Loops tab shows starter loops and play button", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ciclos" }));
    expect(screen.getByRole("button", { name: "idle" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
  });

  it("deleting a referenced mood surfaces the E_REF error alert", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    await user.click(screen.getByRole("button", { name: "happy" }));
    const buttons = screen.getAllByRole("button", { name: "Eliminar" });
    const del = buttons[buttons.length - 1];
    if (!del) throw new Error("delete button missing");
    await user.click(del);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se puede eliminar");
  });
});
