# AI Test Case Generator

Part 6 Task B is a local AI-assisted QA utility. Paste a feature specification in the browser, generate a small set of traceable test cases through OpenRouter, and download one validated Excel worksheet.

## Requirements

- Node.js 22 or later.
- An OpenRouter API key.
- An OpenRouter model that supports strict JSON-schema structured output.

## Setup

```bash
cd ai
npm install
cp .env.example .env
```

Configure `.env`:

```text
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=provider/model-name
PORT=4173
```

Start the local interface:

```bash
npm start
```

Open `http://127.0.0.1:4173`. The server binds only to localhost.

The browser also accepts an API key or model for one request. These overrides take precedence over `.env`, remain in memory only, and are not stored in browser storage, logs, workbooks, or subsequent sessions. The frontend receives only Boolean configuration status and can never retrieve the environment values.

## CLI

```bash
npm run generate -- --input samples/wallet-spec.txt --feature "Wallet limits" --test-level API --max-cases 20
```

The CLI writes a uniquely named workbook to `reports/`. Generated workbooks, CSV files, temporary JSON, and logs are ignored by Git.

## Validation Policy

The application creates a workbook only when every returned case passes validation. It rejects invalid schemas, missing or unknown requirement references, vague expected results, unsupported assumptions, blocked cases, duplicated cases, and traceability evidence that is not supported by the supplied specification.

OpenRouter is required to return strict structured JSON. The client sets provider `require_parameters` so a model that cannot support `response_format: json_schema` is rejected instead of silently replaced. Automated tests mock OpenRouter and do not consume credits.

## Excel Output

The workbook contains one worksheet named `Test Cases` with:

- Test Case ID
- Title
- Requirement ID
- Priority
- Test Type
- Preconditions
- Test Data
- Steps
- Expected Result
- Traceability Evidence
- Assumptions
- Review Status

The workbook is an AI-generated draft. A qualified QA engineer must review and approve every case before execution.

## Verified Example

[`examples/Digital-Wallet-Test-Cases.xlsx`](examples/Digital-Wallet-Test-Cases.xlsx) is a sanitized workbook generated through a live OpenRouter request using the supplied digital-wallet transfer specification. The request used an unspecified test level and a maximum of 20 cases; 9 cases passed the complete validation gate and were exported.

This is the only intentionally tracked generated workbook. All normal CLI and browser exports remain ignored.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npm run check
```

## Limitations

- The utility does not make incomplete specifications complete. Ambiguities remain clarification questions.
- Traceability and similarity checks reduce unsupported or duplicated output but do not replace domain review.
- Model availability, cost, limits, and structured-output support are controlled by OpenRouter and the selected provider.
- Browser-generated workbooks are downloaded directly and are not retained by the local server.
