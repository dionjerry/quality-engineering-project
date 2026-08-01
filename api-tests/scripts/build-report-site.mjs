import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const dashboardSource = path.join(projectRoot, ".github/report-dashboard");
const reportSource = path.resolve(process.env.REPORT_SOURCE ?? "playwright-report");
const junitSource = path.resolve(process.env.JUNIT_SOURCE ?? "test-results/junit.xml");
const siteOutput = path.resolve(process.env.SITE_OUTPUT ?? "pages-site");

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to build the report dashboard.`);
  return value;
}

function attribute(xml, name) {
  const match = xml.match(new RegExp(`\\b${name}="([^"]+)"`));
  if (!match?.[1]) throw new Error(`JUnit report does not contain ${name}.`);
  return match[1];
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function removePrivateDiagnostics(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removePrivateDiagnostics(entryPath);
      continue;
    }
    if (/\.(?:md|xml|zip|png|jpe?g|webp)$/i.test(entry.name)) {
      await rm(entryPath);
    }
  }
}

const junit = await readFile(junitSource, "utf8");
const totalTests = Number(attribute(junit, "tests"));
const failures = Number(attribute(junit, "failures"));
const errors = Number(attribute(junit, "errors"));
const skipped = Number(attribute(junit, "skipped"));
const duration = Number(attribute(junit, "time"));
const knownBugChecks = (junit.match(/<property name="fail"/g) ?? []).length;

if (![totalTests, failures, errors, skipped, duration].every(Number.isFinite)) {
  throw new Error("JUnit summary contains a non-numeric value.");
}

const replacements = {
  "%%TOTAL_TESTS%%": String(totalTests),
  "%%KNOWN_BUG_CHECKS%%": String(knownBugChecks),
  "%%DURATION%%": `${duration.toFixed(2)}s`,
  "%%RUN_NUMBER%%": escapeHtml(requiredEnvironment("GITHUB_RUN_NUMBER")),
  "%%RUN_URL%%": escapeHtml(requiredEnvironment("GITHUB_RUN_URL")),
  "%%COMMIT_SHORT%%": escapeHtml(requiredEnvironment("GITHUB_SHA").slice(0, 7)),
  "%%COMMIT_URL%%": escapeHtml(requiredEnvironment("GITHUB_COMMIT_URL")),
  "%%GENERATED_AT%%": escapeHtml(new Date().toISOString()),
};

await rm(siteOutput, { recursive: true, force: true });
await mkdir(siteOutput, { recursive: true });
await cp(dashboardSource, siteOutput, { recursive: true });
await cp(reportSource, path.join(siteOutput, "latest"), { recursive: true });
await removePrivateDiagnostics(path.join(siteOutput, "latest"));

const dashboardPath = path.join(siteOutput, "index.html");
let dashboard = await readFile(dashboardPath, "utf8");
for (const [token, value] of Object.entries(replacements)) {
  dashboard = dashboard.replaceAll(token, value);
}

if (/%%[A-Z_]+%%/.test(dashboard)) {
  throw new Error("The report dashboard contains unresolved template values.");
}

await writeFile(dashboardPath, dashboard);
