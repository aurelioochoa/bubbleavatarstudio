// The README walkthrough (docs/media/). Separate from playwright.config.ts so
// the smoke suite never pays for video capture, and so this can record at a
// fixed size regardless of what the checks use.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "demo.spec.ts",
  timeout: 180_000,
  reporter: [["list"]],
  outputDir: "test-results/demo",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 800 },
    // Motion is the point of this capture, so no reduced-motion override.
    video: { mode: "on", size: { width: 1280, height: 800 } },
  },
  webServer: {
    command: "pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
