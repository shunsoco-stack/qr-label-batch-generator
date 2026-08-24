import { describe, expect, it } from "vitest";
import type { LabelRecord } from "./types";
import {
  MAX_ADDITIONAL_TEXT_CHARACTERS,
  MAX_MANAGEMENT_ID_CHARACTERS,
  MAX_QR_CONTENT_BYTES,
  MAX_TITLE_CHARACTERS,
  findDuplicateQrContent,
  hasBlockingErrors,
  qrContentByteLength,
  validateMappedRecords,
  validateRecord,
} from "./validation";

function record(
  rowNumber: number,
  content: string,
  overrides: Partial<LabelRecord> = {},
): LabelRecord {
  return {
    rowNumber,
    content,
    title: "表示名",
    managementId: `ID-${rowNumber}`,
    additionalText: "補足",
    issues: [],
    ...overrides,
  };
}

describe("record validation", () => {
  it("accepts HTTP(S) URLs and ordinary text", () => {
    expect(validateRecord(record(2, "https://example.com/a"), "url")).toEqual([]);
    expect(validateRecord(record(2, "備品-ID-001"), "text")).toEqual([]);
  });

  it("reports blank, malformed and unsupported URLs as blocking errors", () => {
    expect(validateRecord(record(2, "   "), "url")).toEqual([
      expect.objectContaining({ code: "empty-qr-content", severity: "error" }),
    ]);
    expect(validateRecord(record(2, "example.com"), "url")).toContainEqual(
      expect.objectContaining({ code: "invalid-url", severity: "error" }),
    );
    expect(validateRecord(record(2, "ftp://example.com"), "url")).toContainEqual(
      expect.objectContaining({
        code: "unsupported-url-protocol",
        severity: "error",
      }),
    );
  });

  it("measures QR limits in UTF-8 bytes", () => {
    const overLimit = "あ".repeat(Math.floor(MAX_QR_CONTENT_BYTES / 3) + 1);
    expect(qrContentByteLength(overLimit)).toBeGreaterThan(MAX_QR_CONTENT_BYTES);
    expect(validateRecord(record(2, overLimit), "text")).toContainEqual(
      expect.objectContaining({ code: "qr-content-too-long", severity: "error" }),
    );
  });

  it("warns when printable text is likely to overflow", () => {
    const issues = validateRecord(
      record(2, "A-001", {
        title: "A".repeat(MAX_TITLE_CHARACTERS + 1),
        managementId: "B".repeat(MAX_MANAGEMENT_ID_CHARACTERS + 1),
        additionalText: "C".repeat(MAX_ADDITIONAL_TEXT_CHARACTERS + 1),
      }),
      "text",
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "title-too-long",
      "management-id-too-long",
      "additional-text-too-long",
    ]);
    expect(issues.every((issue) => issue.severity === "warning")).toBe(true);
  });
});

describe("duplicates and batch validation", () => {
  it("groups duplicate non-empty QR content after outer whitespace normalization", () => {
    const records = [
      record(2, "ABC"),
      record(3, " ABC "),
      record(4, ""),
      record(5, ""),
      record(6, "XYZ"),
    ];

    expect(findDuplicateQrContent(records)).toEqual([
      { content: "ABC", rowNumbers: [2, 3] },
    ]);

    const result = validateMappedRecords(records, "text");
    expect(result.duplicateGroups).toEqual([
      { content: "ABC", rowNumbers: [2, 3] },
    ]);
    expect(result.records[0].issues).toContainEqual(
      expect.objectContaining({
        code: "duplicate-qr-content",
        severity: "warning",
        relatedRows: [2, 3],
      }),
    );
    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(2);
    expect(result.validCount).toBe(3);
    expect(hasBlockingErrors(result)).toBe(true);
  });

  it("validates a 500-row batch and keeps duplicate warnings non-blocking", () => {
    const records = Array.from({ length: 500 }, (_, index) =>
      record(
        index + 2,
        `https://example.com/items/${index === 499 ? 0 : index}`,
      ),
    );

    const result = validateMappedRecords(records, "url");

    expect(result.records).toHaveLength(500);
    expect(result.validCount).toBe(500);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(2);
    expect(result.duplicateGroups).toEqual([
      {
        content: "https://example.com/items/0",
        rowNumbers: [2, 501],
      },
    ]);
  });
});
