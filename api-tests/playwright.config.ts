import { defineConfig } from "@playwright/test";

import { environment } from "./src/config/environment.js";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: "test-results/artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL: environment.apiBaseUrl,
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
});

