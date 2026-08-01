import { expect, test } from "../src/fixtures/api.fixture.js";

test.describe("Restful Booker health", () => {
  test("GET /ping confirms the local API is available", async ({ booker }) => {
    const response = await booker.ping();

    expect(response.status()).toBe(201);
    expect(await response.text()).toBe("Created");
  });
});

