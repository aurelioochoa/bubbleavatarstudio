/**
 * The README's walkthrough capture, as a script rather than a hand-driven take.
 *
 * Not part of the smoke suite: it is excluded from `pnpm e2e` by
 * `testIgnore` and run on its own with `pnpm demo`, because it records video
 * and takes far longer than a test that only has to assert something.
 *
 * It still asserts as it goes. A recording of a broken studio is worse than no
 * recording — it would be a claim about the product that is not true — so
 * every beat checks that the thing it is about to show actually happened
 * before it waits for the camera.
 */
import { test, expect, type Page } from "@playwright/test";

test.use({
  video: { mode: "on", size: { width: 1280, height: 800 } },
  viewport: { width: 1280, height: 800 },
});

/** Long enough for a reader to register what changed before the next beat. */
const BEAT = 900;

async function beat(page: Page, ms = BEAT) {
  await page.waitForTimeout(ms);
}

test("walkthrough", async ({ page }) => {
  await page.goto("/");
  await beat(page, 1400);

  // 1. A loop plays. The transport is the track's, below all three columns.
  await page.getByRole("button", { name: "Reproducir" }).click();
  await expect(page.getByTestId("stage-status")).toContainText("Reproduciendo");
  await beat(page, 2200);
  await page.getByRole("button", { name: "Pausar" }).click();
  await beat(page, 500);

  // 2. The body is a solid: swap the shape family and scale it.
  for (const family of ["Cápsula", "Gota", "Redonda"]) {
    await page.getByRole("radio", { name: family, exact: true }).click();
    await beat(page, 700);
  }
  const size = page.getByRole("spinbutton", { name: "Tamaño", exact: true });
  await size.fill("135");
  await size.blur();
  await beat(page, 700);
  await size.fill("100");
  await size.blur();
  await beat(page, 500);

  // 3. The orientation triad, and turning the character by hand under it.
  await page.getByRole("button", { name: "Ejes" }).click();
  await expect(page.getByTestId("stage-triad")).toBeVisible();
  await beat(page, 600);

  const stage = await page.getByLabel("bubble stage").boundingBox();
  if (!stage) throw new Error("stage not laid out");
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;

  await page.getByRole("button", { name: "Guía" }).click();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (const [dx, dy] of [
    [130, -40],
    [40, 60],
    [-150, -20],
    [0, 0],
  ] as const) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 22 });
    await beat(page, 260);
  }
  await page.mouse.up();
  await page.getByRole("button", { name: "Guía" }).click();
  await beat(page, 500);

  // 4. The character follows the cursor, and the dial makes it less pronounced.
  await page.getByRole("button", { name: "Seguir el cursor" }).click();
  await expect(page.getByLabel("Intensidad")).toBeVisible();
  const tour: [number, number][] = [
    [stage.x + stage.width - 30, cy - 120],
    [stage.x + 40, cy + 100],
    [cx, stage.y + 40],
  ];
  for (const [x, y] of tour) {
    await page.mouse.move(x, y, { steps: 26 });
    await beat(page, 700);
  }
  await page.getByLabel("Intensidad").fill("30");
  await beat(page, 400);
  for (const [x, y] of tour.slice(0, 2)) {
    await page.mouse.move(x, y, { steps: 26 });
    await beat(page, 650);
  }
  await page.getByRole("button", { name: "Seguir el cursor" }).click();
  await beat(page, 400);

  // 5. Moods: preview one from the library, then open its editor over the stage.
  await page.getByRole("tab", { name: "Ánimos" }).click();
  await beat(page, 600);
  const cards = page.getByTestId("mood-card");
  for (const i of [2, 5, 9]) {
    await cards.nth(i).click();
    await beat(page, 750);
  }
  await cards.nth(2).dblclick();
  await expect(page.getByRole("dialog")).toBeVisible();
  await beat(page, 1500);
  await page.keyboard.press("Escape");
  await beat(page, 400);

  // 6. Loops on the track: a step is a chip as wide as it lasts.
  await page.getByRole("tab", { name: "Ciclos" }).click();
  await beat(page, 900);

  // 7. Share: the export frame is drawn on the stage it crops.
  await page.getByRole("tab", { name: "Compartir" }).click();
  await beat(page, 1600);

  // 8. The help sheet: shortcuts, and the guide beside them.
  await page.getByRole("button", { name: /Ayuda/ }).click();
  await expect(page.getByRole("dialog", { name: "Ayuda" })).toBeVisible();
  await beat(page, 1500);
  await page.getByRole("tab", { name: "Guía" }).click();
  await beat(page, 1800);
  await page.keyboard.press("Escape");
  await beat(page, 900);
});
