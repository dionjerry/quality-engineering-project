import { defineConfig, type ReporterDescription } from "@playwright/test";

import { environment } from "./src/config/environment.js";

const reporters: ReporterDescription[] = [
  ["list"],
  ["html", { outputFolder: "playwright-report", open: "never" }],
  ["junit", { outputFile: "test-results/junit.xml" }],
];

if (process.env.CI) {
  reporters.push(["github"]);
}

export default defineConfig({
  testDir: "./tests",
  // One worker keeps each service instance deterministic, while fullyParallel
  // lets Playwright distribute individual tests evenly across CI shards.
  fullyParallel: true,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: "test-results/artifacts",
  reporter: reporters,
  use: {
    baseURL: environment.apiBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
});
