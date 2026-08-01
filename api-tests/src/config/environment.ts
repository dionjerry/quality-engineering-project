import { config as loadEnvironment } from "dotenv";

loadEnvironment({ quiet: true });

const defaultBaseUrl = "http://127.0.0.1:3001";
const apiBaseUrl = process.env.API_BASE_URL ?? defaultBaseUrl;
const parsedBaseUrl = new URL(apiBaseUrl);
const allowedHosts = new Set(["127.0.0.1", "localhost"]);

if (!allowedHosts.has(parsedBaseUrl.hostname)) {
  throw new Error(
    `API_BASE_URL must target the local Restful Booker service; received ${parsedBaseUrl.hostname}`,
  );
}

export const environment = Object.freeze({
  apiBaseUrl: parsedBaseUrl.toString().replace(/\/$/, ""),
  username: process.env.API_USERNAME ?? "admin",
  password: process.env.API_PASSWORD ?? "password123",
});

