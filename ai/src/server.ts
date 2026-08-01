import "dotenv/config";
import { createApp } from "./app.js";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be a valid TCP port.");

createApp().listen(port, host, () => {
  process.stdout.write(`QA Test Case Generator is running at http://${host}:${port}\n`);
});
