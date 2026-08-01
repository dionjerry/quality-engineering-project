import type { GenerationRequest } from "./schemas.js";

export function buildUserPrompt(request: Pick<GenerationRequest, "featureName" | "maximumCases" | "testLevel" | "specification">): string {
  return `Feature name: ${request.featureName}
Test level: ${request.testLevel}
Maximum test cases: ${request.maximumCases}

Assign requirement IDs R1, R2, and so on only when the specification does not provide IDs.
Return no more than the requested maximum. Put ambiguity questions in clarificationQuestions, never in testCases.
Use these exact test-case fields: testCaseId, title, requirementId, priority, testType, preconditions, testData, steps, expectedResult, traceabilityEvidence, assumptions, reviewStatus.

Feature specification:
${request.specification}`;
}
