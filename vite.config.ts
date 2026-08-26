/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Bare node by default, jsdom only where React lives: domain/ and render/
    // are pure TypeScript (FR-11.1), and a test that cannot reach `document`
    // proves it alongside the ESLint boundary rule.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["src/app/**", "jsdom"],
      ["src/runtime/**", "jsdom"],
    ],
  },
});
