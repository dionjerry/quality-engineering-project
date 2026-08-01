import { outputJsonSchema, type AiOutput } from "./schemas.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string; error?: { message?: string } }>;
  error?: { message?: string; metadata?: { error_type?: string } };
}

export class OpenRouterError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export async function callOpenRouter(options: { apiKey: string; model: string; userPrompt: string; signal?: AbortSignal }): Promise<AiOutput> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://127.0.0.1",
      "X-Title": "QA Test Case Generator",
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: options.userPrompt },
      ],
      stream: false,
      temperature: 0.1,
      provider: { require_parameters: true },
      response_format: {
        type: "json_schema",
        json_schema: { name: "qa_test_cases", strict: true, schema: outputJsonSchema },
      },
    }),
    signal: options.signal ?? null,
  });

  const body = await response.json().catch(() => ({})) as OpenRouterResponse;
  if (!response.ok) {
    const base = body.error?.message || `OpenRouter returned HTTP ${response.status}.`;
    const compatibility = response.status === 400 || response.status === 404 || response.status === 503
      ? " Confirm that the selected model supports strict JSON-schema structured output."
      : "";
    throw new OpenRouterError(`${base}${compatibility}`, response.status);
  }

  const choice = body.choices?.[0];
  if (choice?.error?.message) throw new OpenRouterError(choice.error.message);
  const content = choice?.message?.content;
  if (!content) throw new OpenRouterError("OpenRouter returned no structured test-case content.");
  try {
    return JSON.parse(content) as AiOutput;
  } catch {
    throw new OpenRouterError("OpenRouter returned invalid JSON. No workbook was generated.");
  }
}
