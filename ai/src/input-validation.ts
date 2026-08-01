const MIN_LENGTH = 40;
const MAX_LENGTH = 50_000;

export class ValidationError extends Error {
  constructor(message: string, public readonly details: string[] = []) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateSpecification(value: string): string {
  const specification = value.trim();
  if (!specification) throw new ValidationError("Paste a feature specification before generating test cases.");
  if (specification.length < MIN_LENGTH) throw new ValidationError("The specification is too short to support reliable test cases.");
  if (specification.length > MAX_LENGTH) throw new ValidationError("The specification exceeds the 50,000-character limit.");

  const words = specification.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  if (words.length < 8) throw new ValidationError("The specification does not contain enough readable requirement text.");
  const alphaCount = (specification.match(/[A-Za-z]/g) ?? []).length;
  if (alphaCount / specification.length < 0.45) throw new ValidationError("The specification appears unreadable or malformed.");
  const normalized = specification.toLowerCase().replace(/\s/g, "");
  if (new Set(normalized).size < 8) throw new ValidationError("The specification appears to contain repeated or meaningless characters.");
  return specification;
}
