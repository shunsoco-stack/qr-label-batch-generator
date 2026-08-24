import type {
  DuplicateGroup,
  LabelRecord,
  QrMode,
  ValidationIssue,
  ValidationResult,
} from "./types";

export const MAX_QR_CONTENT_BYTES = 2_048;
export const MAX_TITLE_CHARACTERS = 100;
export const MAX_MANAGEMENT_ID_CHARACTERS = 64;
export const MAX_ADDITIONAL_TEXT_CHARACTERS = 300;

function characterCount(value: string): number {
  return [...value].length;
}

export function qrContentByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function validateQrContent(content: string, qrMode: QrMode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalized = content.trim();

  if (!normalized) {
    issues.push({
      code: "empty-qr-content",
      severity: "error",
      field: "content",
      message: "QR内容が空欄です。",
    });
    return issues;
  }

  if (qrContentByteLength(normalized) > MAX_QR_CONTENT_BYTES) {
    issues.push({
      code: "qr-content-too-long",
      severity: "error",
      field: "content",
      message: `QR内容はUTF-8で${MAX_QR_CONTENT_BYTES.toLocaleString("ja-JP")}バイト以内にしてください。`,
    });
  }

  if (qrMode === "url") {
    try {
      const url = new URL(normalized);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        issues.push({
          code: "unsupported-url-protocol",
          severity: "error",
          field: "content",
          message: "URLはhttp://またはhttps://で始めてください。",
        });
      }
    } catch {
      issues.push({
        code: "invalid-url",
        severity: "error",
        field: "content",
        message: "有効なURLを入力してください。",
      });
    }
  }

  return issues;
}

export function validateRecord(
  record: LabelRecord,
  qrMode: QrMode,
): ValidationIssue[] {
  const issues = validateQrContent(record.content, qrMode);

  if (characterCount(record.title) > MAX_TITLE_CHARACTERS) {
    issues.push({
      code: "title-too-long",
      severity: "warning",
      field: "title",
      message: `表示名が${MAX_TITLE_CHARACTERS}文字を超えています。ラベル内で省略される可能性があります。`,
    });
  }

  if (
    characterCount(record.managementId) > MAX_MANAGEMENT_ID_CHARACTERS
  ) {
    issues.push({
      code: "management-id-too-long",
      severity: "warning",
      field: "managementId",
      message: `管理番号が${MAX_MANAGEMENT_ID_CHARACTERS}文字を超えています。`,
    });
  }

  if (
    characterCount(record.additionalText) > MAX_ADDITIONAL_TEXT_CHARACTERS
  ) {
    issues.push({
      code: "additional-text-too-long",
      severity: "warning",
      field: "additionalText",
      message: `補足が${MAX_ADDITIONAL_TEXT_CHARACTERS}文字を超えています。ラベル内で省略される可能性があります。`,
    });
  }

  return issues;
}

function duplicateKey(content: string): string {
  return content.trim();
}

export function findDuplicateQrContent(
  records: readonly LabelRecord[],
): DuplicateGroup[] {
  const groups = new Map<string, number[]>();

  for (const record of records) {
    const key = duplicateKey(record.content);
    if (!key) continue;
    const rowNumbers = groups.get(key) ?? [];
    rowNumbers.push(record.rowNumber);
    groups.set(key, rowNumbers);
  }

  return [...groups.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([content, rowNumbers]) => ({ content, rowNumbers }));
}

export function validateRecords(
  records: readonly LabelRecord[],
  qrMode: QrMode,
): ValidationResult {
  const duplicateGroups = findDuplicateQrContent(records);
  const duplicatesByContent = new Map(
    duplicateGroups.map((group) => [group.content, group.rowNumbers]),
  );

  const validatedRecords = records.map((record) => {
    const issues = validateRecord(record, qrMode);
    const relatedRows = duplicatesByContent.get(duplicateKey(record.content));
    if (relatedRows) {
      issues.push({
        code: "duplicate-qr-content",
        severity: "warning",
        field: "content",
        relatedRows: [...relatedRows],
        message: `同じQR内容が行${relatedRows.join("、")}にあります。`,
      });
    }

    return { ...record, issues };
  });

  const allIssues = validatedRecords.flatMap((record) => record.issues);
  return {
    records: validatedRecords,
    duplicateGroups,
    errorCount: allIssues.filter((issue) => issue.severity === "error").length,
    warningCount: allIssues.filter((issue) => issue.severity === "warning").length,
    validCount: validatedRecords.filter((record) =>
      record.issues.every((issue) => issue.severity !== "error"),
    ).length,
  };
}

export function hasBlockingErrors(result: ValidationResult): boolean {
  return result.errorCount > 0;
}

export const validateLabelRecords = validateRecords;
export const validateMappedRecords = validateRecords;
