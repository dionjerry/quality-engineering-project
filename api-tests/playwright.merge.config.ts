import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    [
      "html",
      {
        outputFolder: "playwright-report",
        open: "never",
        title: "Restful Booker API Test Report",
        noCopyPrompt: true,
      },
    ],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
});
