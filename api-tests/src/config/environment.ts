import { config as loadEnvironment } from "dotenv";

loadEnvironment({ quiet: true });

const defaultBaseUrl = "http://127.0.0.1:3001";
const apiBaseUrl = process.env.API_BASE_URL ?? defaultBaseUrl;
const parsedBaseUrl = new URL(apiBaseUrl);
const allowedHosts = new Set(["127.0.0.1", "localhost"]);

function requireEnvironmentVariable(name: "API_USERNAME" | "API_PASSWORD"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Copy api-tests/.env.example to api-tests/.env and provide the local Restful Booker credential.`,
    );
  }
  return value;
}

if (!allowedHosts.has(parsedBaseUrl.hostname)) {
  throw new Error(
    `API_BASE_URL must target the local Restful Booker service; received ${parsedBaseUrl.hostname}`,
  );
}

export const environment = Object.freeze({
  apiBaseUrl: parsedBaseUrl.toString().replace(/\/$/, ""),
  username: requireEnvironmentVariable("API_USERNAME"),
  password: requireEnvironmentVariable("API_PASSWORD"),
});
