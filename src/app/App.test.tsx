// F0 smoke: app shell boots (docs/08 F0 AC)
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("App shell", () => {
  it("renders the boot placeholder", () => {
    render(<App />);
    expect(screen.getByText(/Bubble Avatar Studio/i)).toBeTruthy();
  });
});
