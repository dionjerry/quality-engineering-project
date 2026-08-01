import { expect, test } from "../src/fixtures/api.fixture.js";

test.describe("Restful Booker health", () => {
  test("GET /ping returns the standard health-check status", async ({ booker }) => {
    test.fail(
      true,
      "BUG-API-003: GET /ping returns 201 Created; see reports/phase-2-auth-report.md",
    );
    const response = await booker.ping();

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
