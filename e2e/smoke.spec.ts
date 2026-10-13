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

/**
 * The stage's overlays, checked for the two ways they go wrong in a narrow
 * column: spilling past its edges, and sharing pixels with each other. The
 * second is what reads as clipping — the orientation readout sat under the
 * status pill and lost its first axis, twice, at two different widths.
 *
 * Measured against the stage column rather than the window, because that is
 * what the overlays are actually laid out in: a drawer opening beside the
 * stage narrows it without the viewport changing at all.
 */
async function stageOverlays(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const host = document.querySelector('[aria-label="bubble stage"]');
    if (!host) return null;
    const stage = host.parentElement;
    if (!stage) return null;
    const room = stage.getBoundingClientRect();
    const boxes = [...stage.children]
      .filter((el) => el !== host)
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.width < room.width - 2);

    const over = boxes.filter(
      (b) => b.left < room.left - 1 || b.right > room.right + 1,
    ).length;
    let overlapping = 0;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (
          a.left < b.right - 1 &&
          b.left < a.right - 1 &&
          a.top < b.bottom - 1 &&
          b.top < a.bottom - 1
        )
          overlapping++;
      }
    return { over, overlapping };
  });
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

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`guide: complete, clipped projection overlay at ${String(viewport.width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const stage = page.getByLabel("bubble stage");
    const toggle = page.getByRole("button", { name: "Guía de proyección" });
    await expect(stage.locator("#guide")).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(stage.locator("#guide")).toHaveCount(1);
    await expect(stage.locator('[data-guide="front"] > path')).toHaveCount(11);
    await expect(stage.locator('[data-guide="back"]')).toHaveAttribute(
      "stroke-dasharray",
      "3 4",
    );

    const layering = await stage.evaluate((host) => {
      const guide = host.querySelector("#guide");
      const eye = host.querySelector("#eye-left");
      const body = host.querySelector("#body");
      const clipped = guide?.querySelector("[clip-path]");
      const id = clipped?.getAttribute("clip-path")?.slice(5, -1);
      const outline = id ? host.querySelector(`[id="${id}"] path`) : null;
      return {
        behindEyes:
          !!guide &&
          !!eye &&
          !!(
            guide.compareDocumentPosition(eye) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
        followsBody:
          outline?.getAttribute("d") === body?.getAttribute("d") &&
          outline?.getAttribute("transform") ===
            body?.getAttribute("transform"),
        steadyStrokes: [
          ...(guide?.querySelectorAll("[data-guide] path") ?? []),
        ].every(
          (path) => path.getAttribute("vector-effect") === "non-scaling-stroke",
        ),
        nonInteractive: guide?.getAttribute("pointer-events") === "none",
      };
    });
    expect(layering).toEqual({
      behindEyes: true,
      followsBody: true,
      steadyStrokes: true,
      nonInteractive: true,
    });
    expect(await stageOverlays(page)).toEqual({ over: 0, overlapping: 0 });
    await shoot(
      page,
      viewport.width === 1280 ? "stage-guide" : "stage-guide-phone",
    );

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(stage.locator("#guide")).toHaveCount(0);
  });
}

test("share: the panel previews the character and lists the loops it ships", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Compartir" }).click();

  await expect(page.getByRole("img", { name: "Vista previa" })).toBeVisible();
  await expect(page.getByText("Ciclos incluidos")).toBeVisible();
  await shoot(page, "share-preview");

  // The frame is the render's own box, so a zoom scales it too — and a box
  // twice the column's size has to be clipped by the column rather than drawn
  // over the header and the inspector.
  const zoom = page.getByLabel("Zoom (deslizador)");
  await zoom.fill("200");
  await zoom.dispatchEvent("change");
  // Asserted on the column rather than on the frame, because neither of the
  // obvious probes can see a clip: an overflowing box still reports its whole
  // rect to `getBoundingClientRect`, and the frame is `pointer-events-none`,
  // so `elementFromPoint` never returns it either. What can be asked is
  // whether the column clips at all — and unclipped, a frame at 200% draws its
  // dashed edges across the header and the inspector.
  const clipped = await page.evaluate(() => {
    const main = document.querySelector("main");
    const frame = document.querySelector('[data-testid="export-frame"]');
    if (!main || !frame) return null;
    const box = main.getBoundingClientRect();
    const drawn = frame.getBoundingClientRect();
    return {
      overflows: drawn.width > box.width + 1,
      overflow: getComputedStyle(main).overflowX,
    };
  });
  expect(clipped).toEqual({ overflows: true, overflow: "hidden" });
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

/**
 * A modal dim that stops short of the window edge is a layout question, which
 * is why it lives here: `Modal` is `absolute inset-0`, so it covers its
 * nearest *positioned* ancestor rather than the screen (docs/05 §2 — that is
 * deliberate, so the mood editor dims the inspector and leaves the stage to be
 * judged against). The help sheet is the one modal that is not anchored to a
 * panel, and a sizing wrapper around it once made its backdrop cover only the
 * dialog's own box, leaving the rest of the studio undimmed and clickable.
 */
test("help sheet: the dim covers the whole window (FR-9.7)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Ayuda/ }).click();
  await expect(page.getByRole("dialog", { name: "Ayuda" })).toBeVisible();

  const viewport = page.viewportSize();
  const backdrop = await page.getByTestId("modal-backdrop").boundingBox();
  expect(backdrop).not.toBeNull();
  if (!backdrop || !viewport) return;

  // Flush to every edge, not merely large.
  expect(backdrop.x).toBeLessThanOrEqual(0);
  expect(backdrop.y).toBeLessThanOrEqual(0);
  expect(backdrop.x + backdrop.width).toBeGreaterThanOrEqual(viewport.width);
  expect(backdrop.y + backdrop.height).toBeGreaterThanOrEqual(viewport.height);

  // And it is the thing a click lands on out there, so the studio behind the
  // sheet cannot be operated while the sheet is open.
  const corner = await page.evaluate(() => {
    const el = document.elementFromPoint(12, window.innerHeight - 12);
    return el?.getAttribute("data-testid") ?? el?.tagName ?? null;
  });
  expect(corner).toBe("modal-backdrop");
  await shoot(page, "help-sheet");
});

/**
 * FR-8.6: the character follows the cursor.
 *
 * The arithmetic is tested in node and the wiring in jsdom, but neither can
 * answer this one: jsdom lays nothing out, so the stage box the cursor is
 * measured against is 0×0 there and the aim is always dead centre. Whether a
 * real pointer over a real box turns a real head is a browser question.
 */
test("follow: the character turns toward the cursor and stops at its limit", async ({
  page,
}) => {
  await page.goto("/");
  const yaw = page.getByTestId("readout-y");
  await expect(yaw).toHaveText("0°");

  await page.getByRole("button", { name: "Seguir el cursor" }).click();

  // Scoped to the stage: every mood thumbnail in the inspector is the same
  // character, so the page carries a great many eyes with this id.
  const eye = page.getByLabel("bubble stage").locator("#eye-left").first();
  const eyeX = async () =>
    Number(
      /translate\((-?[\d.]+)/.exec(
        (await eye.getAttribute("transform")) ?? "",
      )?.[1] ?? "0",
    );
  const restingEyeX = await eyeX();

  const stage = await page.getByLabel("bubble stage").boundingBox();
  if (!stage) throw new Error("stage not laid out");
  const midY = stage.y + stage.height / 2;

  // Right of centre: the character should turn that way, and settle.
  await page.mouse.move(stage.x + stage.width - 4, midY);
  await expect
    .poll(async () => Number((await yaw.textContent())?.replace("°", "")), {
      timeout: 4000,
    })
    .toBeGreaterThan(10);

  const settledRight = Number((await yaw.textContent())?.replace("°", ""));
  // It eases toward a bounded aim rather than tracking without limit
  // (FOLLOW_LIMITS.yaw in Stage.tsx).
  expect(settledRight).toBeLessThanOrEqual(46);

  // And the eyes went with it — further than the turn alone could carry them.
  // Measured at this viewport: the head turn moves this eye about 32 units and
  // the gaze adds about 13 on top, so the threshold sits between the two and
  // fails if the eyes stop tracking, which a bare "it moved" would not.
  expect(await eyeX()).toBeGreaterThan(restingEyeX + 38);

  // Left of centre: it comes back the other way.
  await page.mouse.move(stage.x + 4, midY);
  await expect
    .poll(async () => Number((await yaw.textContent())?.replace("°", "")), {
      timeout: 4000,
    })
    .toBeLessThan(-10);

  // And a drag takes it back from the cursor (FR-8.1).
  await page.mouse.move(stage.x + stage.width / 2, midY);
  await page.mouse.down();
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Seguir el cursor" }),
  ).toHaveAttribute("aria-pressed", "false");
  await shoot(page, "stage-follow");
});

/**
 * FR-8.7 / FR-8.6: the triad's colours and the strength dial.
 *
 * Both are browser questions. The triad's axis colours are written as
 * `var(--color-axis-*)` into an SVG set through `innerHTML`, and whether a
 * custom property resolves across that boundary is not something jsdom can
 * answer — it reports the literal string either way. And the strength dial
 * only shows its work as a difference in how far a real pointer turns a head.
 */
test("triad and strength: axis colours resolve, and strength scales the turn", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ejes" }).click();

  const stroke = await page.evaluate(() => {
    const line = document.querySelector('[data-testid="stage-triad"] line');
    return line ? getComputedStyle(line).stroke : null;
  });
  // A var() that failed to resolve computes to none/empty, never to a colour.
  expect(stroke).toMatch(/^rgb\(/);

  await page.getByRole("button", { name: "Seguir el cursor" }).click();
  const stage = await page.getByLabel("bubble stage").boundingBox();
  if (!stage) throw new Error("stage not laid out");
  const edge = stage.x + stage.width - 6;
  const midY = stage.y + stage.height / 2;
  const yaw = async () =>
    Math.abs(
      Number(
        (await page.getByTestId("readout-y").textContent())?.replace("°", ""),
      ),
    );

  await page.mouse.move(edge, midY);
  await expect.poll(yaw, { timeout: 4000 }).toBeGreaterThan(20);
  const atFull = await yaw();

  await page.getByLabel("Intensidad").fill("20");
  // Nudge, so the aim is recomputed against the new strength.
  await page.mouse.move(edge - 1, midY);
  await expect.poll(yaw, { timeout: 4000 }).toBeLessThan(atFull / 2);

  await shoot(page, "stage-triad");
});

/**
 * FR-12.1 / FR-12.2 / FR-12.3: the phone shell. A real viewport is the only
 * place these can be judged — jsdom has no layout, so "nothing overflows" and
 * "the stage still has room" are claims only a browser can settle.
 *
 * 390×844 is an iPhone 14/15 in portrait, the narrowest shape worth naming.
 */
test("phone: the studio folds to a stage and a sheet at 390×844", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // The three columns are gone; the rail runs across and the inspector is a
  // sheet the stage sits above.
  await expect(page.getByTestId("sheet")).toBeVisible();
  await expect(page.locator("nav")).toHaveAttribute(
    "data-orientation",
    "horizontal",
  );
  expect(await page.locator("aside").count()).toBe(0);

  // FR-6.2 is still reachable from every tab.
  await expect(page.getByTestId("phone-transport")).toBeVisible();

  // The header is chrome, not content: three lines of wrapped title is 80px
  // the stage does not get.
  const head = await page.locator("header").boundingBox();
  expect(head?.height ?? 999).toBeLessThanOrEqual(56);

  // The stage's own overlays have to fit the width they are given; the
  // orientation readout and the toggle row used to collide and clip at 390px.
  expect(await stageOverlays(page)).toEqual({ over: 0, overlapping: 0 });

  // FR-12.2: nothing overflows sideways, anywhere.
  const overflows = await page.evaluate(() => {
    const d = document.documentElement;
    const wide = (el: Element) => el.scrollWidth > el.clientWidth + 1;
    return {
      page: wide(d),
      sheet: wide(document.querySelector('[data-testid="sheet"]') as Element),
      rail: wide(document.querySelector("nav") as Element),
    };
  });
  expect(overflows).toEqual({ page: false, sheet: false, rail: false });

  // FR-12.2: at the resting detent the stage keeps 40% of the studio area —
  // the room below the header, which is what the shell actually divides.
  const header = await page.locator("header").boundingBox();
  const stage = await page.getByLabel("bubble stage").boundingBox();
  if (!header || !stage) throw new Error("phone shell not laid out");
  expect(stage.height / (844 - header.height)).toBeGreaterThanOrEqual(0.4);

  await shoot(page, "phone-390");
});

/**
 * FR-12.3: the sheet's tall detent must still leave the character visible —
 * FR-4.4 says a mood is judged against it, and a sheet that could cover the
 * stage would undo on a phone what the scoped mood editor protects on desktop.
 */
test("phone: the sheet never covers the stage, even pulled all the way up", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // The grip is the no-drag path (docs/05 §3): pressing it cycles detents.
  const grip = page.getByRole("button", { name: "Alto del inspector" });
  await grip.click(); // half → tall
  await page.waitForTimeout(250);

  // Measured as area of the character left uncovered, not as "is the stage
  // element still there". A stage box that exists while the render inside it
  // is hidden behind an overlay passes every visibility check and fails the
  // rule this test is named after — which is exactly what happened once.
  const clear = await page.evaluate(() => {
    const svg = document
      .querySelector('[aria-label="bubble stage"]')
      ?.querySelector("svg");
    if (!svg) return 0;
    const box = svg.getBoundingClientRect();
    if (box.height <= 0) return 0;
    // Sample the character's own centre column: whatever the topmost element
    // is there, it should be the render, not something drawn over it.
    const hits = [0.35, 0.5, 0.65].map((f) => {
      const el = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height * f,
      );
      return el?.closest("svg") === svg;
    });
    return hits.filter(Boolean).length;
  });
  expect(clear).toBe(3);

  await shoot(page, "phone-sheet-tall");
});

/**
 * FR-12.1: the tablet shell at 820×1180 (iPad Air, portrait). The claim worth
 * measuring here is the one that motivated the drawer: standing the inspector
 * beside the rail at this width would leave the stage narrower than the
 * character needs, so it opens over the stage and covers at most half of it.
 */
test("tablet: the inspector is a drawer over the stage at 820×1180", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");

  // Closed to begin with: the stage has the column to itself.
  expect(await page.getByRole("tab").count()).toBe(0);
  const full = await page.getByLabel("bubble stage").boundingBox();

  await page.getByRole("button", { name: "Inspector" }).click();
  await expect(page.getByRole("tab", { name: "Aspecto" })).toBeVisible();

  // The drawer takes width from the stage rather than covering it. Measured
  // as overlap with the drawn character, not as the drawer's own width: an
  // overlay half the stage wide covers half a centred character, which passed
  // a width check and hid the face.
  // Measured inside one `evaluate` turn rather than with `boundingBox()`: the
  // engine rewrites the host's `innerHTML` every frame (FR-11.2), so the `svg`
  // Playwright resolves can be detached by the time it is measured, and the
  // box comes back null perhaps one run in three. The boot case reads the same
  // numbers the same way, for the same reason.
  const laid = await page.evaluate(() => {
    const host = document.querySelector('[aria-label="bubble stage"]');
    const drawerEl = document.querySelector("aside");
    const svg = host?.querySelector("svg");
    if (!host || !drawerEl || !svg) return null;
    const stage = host.getBoundingClientRect();
    const drawn = svg.getBoundingClientRect();
    const drawer = drawerEl.getBoundingClientRect();
    return {
      stageWidth: stage.width,
      drawnRight: drawn.x + drawn.width,
      drawerLeft: drawer.x,
    };
  });
  if (!laid || !full) throw new Error("tablet shell not laid out");

  expect(laid.stageWidth).toBeLessThan(full.width);
  expect(laid.drawnRight).toBeLessThanOrEqual(laid.drawerLeft + 1);

  // And the stage's own overlays fit the column the drawer left them.
  expect(await stageOverlays(page)).toEqual({ over: 0, overlapping: 0 });

  /* FR-10.6: the export frame covers exactly the box the render occupies, or
     it is decorative. This is the shape that used to break it — a column
     taller than it is wide, where sizing off a percentage of the height drew
     a frame twice the character's height. Both read `min(94cqmin, 40rem)`
     now, and the stage column answers for both its axes. */
  await page.getByRole("tab", { name: "Compartir" }).click();
  const frame = await page.evaluate(() => {
    const host = document.querySelector('[aria-label="bubble stage"]');
    const svg = host?.querySelector("svg");
    const box = document.querySelector('[data-testid="export-frame"]');
    if (!svg || !box) return null;
    const a = svg.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    return {
      dw: Math.abs(a.width - b.width),
      dh: Math.abs(a.height - b.height),
    };
  });
  expect(frame).not.toBeNull();
  expect(frame?.dw).toBeLessThanOrEqual(1);
  expect(frame?.dh).toBeLessThanOrEqual(1);

  await shoot(page, "tablet-820");
});

/**
 * FR-12.4: the reorder drag with a finger. This is the case the whole rewrite
 * exists for — native HTML5 drag never fires from a touchscreen, so before it
 * the rail, the mood grid and the step strip could not be reordered by touch
 * at all, and nothing in jsdom could tell us so.
 *
 * Driven through CDP rather than Playwright's touchscreen, which only taps:
 * `Input.dispatchTouchEvent` produces the real pointer stream, `pointerType`
 * included, which is what the hold-versus-scroll rule turns on.
 */
test.describe("touch", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("reorders the rail with a held finger, and not with a quick swipe", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Nueva burbuja" }).click();

    const order = () =>
      page
        .locator("nav [data-reorder-id]")
        .evaluateAll((els) =>
          els.map((e) => e.getAttribute("data-reorder-id")),
        );
    const before = await order();
    expect(before).toHaveLength(2);

    const centre = async (i: number) => {
      const box = await page
        .locator("nav [data-reorder-id]")
        .nth(i)
        .boundingBox();
      if (!box) throw new Error("rail item not laid out");
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const cdp = await page.context().newCDPSession(page);
    type TouchPhase = "touchStart" | "touchMove" | "touchEnd" | "touchCancel";
    const touch = async (type: TouchPhase, at: { x: number; y: number }) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: at.x, y: at.y, id: 1 }],
      });
    };

    // A quick swipe is a scroll, not a lift.
    //
    // Corroboration rather than proof: with the hold set to zero this half
    // still passes, because Chrome turns the swipe into a pan and cancels the
    // pointer before our rule is ever consulted. That is the right outcome and
    // a second line of defence, but the rule itself is pinned in
    // dragReorder.test.tsx, where the hold can be moved and watched to fail.
    const [a, b] = [await centre(0), await centre(1)];
    await touch("touchStart", a);
    await touch("touchMove", b);
    expect(await page.locator("nav [data-dragging]").count()).toBe(0);
    await touch("touchEnd", b);
    expect(await order()).toEqual(before);

    // Held first, it lifts.
    await touch("touchStart", a);
    await page.waitForTimeout(600);
    await touch("touchMove", b);
    expect(await page.locator("nav [data-dragging]").count()).toBe(1);
    await touch("touchEnd", b);

    expect(await order()).toEqual([before[1], before[0]]);
  });
});

/**
 * FR-12.5: every interactive target is at least 44×44 CSS px under a coarse
 * pointer. A control may keep a smaller *drawn* mark — the step grip is 6px
 * wide and stays so — provided its hit area meets the floor, which is why the
 * measurement takes the larger of the element's own box and the `::after`
 * overlay `.touch-target` gives it.
 */
test.describe("touch targets", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("every control a finger can reach is at least 44px (FR-12.5)", async ({
    page,
  }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
    ).toBe(true);

    const tooSmall = async () =>
      page.evaluate(() => {
        const out: string[] = [];
        const controls = document.querySelectorAll(
          "button, input, select, [role=tab], [role=radio], [role=menuitem]",
        );
        for (const el of controls) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const after = getComputedStyle(el, "::after");
          const grown = after.content !== "none";
          const w = grown
            ? Math.max(r.width, parseFloat(after.width) || 0)
            : r.width;
          const h = grown
            ? Math.max(r.height, parseFloat(after.height) || 0)
            : r.height;
          if (w < 44 || h < 44) {
            const name =
              el.getAttribute("aria-label") ??
              el.textContent?.trim().slice(0, 20) ??
              el.tagName;
            out.push(
              `${String(Math.round(w))}x${String(Math.round(h))} ${name}`,
            );
          }
        }
        return out;
      });

    const seen: string[] = [];
    seen.push(...(await tooSmall()));
    for (const tab of ["Ánimos", "Ciclos", "Compartir"]) {
      await page.getByRole("tab", { name: tab }).click();
      await page.waitForTimeout(200);
      seen.push(...(await tooSmall()));
    }
    expect(seen).toEqual([]);

    // Archived separately from phone-390: that one runs with a fine pointer,
    // where the controls keep their compact desktop sizes. This is what a real
    // phone shows.
    await page.getByRole("tab", { name: "Aspecto" }).click();
    await shoot(page, "phone-touch");
  });

  /**
   * FR-12.6: pinch reaches the zoom the pill reaches. Two real touch points
   * through CDP, because this is exactly the gesture jsdom can only mime — it
   * has no notion of two pointers being a scale rather than two drags.
   */
  test("pinching the stage zooms it (FR-12.6)", async ({ page }) => {
    await page.goto("/");
    const zoom = page.getByLabel("Zoom", { exact: true });
    await expect(zoom).toHaveValue("100");

    const box = await page.getByLabel("bubble stage").boundingBox();
    if (!box) throw new Error("stage not laid out");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);
    type TouchPhase = "touchStart" | "touchMove" | "touchEnd";
    const at = (spread: number) => [
      { x: cx - spread, y: cy, id: 1 },
      { x: cx + spread, y: cy, id: 2 },
    ];
    const send = async (type: TouchPhase, points: ReturnType<typeof at>) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : points,
      });
    };

    await send("touchStart", at(40));
    await send("touchMove", at(80));
    await send("touchEnd", at(80));

    // Doubling the span doubles the zoom, and 200% is where the range stops.
    await expect(zoom).toHaveValue("200");
  });
});
