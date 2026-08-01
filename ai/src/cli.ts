import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateTestCases } from "./generator.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputPath = argument("input");
if (!inputPath) throw new Error("Usage: npm run generate -- --input samples/wallet-spec.txt [--feature Name] [--model model/id]");
const specification = await readFile(path.resolve(inputPath), "utf8");
const maximumCasesValue = argument("max-cases");
const result = await generateTestCases({
  featureName: argument("feature") || path.basename(inputPath, path.extname(inputPath)),
  specification,
  maximumCases: maximumCasesValue ? Number(maximumCasesValue) : 20,
  testLevel: argument("test-level") || "Unspecified",
  model: argument("model"),
});
const reports = path.resolve("reports");
await mkdir(reports, { recursive: true });
const output = path.join(reports, result.filename);
await writeFile(output, result.workbook);
process.stdout.write(`Generated ${result.testCaseCount} validated test cases: ${output}\n`);
