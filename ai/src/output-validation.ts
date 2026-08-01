import { aiOutputSchema, type AiOutput, type TestCase } from "./schemas.js";
import { ValidationError } from "./input-validation.js";

const VAGUE_PHRASES = [
  "behaves correctly",
  "appropriate rule",
  "handled as expected",
  "works as expected",
  "processed successfully",
  "valid response",
];

function tokens(value: string): Set<string> {
  return new Set(
    (value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((token) => token.length > 2 && !["the", "and", "that", "with", "from", "this"].includes(token)),
  );
}

function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / (a.size + b.size - intersection);
}

function evidenceCoverage(evidence: string, specification: string): number {
  const evidenceTokens = tokens(evidence);
  const specificationTokens = tokens(specification);
  if (evidenceTokens.size === 0) return 0;
  return [...evidenceTokens].filter((item) => specificationTokens.has(item)).length / evidenceTokens.size;
}

function suppliedRequirementIds(specification: string): Set<string> {
  const matches = specification.matchAll(/(?:^|\n|\s)((?:R|AC|BR|US)[-_ ]?\d+)(?=[\s.:)-])/gim);
  return new Set([...matches].map((match) => match[1]?.replace(/[ _-]/g, "").toUpperCase()).filter(Boolean) as string[]);
}

function normalizedId(value: string): string {
  return value.replace(/[ _-]/g, "").toUpperCase();
}

function caseSignature(testCase: TestCase): string {
  return `${testCase.title} ${testCase.steps.join(" ")} ${testCase.expectedResult}`;
}

export function validateAiOutput(raw: unknown, specification: string, maximumCases: number): AiOutput {
  const parsed = aiOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("The model returned incomplete or invalid structured data.", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }

  const output = parsed.data;
  const errors: string[] = [];
  if (output.testCases.length === 0) errors.push("No executable test cases were generated.");
  if (output.testCases.length > maximumCases) errors.push(`The model returned ${output.testCases.length} cases, above the maximum of ${maximumCases}.`);

  const knownIds = suppliedRequirementIds(specification);
  const generatedIdsAllowed = knownIds.size === 0;
  const seenIds = new Set<string>();

  output.testCases.forEach((testCase, index) => {
    const label = testCase.testCaseId || `Case ${index + 1}`;
    const normalizedRequirementId = normalizedId(testCase.requirementId);
    if (seenIds.has(testCase.testCaseId.toUpperCase())) errors.push(`${label}: duplicate test-case ID.`);
    seenIds.add(testCase.testCaseId.toUpperCase());
    if (!generatedIdsAllowed && !knownIds.has(normalizedRequirementId)) errors.push(`${label}: requirement ${testCase.requirementId} does not exist in the supplied specification.`);
    if (generatedIdsAllowed && !/^R\d+$/i.test(normalizedRequirementId)) errors.push(`${label}: assigned requirement IDs must use R1, R2, and so on.`);
    if (VAGUE_PHRASES.some((phrase) => testCase.expectedResult.toLowerCase().includes(phrase))) errors.push(`${label}: expected result contains vague language.`);
    if (testCase.reviewStatus !== "Ready") errors.push(`${label}: clarification-dependent cases cannot be exported.`);
    if (testCase.assumptions.trim().toLowerCase() !== "none") errors.push(`${label}: unsupported assumptions must not enter the final workbook.`);
    if (evidenceCoverage(testCase.traceabilityEvidence, specification) < 0.6) errors.push(`${label}: traceability evidence is not sufficiently supported by the specification.`);
  });

  for (let left = 0; left < output.testCases.length; left += 1) {
    for (let right = left + 1; right < output.testCases.length; right += 1) {
      const leftCase = output.testCases[left];
      const rightCase = output.testCases[right];
      if (leftCase && rightCase && similarity(caseSignature(leftCase), caseSignature(rightCase)) >= 0.82) {
        errors.push(`${leftCase.testCaseId} and ${rightCase.testCaseId} are substantially duplicated.`);
      }
    }
  }

  if (errors.length > 0) throw new ValidationError("The AI output did not pass the QA quality gate. No workbook was generated.", errors);
  return output;
}
