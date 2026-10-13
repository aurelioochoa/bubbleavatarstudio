import { expect, test } from "@playwright/test";

for (const axis of ["x", "y"] as const) {
  test(`drag: ${axis.toUpperCase()} continues through the back without mirroring`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Rotar cabeza" }).click();
    const pad = page.getByRole("group", { name: "Rotar cabeza" });
    await pad
      .getByRole("slider", { name: `Rotación ${axis.toUpperCase()}` })
      .fill("170");

    const stage = page.getByLabel("bubble stage");
    const box = await stage.boundingBox();
    if (!box) throw new Error("stage has no bounds");
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(
      start.x + (axis === "y" ? 30 : 0),
      start.y - (axis === "x" ? 30 : 0),
      { steps: 6 },
    );
    await expect(page.getByTestId(`readout-${axis}`)).toHaveText("179°");
    for (const side of ["left", "right"]) {
      await expect(stage.locator(`#eye-${side}`)).toHaveAttribute(
        "opacity",
        "0",
      );
    }
    const before = await stage.locator("#eye-left").getAttribute("transform");

    // Ten more pixels cross the wrapped boundary: 179 -> -178 degrees.
    await page.mouse.move(
      start.x + (axis === "y" ? 40 : 0),
      start.y - (axis === "x" ? 40 : 0),
      { steps: 2 },
    );
    await expect(page.getByTestId(`readout-${axis}`)).toHaveText("-178°");
    for (const side of ["left", "right"]) {
      await expect(stage.locator(`#eye-${side}`)).toHaveAttribute(
        "opacity",
        "0",
      );
    }
    const after = await stage.locator("#eye-left").getAttribute("transform");
    const anchor = (transform: string | null) => {
      const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform ?? "");
      if (!match) throw new Error("eye has no projected anchor");
      return { x: Number(match[1]), y: Number(match[2]) };
    };
    const a = anchor(before);
    const b = anchor(after);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(5);
    await page.screenshot({
      path: testInfo.outputPath("back-during-drag.png"),
    });
    await page.mouse.up();

    // Returning to the front reveals the eyes again.
    await pad
      .getByRole("slider", { name: `Rotación ${axis.toUpperCase()}` })
      .fill("0");
    for (const side of ["left", "right"]) {
      await expect(stage.locator(`#eye-${side}`)).not.toHaveAttribute(
        "opacity",
        "0",
      );
    }
  });
}
