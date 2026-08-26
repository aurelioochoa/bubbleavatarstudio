// Shared inspector chrome (docs/05 §2, §3): the modal the mood editor opens in
// (FR-4.4 — cancelable, and over the stage it is judged against) and the menu
// the rail, moods and loops hang their per-item actions from (FR-1.2, FR-4.2,
// FR-5.2).
// Both were private to one caller before; these cases pin the behaviour that
// makes them safe to share.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu, MenuItem, Modal } from "./ui";

beforeEach(cleanup);

describe("Modal", () => {
  it("is a named modal dialog", () => {
    render(
      <Modal title="Editor" closeLabel="Cerrar" onClose={() => {}}>
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Editor" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("takes focus on open so the keyboard lands inside it", () => {
    render(
      <Modal title="Editor" closeLabel="Cerrar" onClose={() => {}}>
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Editor" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Editor" closeLabel="Cerrar" onClose={onClose}>
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on the backdrop but not on its own content", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Editor" closeLabel="Cerrar" onClose={onClose}>
        <button type="button">inside</button>
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "inside" }));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the dialog (docs/05 §3)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">outside</button>
        <Modal title="Editor" closeLabel="Cerrar" onClose={() => {}}>
          <button type="button">first</button>
          <button type="button">last</button>
        </Modal>
      </>,
    );
    const order = ["Cerrar", "first", "last"];
    for (const name of order) {
      await user.tab();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name }),
      );
    }
    // Wrapping rather than escaping to the button behind the dialog.
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cerrar" }),
    );
  });
});

describe("Menu", () => {
  it("is a named menu of menuitems", () => {
    render(
      <Menu label="Acciones" onClose={() => {}}>
        <MenuItem label="Duplicar" onClick={() => {}} />
      </Menu>,
    );
    const menu = screen.getByRole("menu", { name: "Acciones" });
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(menu.textContent).toContain("Duplicar");
  });

  it("closes on Escape and on a pointer press outside it", () => {
    const onClose = vi.fn();
    render(
      <Menu label="Acciones" onClose={onClose}>
        <MenuItem label="Duplicar" onClick={() => {}} />
      </Menu>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("leaves a press inside it alone", () => {
    const onClose = vi.fn();
    render(
      <Menu label="Acciones" onClose={onClose}>
        <MenuItem label="Duplicar" onClick={() => {}} />
      </Menu>,
    );
    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not fire a disabled item", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Menu label="Acciones" onClose={() => {}}>
        <MenuItem label="Subir" onClick={onClick} disabled />
      </Menu>,
    );
    await user.click(screen.getByRole("menuitem", { name: "Subir" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
