import { afterEach, describe, expect, it } from "vitest";
import { resolveConfiguration, serverConfigurationStatus } from "../src/config.js";
import { buildUserPrompt } from "../src/prompt.js";
import { specification } from "./fixtures.js";

const originalKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_MODEL;
afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.OPENROUTER_MODEL; else process.env.OPENROUTER_MODEL = originalModel;
});

describe("configuration", () => {
  it("uses ephemeral overrides before environment configuration", () => {
    process.env.OPENROUTER_API_KEY = "environment-secret";
    process.env.OPENROUTER_MODEL = "environment/model";
    expect(resolveConfiguration({ apiKey: "runtime-secret", model: "runtime/model" })).toEqual({ apiKey: "runtime-secret", model: "runtime/model" });
  });
  it("exposes only configuration booleans", () => {
    process.env.OPENROUTER_API_KEY = "secret-value";
    process.env.OPENROUTER_MODEL = "provider/model";
    expect(serverConfigurationStatus()).toEqual({ apiKeyConfigured: true, modelConfigured: true });
    expect(JSON.stringify(serverConfigurationStatus())).not.toContain("secret-value");
  });
});

describe("buildUserPrompt", () => {
  it("includes the selected options and specification", () => {
    const prompt = buildUserPrompt({ featureName: "Wallet limits", maximumCases: 12, testLevel: "API", specification });
    expect(prompt).toContain("Feature name: Wallet limits");
    expect(prompt).toContain("Test level: API");
    expect(prompt).toContain("Maximum test cases: 12");
    expect(prompt).toContain(specification);
  });
});
