import ExcelJS from "exceljs";
import type { TestCase } from "./schemas.js";

const DISCLAIMER = "AI-generated draft: a qualified QA engineer must review and approve every test case before execution.";

export async function createTestCaseWorkbook(options: { featureName: string; model: string; testCases: TestCase[] }): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QA Test Case Generator";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Test Cases", { views: [{ state: "frozen", ySplit: 4 }] });

  sheet.mergeCells("A1:L1");
  const title = sheet.getCell("A1");
  title.value = `${options.featureName} - Test Cases`;
  title.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17324D" } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells("A2:L2");
  const metadata = sheet.getCell("A2");
  metadata.value = `Generated ${new Date().toISOString()} | Model: ${options.model}`;
  metadata.font = { size: 9, color: { argb: "FF506577" } };

  sheet.mergeCells("A3:L3");
  const disclaimer = sheet.getCell("A3");
  disclaimer.value = DISCLAIMER;
  disclaimer.font = { italic: true, color: { argb: "FF8A4B08" } };
  disclaimer.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };

  const columns = [
    ["Test Case ID", 15], ["Title", 30], ["Requirement ID", 17], ["Priority", 11],
    ["Test Type", 16], ["Preconditions", 32], ["Test Data", 28], ["Steps", 48],
    ["Expected Result", 42], ["Traceability Evidence", 42], ["Assumptions", 18], ["Review Status", 20],
  ] as const;
  const header = sheet.getRow(4);
  columns.forEach(([name, width], index) => {
    const column = sheet.getColumn(index + 1);
    column.width = width;
    const cell = header.getCell(index + 1);
    cell.value = name;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B6B4F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  header.height = 28;

  options.testCases.forEach((testCase, index) => {
    const row = sheet.addRow([
      testCase.testCaseId, testCase.title, testCase.requirementId, testCase.priority, testCase.testType,
      testCase.preconditions.map((item) => `• ${item}`).join("\n"),
      testCase.testData.map((item) => `• ${item}`).join("\n"),
      testCase.steps.map((item, step) => `${step + 1}. ${item}`).join("\n"),
      testCase.expectedResult, testCase.traceabilityEvidence, testCase.assumptions, testCase.reviewStatus,
    ]);
    row.alignment = { vertical: "top", wrapText: true };
    row.height = Math.max(36, 18 * Math.max(testCase.steps.length, testCase.preconditions.length, testCase.testData.length));
    if (index % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F7F9" } };
    const priorityCell = row.getCell(4);
    const priorityColor = testCase.priority === "P0" ? "FFFEE4E2" : testCase.priority === "P1" ? "FFFFF3E0" : "FFE8F5EF";
    priorityCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: priorityColor } };
    priorityCell.font = { bold: true };
    row.getCell(12).font = { bold: true, color: { argb: "FF0B6B4F" } };
  });

  sheet.autoFilter = { from: "A4", to: `L${Math.max(4, sheet.rowCount)}` };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9E2E8" } },
        left: { style: "thin", color: { argb: "FFD9E2E8" } },
        bottom: { style: "thin", color: { argb: "FFD9E2E8" } },
        right: { style: "thin", color: { argb: "FFD9E2E8" } },
      };
    });
  });

  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}
