// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", // Path to your test files
  timeout: 20 * 1000, // Test timeout in milliseconds
  use: {
    headless: true,
    baseURL: "http://localhost:3000",
    viewport: { width: 1300, height: 720 }, // Default viewport
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
    },
  ],
  webServer: {
    // Playwright will reuse an existing dev server at http://localhost:5173.
    // Start your frontend with `npm run dev` and backend with `npm start` before running tests,
    // or set `reuseExistingServer: false` and provide a start command here.
    reuseExistingServer: true,
  },
});
