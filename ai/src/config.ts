import "dotenv/config";

export interface RuntimeConfiguration {
  apiKey: string;
  model: string;
}

export function serverConfigurationStatus(): { apiKeyConfigured: boolean; modelConfigured: boolean } {
  return {
    apiKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    modelConfigured: Boolean(process.env.OPENROUTER_MODEL?.trim()),
  };
}

export function resolveConfiguration(overrides: { apiKey?: string | undefined; model?: string | undefined }): RuntimeConfiguration {
  const apiKey = overrides.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || "";
  const model = overrides.model?.trim() || process.env.OPENROUTER_MODEL?.trim() || "";
  if (!apiKey) throw new Error("OpenRouter API key is required. Configure .env or enter a key for this request.");
  if (!model) throw new Error("OpenRouter model is required. Configure .env or enter a model for this request.");
  return { apiKey, model };
}
