import { describe, expect, it } from "vitest";
import { validateAiOutput } from "../src/output-validation.js";
import { ValidationError } from "../src/input-validation.js";
import { specification, validOutput } from "./fixtures.js";

describe("validateAiOutput", () => {
  function firstCase(output = validOutput) {
    const testCase = output.testCases[0];
    if (!testCase) throw new Error("Fixture must contain a test case.");
    return testCase;
  }

  it("accepts traceable, specific, ready test cases", () => expect(validateAiOutput(validOutput, specification, 20)).toEqual(validOutput));
  it("rejects nonexistent requirement IDs", () => {
    const output = structuredClone(validOutput);
    firstCase(output).requirementId = "R99";
    expect(() => validateAiOutput(output, specification, 20)).toThrow(/quality gate/);
  });
  it("rejects vague expected results", () => {
    const output = structuredClone(validOutput);
    firstCase(output).expectedResult = "The system behaves correctly.";
    expect(() => validateAiOutput(output, specification, 20)).toThrow(/quality gate/);
  });
  it("rejects unsupported assumptions and blocked cases", () => {
    const output = structuredClone(validOutput);
    firstCase(output).assumptions = "The backend uses database locking";
    firstCase(output).reviewStatus = "Blocked by clarification";
    expect(() => validateAiOutput(output, specification, 20)).toThrow(/quality gate/);
  });
  it("rejects substantially duplicated cases", () => {
    const duplicate = structuredClone(firstCase());
    duplicate.testCaseId = "TC-002";
    try {
      validateAiOutput({ testCases: [...validOutput.testCases, duplicate], clarificationQuestions: [] }, specification, 20);
      throw new Error("Expected duplicate validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const details = error instanceof ValidationError ? error.details : [];
      expect(details.some((detail) => /duplicated/.test(detail))).toBe(true);
    }
  });
});
