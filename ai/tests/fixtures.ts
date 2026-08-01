import type { AiOutput } from "../src/schemas.js";

export const specification = `R1. Tier 1 users can transfer a maximum of 20,000 per transaction.
R2. A transfer exceeding the per-transaction limit is rejected and no money leaves the wallet.`;

export const validOutput: AiOutput = {
  clarificationQuestions: [],
  testCases: [
    {
      testCaseId: "TC-001",
      title: "Accept a transfer at the Tier 1 transaction limit",
      requirementId: "R1",
      priority: "P1",
      testType: "Functional boundary",
      preconditions: ["A Tier 1 wallet has sufficient balance"],
      testData: ["Transfer amount: 20,000"],
      steps: ["Submit a transfer for 20,000"],
      expectedResult: "The transfer of 20,000 is accepted.",
      traceabilityEvidence: "Tier 1 users can transfer a maximum of 20,000 per transaction.",
      assumptions: "None",
      reviewStatus: "Ready",
    },
  ],
};
