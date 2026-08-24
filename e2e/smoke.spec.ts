// Visual smoke per docs/08 F5: boot, panels, playing loop.
// Screenshots are archived artifacts under docs/screenshots/ — not goldens;
// the stage runs ambient idle motion, so pixels differ between runs.
import { expect, test } from "@playwright/test";

const SHOTS = "docs/screenshots";

/**
 * Panel transitions run for 150ms (docs/05 §4). Capturing straight after a
 * click archives a frame mid-fade, where the tab strip still highlights the
 * previous tab — settle first so the screenshots show a resting UI.
 */
async function shoot(page: import("@playwright/test").Page, name: string) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test("boot: studio shell renders with a starter bubble", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bubble Avatar Studio" }),
  ).toBeVisible();
  await expect(page.getByLabel("bubble stage")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Aspecto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva burbuja" })).toBeVisible();
  // Transport lives on the stage dock now (docs/05 §1).
  await expect(page.getByRole("button", { name: "Reproducir" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("En reposo");
  await shoot(page, "boot");
});

test("panels: look, moods, loops and share tabs expose their controls", async ({
  page,
}) => {
  await page.goto("/");

  // Look is the default tab.
  await expect(page.getByText("Perspectiva")).toBeVisible();
  await shoot(page, "panel-look");

  await page.getByRole("tab", { name: "Ánimos" }).click();
  await expect(
    page.getByRole("button", { name: "Nuevo ánimo" }),
  ).toBeVisible();
  await shoot(page, "panel-moods");

  await page.getByRole("tab", { name: "Ciclos" }).click();
  await expect(page.getByRole("button", { name: "+ Nuevo ciclo" })).toBeVisible();
  await shoot(page, "panel-loops");

  await page.getByRole("tab", { name: "Compartir" }).click();
  await expect(page.getByRole("button", { name: /Photo Mode/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: ".bubble-avatar.json" }),
  ).toBeVisible();
  await shoot(page, "panel-share");
});

test("playing loop: transport toggles playback and the stage animates", async ({
  page,
}) => {
  await page.goto("/");

  const play = page.getByRole("button", { name: "Reproducir" });
  await expect(play).toBeVisible();
  await play.click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Reproduciendo");

  // Let the StageEngine advance a few frames so the capture shows motion.
  await page.waitForTimeout(600);
  await shoot(page, "playing-loop");
});

test("rail: the context menu carries rename, reorder and delete", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Acciones de la burbuja" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: "Duplicar" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Eliminar" })).toBeVisible();
  await shoot(page, "rail-menu");
});
