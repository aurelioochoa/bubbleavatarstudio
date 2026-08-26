// Visual smoke in a real browser, for the questions jsdom cannot decide:
// the shell boots and lays out (FR-9.1), the four panels expose their controls
// (FR-2, FR-3, FR-4, FR-5, FR-10), the transport plays and the playhead
// actually moves (FR-6.2, FR-6.6, FR-6.7), the mood editor traps focus over
// the stage (FR-4.4), the gizmo poses the head and survives a frame (FR-8.1),
// the wireframe reaches the SVG (FR-8.4), Share previews the snapshot
// (FR-10.1), a label scrubs (FR-9.5), a card reorders by drag (FR-4.2), and
// the shell holds together at 1024x720.
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

  // The render takes the stage's short side up to its own cap (docs/05 §1).
  // Measured here because the cap is a CSS `min()` of a percentage and a rem —
  // neither is a number until a browser lays the column out.
  const fills = await page.evaluate(() => {
    const stage = document.querySelector('[aria-label="bubble stage"]');
    const svg = stage?.querySelector("svg");
    if (!stage || !svg) return null;
    const box = stage.getBoundingClientRect();
    const drawn = svg.getBoundingClientRect();
    const allowed = Math.min(box.width, box.height) * 0.94;
    return {
      drawn: Math.round(drawn.height),
      want: Math.round(Math.min(allowed, 640)),
    };
  });
  expect(fills?.drawn).toBe(fills?.want);

  await expect(page.getByRole("tab", { name: "Aspecto" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nueva burbuja" }),
  ).toBeVisible();
  // Transport lives on the full-width track below all three columns (FR-6.6).
  const track = page.getByRole("region", { name: "Pista" });
  await expect(track.getByRole("button", { name: "Reproducir" })).toBeVisible();
  await expect(page.getByTestId("stage-status")).toContainText("En reposo");
  // FR-6.7: the sequence is on it, one chip per step.
  await expect(track.getByTestId("step-chip").first()).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Nuevo ánimo" })).toBeVisible();
  await shoot(page, "panel-moods");

  await page.getByRole("tab", { name: "Ciclos" }).click();
  await expect(
    page.getByRole("button", { name: "+ Nuevo ciclo" }),
  ).toBeVisible();
  await shoot(page, "panel-loops");

  await page.getByRole("tab", { name: "Compartir" }).click();
  await expect(page.getByRole("button", { name: /Instantánea/ })).toBeVisible();
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
  await expect(page.getByTestId("stage-status")).toContainText("Reproduciendo");

  // Let the StageEngine advance a few frames so the capture shows motion.
  await page.waitForTimeout(600);

  // FR-6.7/FR-11.2: the playhead is written straight to the DOM from the
  // engine's frame loop, so it only moves in a real browser — jsdom can prove
  // the writer runs, not that the frames arrive.
  const playhead = page.getByTestId("playhead");
  await expect(playhead).not.toHaveAttribute("style", /left:\s*0%/);
  await expect(page.getByTestId("track-elapsed")).not.toContainText("0.00 s");
  await shoot(page, "playing-loop");
});

test("rail: the context menu carries rename, reorder and delete", async ({
  page,
}) => {
  await page.goto("/");

  // docs/05 §1 states the rail's width as a number, so measure it where a
  // number can be measured: jsdom has no answer for a Tailwind class.
  const rail = await page.getByLabel("Burbujas").boundingBox();
  expect(rail?.width).toBe(72);
  const thumb = await page
    .getByLabel("Burbujas")
    .locator("li button")
    .first()
    .boundingBox();
  expect(thumb?.width).toBe(56);

  await page.getByRole("button", { name: "Acciones de la burbuja" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: "Duplicar" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Eliminar" })).toBeVisible();
  await shoot(page, "rail-menu");
});

/**
 * The mood grid, scoped away from the bubble rail — which is also a `ul` of
 * `li`s, and would otherwise share every selector here.
 */
const moodCards = (page: import("@playwright/test").Page) =>
  page.getByTestId("mood-card");

test("mood editor: opens over the stage, traps focus and cancels on Esc", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Ánimos" }).click();

  // The card grid renders true mini-previews; the bar at the foot of the
  // column acts on whichever card is in hand (FR-4.8).
  await moodCards(page).first().getByRole("button").first().click();
  await page
    .getByTestId("mood-selection")
    .getByRole("button", { name: "Editar" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // FR-4.4: the modal is scoped to the inspector, so the stage stays visible
  // behind it — the thing the edit is meant to be judged against.
  await expect(page.getByLabel("bubble stage")).toBeVisible();
  await expect(dialog).toBeFocused();
  await shoot(page, "mood-editor");

  // Focus stays inside: Tab from the dialog lands on its own first control.
  await page.keyboard.press("Tab");
  await expect(dialog.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("gizmo: the rotation pad poses the head and survives a frame", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Rotar cabeza" }).click();

  const pad = page.getByRole("group", { name: "Rotar cabeza" });
  await expect(pad).toBeVisible();
  const yaw = pad.getByRole("slider", { name: "Rotación Y" });
  await yaw.fill("35");
  await expect(pad).toContainText("35°");

  // The pad is a sibling of the engine's host, so a rendered frame must not
  // wipe it (FR-11.2). Wait past several frames and re-assert.
  await page.waitForTimeout(400);
  await expect(pad).toBeVisible();
  await shoot(page, "stage-gizmo");

  // One reset, and it lives beside the toggles rather than inside the pad.
  await page.getByRole("button", { name: "Restablecer" }).click();
  await expect(pad).toContainText("0°");
});

test("guide: the projection overlay is opt-in and reaches the SVG", async ({
  page,
}) => {
  await page.goto("/");
  const stage = page.getByLabel("bubble stage");
  await expect(stage.locator("#guide")).toHaveCount(0);

  await page.getByRole("button", { name: "Guía de proyección" }).click();
  await expect(stage.locator("#guide")).toHaveCount(1);
  await shoot(page, "stage-guide");

  await page.getByRole("button", { name: "Guía de proyección" }).click();
  await expect(stage.locator("#guide")).toHaveCount(0);
});

test("share: the panel previews the character and lists the loops it ships", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Compartir" }).click();

  await expect(page.getByRole("img", { name: "Vista previa" })).toBeVisible();
  await expect(page.getByText("Ciclos incluidos")).toBeVisible();
  await shoot(page, "share-preview");
});

test("drag-to-scrub: dragging a field label changes its value (FR-9.5)", async ({
  page,
}) => {
  await page.goto("/");
  // Exact: the eye section carries an "Ancho del ojo" of its own.
  const width = page.getByRole("spinbutton", { name: "Ancho", exact: true });
  const before = Number(await width.inputValue());

  const label = page.getByTestId("scrub-Ancho");
  const box = await label.boundingBox();
  if (!box) throw new Error("no scrub handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // 4px of travel per step (fields.tsx), so 40px is a visible move either way.
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();

  await expect(width).not.toHaveValue(String(before));
  expect(Number(await width.inputValue())).toBeGreaterThan(before);
});

test("drag-to-reorder: a mood card dropped on another moves it (FR-4.2)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Ánimos" }).click();

  const names = () => moodCards(page).locator("button").allInnerTexts();
  const before = await names();
  const [first, , third] = before;
  if (!first || !third) throw new Error("fixture needs three moods");

  await moodCards(page).nth(0).dragTo(moodCards(page).nth(2));

  const after = await names();
  expect(after).not.toEqual(before);
  expect(after.indexOf(first)).toBeGreaterThan(after.indexOf(third));
});

/**
 * The track crosses the whole width and its first row is a lot of controls in
 * a line, so a narrow window is where it would break first. 1024×720 is the
 * smallest the studio claims to work at (docs/05 §1: a 72px rail and a 360px
 * inspector leave ~590px of stage).
 */
test("narrow window: the shell holds together at 1024×720", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto("/");

  const overflows = await page.evaluate(() => {
    const d = document.documentElement;
    return {
      page: d.scrollWidth > d.clientWidth + 1,
      // Row one of the track: play/pause through to the fold toggle.
      row: (() => {
        const r = document.querySelector('[aria-label="Pista"] > div');
        return r ? r.scrollWidth > r.clientWidth + 1 : true;
      })(),
      inspector: (() => {
        const a = document.querySelector("aside");
        return a ? a.scrollWidth > a.clientWidth + 1 : true;
      })(),
    };
  });

  expect(overflows).toEqual({ page: false, row: false, inspector: false });
  // And the stage still has room to be a stage.
  const stage = await page.getByLabel("bubble stage").boundingBox();
  expect(stage?.width ?? 0).toBeGreaterThan(500);
  await shoot(page, "narrow-1024");
});
