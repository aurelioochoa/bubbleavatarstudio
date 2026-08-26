// Visual smoke (docs/08 F5): boot, panels, playing loop against the
// production preview build. Screenshots are archived artifacts, not goldens.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // The README walkthrough records video and runs for a minute; it is not a
  // check and must not run with the smoke suite. `pnpm demo` runs it by name.
  testIgnore: "demo.spec.ts",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
