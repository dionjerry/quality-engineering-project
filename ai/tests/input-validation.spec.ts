import { describe, expect, it } from "vitest";
import { validateSpecification } from "../src/input-validation.js";
import { specification } from "./fixtures.js";

describe("validateSpecification", () => {
  it("accepts readable requirement text", () => expect(validateSpecification(specification)).toBe(specification));
  it.each(["", "short words only", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "1234 !!! ---- 0000 9999 @@@@ #### $$$$"])("rejects meaningless input: %s", (value) => {
    expect(() => validateSpecification(value)).toThrow();
  });
  it("rejects oversized input", () => expect(() => validateSpecification(`Requirement ${"a".repeat(50_001)}`)).toThrow(/50,000/));
});
