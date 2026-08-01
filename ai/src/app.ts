import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { serverConfigurationStatus } from "./config.js";
import { generateTestCases, type GenerationResult } from "./generator.js";
import { ValidationError } from "./input-validation.js";
import { OpenRouterError } from "./openrouter.js";

export type Generator = (input: unknown) => Promise<GenerationResult>;

export function createApp(generator: Generator = generateTestCases) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "128kb" }));
  const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
  app.use(express.static(publicDirectory, { dotfiles: "deny", index: "index.html" }));

  app.get("/api/config", (_request, response) => {
    response.json(serverConfigurationStatus());
  });

  app.post("/api/generate", async (request, response, next) => {
    try {
      const result = await generator(request.body);
      response
        .status(200)
        .set({
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "X-Test-Case-Count": String(result.testCaseCount),
          "X-Clarification-Count": String(result.clarificationQuestions.length),
          "Cache-Control": "no-store",
        })
        .send(result.workbook);
    } catch (error) {
      next(error);
    }
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ValidationError) {
      response.status(422).json({ error: error.message, details: error.details });
      return;
    }
    if (error instanceof ZodError) {
      response.status(400).json({ error: "The request is invalid.", details: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
      return;
    }
    if (error instanceof OpenRouterError) {
      response.status(error.status >= 400 && error.status < 600 ? error.status : 502).json({ error: error.message, details: [] });
      return;
    }
    const message = error instanceof Error ? error.message : "The request could not be completed.";
    const safeMessage = /api key|required.*model/i.test(message) ? message : "The generator could not complete the request. No workbook was created.";
    response.status(500).json({ error: safeMessage, details: [] });
  };
  app.use(errorHandler);
  return app;
}
