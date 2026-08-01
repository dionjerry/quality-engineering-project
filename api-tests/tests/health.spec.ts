import { expect, test } from "../src/fixtures/api.fixture.js";

test.describe("Restful Booker health", () => {
  test("GET /ping returns the standard health-check status", async ({ booker }) => {
    test.fail(
      true,
      "BUG-API-003: GET /ping returns 201 Created; see ../../docs/Part-2/Bug-Report.pdf",
    );
    const response = await booker.ping();

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
