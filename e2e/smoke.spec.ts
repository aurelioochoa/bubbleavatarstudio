// Visual smoke per docs/08 F5: boot, panels, playing loop.
// Screenshots are archived artifacts under docs/screenshots/ — not goldens;
// the stage runs ambient idle motion, so pixels differ between runs.
import { expect, test } from "@playwright/test";

const SHOTS = "docs/screenshots";

test("boot: studio shell renders with a starter bubble", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bubble Avatar Studio" }),
  ).toBeVisible();
  await expect(page.getByLabel("bubble stage")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Aspecto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Nueva burbuja" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/boot.png` });
});

test("panels: look, moods, loops and share tabs expose their controls", async ({
  page,
}) => {
  await page.goto("/");

  // Look is the default tab.
  await expect(page.getByText("Perspectiva")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/panel-look.png` });

  await page.getByRole("tab", { name: "Ánimos" }).click();
  await expect(
    page.getByRole("button", { name: "Nuevo ánimo" }),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/panel-moods.png` });

  await page.getByRole("tab", { name: "Ciclos" }).click();
  await expect(page.getByRole("button", { name: "+ Nuevo ciclo" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/panel-loops.png` });

  await page.getByRole("tab", { name: "Compartir" }).click();
  await expect(page.getByRole("heading", { name: "Photo Mode" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: ".bubble-avatar.json" }),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/panel-share.png` });
});

test("playing loop: transport toggles playback and the stage animates", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Ciclos" }).click();

  const play = page.getByRole("button", { name: "Reproducir" });
  await expect(play).toBeVisible();
  await play.click();
  await expect(
    page.getByRole("button", { name: "Pausar" }),
  ).toBeVisible();

  // Let the StageEngine advance a few frames so the capture shows motion.
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/playing-loop.png` });
});
