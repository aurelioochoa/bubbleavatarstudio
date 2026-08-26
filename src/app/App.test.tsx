// F0 smoke: the app shell boots at all (FR-9.1, docs/08 F0 AC).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("App shell", () => {
  it("renders the boot placeholder", () => {
    render(<App />);
    expect(screen.getByText(/Bubble Avatar Studio/i)).toBeTruthy();
  });
});
