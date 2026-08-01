import { AuthErrorSchema, AuthSuccessSchema } from "../src/schemas/api.schemas.js";
import { expect, test } from "../src/fixtures/api.fixture.js";

test.describe("POST /auth authentication", () => {
  test("valid credentials return unique, correctly shaped tokens", async ({
    booker,
  }) => {
    const firstResponse = await booker.authenticate({
      username: "admin",
      password: "password123",
    });
    const secondResponse = await booker.authenticate({
      username: "admin",
      password: "password123",
    });

    expect(firstResponse.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);
    const first = AuthSuccessSchema.parse(await firstResponse.json());
    const second = AuthSuccessSchema.parse(await secondResponse.json());
    expect(first.token).not.toBe(second.token);
  });

  for (const testCase of [
    {
      name: "invalid username",
      credentials: { username: "invalid-user", password: "password123" },
    },
    {
      name: "invalid password",
      credentials: { username: "admin", password: "invalid-password" },
    },
  ]) {
    test(`${testCase.name} is rejected with 401`, async ({ booker }) => {
      test.fail(
        true,
        "BUG-API-001: invalid credentials return 200; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const response = await booker.authenticate(testCase.credentials);
      const body: unknown = await response.json();

      expect(body).not.toHaveProperty("token");
      expect(AuthErrorSchema.parse(body).reason).toBe("Bad credentials");
      expect(response.status()).toBe(401);
    });
  }

  for (const testCase of [
    {
      name: "missing username",
      credentials: { password: "password123" },
      requiredFields: ["username"],
    },
    {
      name: "missing password",
      credentials: { username: "admin" },
      requiredFields: ["password"],
    },
    {
      name: "empty username",
      credentials: { username: "", password: "password123" },
      requiredFields: ["username"],
    },
    {
      name: "empty password",
      credentials: { username: "admin", password: "" },
      requiredFields: ["password"],
    },
    {
      name: "empty JSON object",
      credentials: {},
      requiredFields: ["username", "password"],
    },
  ]) {
    test(`${testCase.name} returns field-specific validation`, async ({ booker }) => {
      test.fail(
        true,
        "BUG-API-004: required credentials return generic 200; see ../../docs/Part-2/Bug-Report.pdf",
      );
      const response = await booker.authenticate(testCase.credentials);
      const body: unknown = await response.json();
      const serializedBody = JSON.stringify(body).toLowerCase();

      expect(body).not.toHaveProperty("token");
      expect(response.status()).toBe(400);
      for (const field of testCase.requiredFields) {
        expect(serializedBody).toContain(field);
      }
    });
  }

  test("zero-byte body returns field-specific validation", async ({ booker }) => {
    test.fail(
      true,
      "BUG-API-004: empty body returns generic 200; see ../../docs/Part-2/Bug-Report.pdf",
    );
    const response = await booker.authenticateRaw("");
    const body: unknown = await response.json();
    const serializedBody = JSON.stringify(body).toLowerCase();

    expect(body).not.toHaveProperty("token");
    expect(response.status()).toBe(400);
    expect(serializedBody).toContain("username");
    expect(serializedBody).toContain("password");
  });

  test("malformed JSON returns 400 and no token", async ({ booker }) => {
    const response = await booker.authenticateRaw('{"username":"admin",');
    const body = await response.text();

    expect(response.status()).toBe(400);
    expect(body).not.toContain("token");
  });
});
