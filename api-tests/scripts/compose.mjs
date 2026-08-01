import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const macDockerDesktop = "/Applications/Docker.app/Contents/Resources/bin/docker";
const dockerCommand =
  process.platform === "darwin" && existsSync(macDockerDesktop)
    ? macDockerDesktop
    : "docker";
const composeFile = fileURLToPath(
  new URL("../../docker-compose.yml", import.meta.url),
);
const composeArguments = ["compose", "-f", composeFile, ...process.argv.slice(2)];
const result = spawnSync(dockerCommand, composeArguments, { stdio: "inherit" });

if (result.error) {
  console.error(`Unable to run Docker Compose: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
