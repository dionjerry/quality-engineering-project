import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

interface ErrorBody { error: string }

describe("local API", () => {
  it("never returns configured secret values", async () => {
    process.env.OPENROUTER_API_KEY = "never-return-this-secret";
    process.env.OPENROUTER_MODEL = "provider/model";
    const response = await request(createApp()).get("/api/config").expect(200);
    expect(response.body).toEqual({ apiKeyConfigured: true, modelConfigured: true });
    expect(response.text).not.toContain("never-return-this-secret");
  });

  it("downloads a workbook returned by the validated generator", async () => {
    const app = createApp(() => Promise.resolve({ workbook: Buffer.from("xlsx-content"), filename: "cases.xlsx", testCaseCount: 3, clarificationQuestions: [] }));
    const response = await request(app).post("/api/generate").send({ specification: "A sufficiently detailed feature specification for this mocked integration test." }).expect(200);
    expect(response.headers["content-type"]).toContain("spreadsheetml.sheet");
    expect(response.headers["x-test-case-count"]).toBe("3");
  });

  it("returns JSON and no workbook when generation is rejected", async () => {
    const app = createApp(() => Promise.reject(new Error("internal provider detail")));
    const response = await request(app).post("/api/generate").send({ specification: "A sufficiently detailed feature specification for this mocked integration test." }).expect(500);
    expect(response.headers["content-type"]).toContain("application/json");
    expect((response.body as ErrorBody).error).not.toContain("internal provider detail");
  });
});
