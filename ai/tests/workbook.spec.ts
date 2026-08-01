import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createTestCaseWorkbook } from "../src/workbook.js";
import { validOutput } from "./fixtures.js";

describe("createTestCaseWorkbook", () => {
  it("creates one formatted Test Cases sheet without secrets", async () => {
    const buffer = await createTestCaseWorkbook({ featureName: "Wallet limits", model: "provider/model", testCases: validOutput.testCases });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Test Cases"]);
    const sheet = workbook.getWorksheet("Test Cases");
    expect(sheet).toBeDefined();
    if (!sheet) throw new Error("Test Cases sheet is required.");
    expect(sheet.getCell("A1").value).toContain("Wallet limits");
    expect(sheet.getCell("A3").value).toContain("QA engineer must review");
    expect(sheet.getCell("A5").value).toBe("TC-001");
    expect(buffer.toString()).not.toContain("api-key-secret");
  });
});
