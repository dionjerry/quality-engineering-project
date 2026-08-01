import { z } from "zod";

export const prioritySchema = z.enum(["P0", "P1", "P2"]);
export const reviewStatusSchema = z.enum(["Ready", "Blocked by clarification"]);

export const testCaseSchema = z.object({
  testCaseId: z.string().trim().min(1),
  title: z.string().trim().min(4),
  requirementId: z.string().trim().min(1),
  priority: prioritySchema,
  testType: z.string().trim().min(1),
  preconditions: z.array(z.string().trim().min(1)).min(1),
  testData: z.array(z.string().trim().min(1)).min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  expectedResult: z.string().trim().min(8),
  traceabilityEvidence: z.string().trim().min(8),
  assumptions: z.string().trim().min(1),
  reviewStatus: reviewStatusSchema,
}).strict();

export const aiOutputSchema = z.object({
  testCases: z.array(testCaseSchema),
  clarificationQuestions: z.array(z.string().trim().min(5)),
}).strict();

export const generationRequestSchema = z.object({
  featureName: z.string().trim().max(120).optional().default("Untitled feature"),
  specification: z.string(),
  maximumCases: z.coerce.number().int().min(1).max(100).optional().default(20),
  testLevel: z.enum(["Unspecified", "UI", "API", "Integration", "End to end"]).optional().default("Unspecified"),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
});

export type AiOutput = z.infer<typeof aiOutputSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type GenerationRequest = z.infer<typeof generationRequestSchema>;

export const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["testCases", "clarificationQuestions"],
  properties: {
    testCases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "testCaseId", "title", "requirementId", "priority", "testType", "preconditions",
          "testData", "steps", "expectedResult", "traceabilityEvidence", "assumptions", "reviewStatus",
        ],
        properties: {
          testCaseId: { type: "string", description: "Unique identifier such as TC-001." },
          title: { type: "string" },
          requirementId: { type: "string", description: "Supplied ID or assigned R1, R2, etc." },
          priority: { type: "string", enum: ["P0", "P1", "P2"] },
          testType: { type: "string" },
          preconditions: { type: "array", minItems: 1, items: { type: "string" } },
          testData: { type: "array", minItems: 1, items: { type: "string" } },
          steps: { type: "array", minItems: 1, items: { type: "string" } },
          expectedResult: { type: "string" },
          traceabilityEvidence: { type: "string", description: "Faithful excerpt from the specification." },
          assumptions: { type: "string", description: "Normally None." },
          reviewStatus: { type: "string", enum: ["Ready", "Blocked by clarification"] },
        },
      },
    },
    clarificationQuestions: { type: "array", items: { type: "string" } },
  },
} as const;
