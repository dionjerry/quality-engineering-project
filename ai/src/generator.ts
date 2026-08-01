import { resolveConfiguration } from "./config.js";
import { validateSpecification } from "./input-validation.js";
import { callOpenRouter } from "./openrouter.js";
import { validateAiOutput } from "./output-validation.js";
import { buildUserPrompt } from "./prompt.js";
import { generationRequestSchema, type GenerationRequest } from "./schemas.js";
import { createTestCaseWorkbook } from "./workbook.js";

export interface GenerationResult {
  workbook: Buffer;
  filename: string;
  testCaseCount: number;
  clarificationQuestions: string[];
}

function safeFilename(value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${safe || "test-cases"}-${Date.now()}.xlsx`;
}

export async function generateTestCases(input: unknown): Promise<GenerationResult> {
  const request = generationRequestSchema.parse(input);
  const specification = validateSpecification(request.specification);
  const configuration = resolveConfiguration({ apiKey: request.apiKey, model: request.model });
  const promptRequest: GenerationRequest = { ...request, specification };
  const raw = await callOpenRouter({
    apiKey: configuration.apiKey,
    model: configuration.model,
    userPrompt: buildUserPrompt(promptRequest),
    signal: AbortSignal.timeout(90_000),
  });
  const validated = validateAiOutput(raw, specification, request.maximumCases);
  const workbook = await createTestCaseWorkbook({ featureName: request.featureName, model: configuration.model, testCases: validated.testCases });
  return {
    workbook,
    filename: safeFilename(request.featureName),
    testCaseCount: validated.testCases.length,
    clarificationQuestions: validated.clarificationQuestions,
  };
}
