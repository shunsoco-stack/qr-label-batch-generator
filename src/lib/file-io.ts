import type { ImportedTable, SourceType } from "./types";
import type { WorkSheet } from "xlsx";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;
export const CSV_DELIMITERS = [",", "\t", ";"] as const;
export const DEFAULT_MANUAL_HEADERS = [
  "QR内容",
  "表示名",
  "管理番号",
  "補足",
] as const;

export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];
export type BinaryInput = ArrayBuffer | Uint8Array;

export type FileImportErrorCode =
  | "empty-file"
  | "file-too-large"
  | "too-many-rows"
  | "unsupported-format"
  | "missing-header"
  | "csv-parse-error"
  | "xlsx-parse-error"
  | "sheet-not-found"
  | "no-usable-sheet";

export class FileImportError extends Error {
  readonly code: FileImportErrorCode;

  constructor(code: FileImportErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileImportError";
    this.code = code;
  }
}

export interface FileInfo {
  name: string;
  size?: number;
  type?: string;
}

export interface BrowserFileLike extends FileInfo {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface CsvParseOptions {
  delimiter?: CsvDelimiter;
  sourceName?: string;
  skipEmptyRows?: boolean;
}

export interface XlsxParseOptions {
  sheetName?: string;
}

export interface CsvDecodeResult {
  text: string;
  encoding: "utf-8" | "shift-jis";
  hadBom: boolean;
}

type XlsxModule = typeof import("xlsx");

let xlsxModulePromise: Promise<XlsxModule> | undefined;

const UTF8_BOM = Uint8Array.of(0xef, 0xbb, 0xbf);

function toBytes(input: BinaryInput): Uint8Array {
  return input instanceof Uint8Array
    ? input.slice()
    : new Uint8Array(input.slice(0));
}

function byteLength(input: BinaryInput): number {
  return input.byteLength;
}

function isUtf8Bom(bytes: Uint8Array): boolean {
  return (
    bytes.length >= UTF8_BOM.length &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2]
  );
}

async function loadXlsx(): Promise<XlsxModule> {
  xlsxModulePromise ??= import("xlsx").catch((error: unknown) => {
    xlsxModulePromise = undefined;
    throw error;
  });
  return xlsxModulePromise;
}

function isEmptyRow(row: readonly string[]): boolean {
  return row.every((value) => value.length === 0);
}

function hasHeader(row: readonly string[]): boolean {
  return row.some((value) => value.trim().length > 0);
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString();
  }
  return String(value);
}

/** Empty and duplicate headers are made addressable without discarding columns. */
export function makeUniqueHeaders(
  sourceHeaders: readonly unknown[],
  width = sourceHeaders.length,
): string[] {
  const headers: string[] = [];
  const used = new Set<string>();

  for (let index = 0; index < width; index += 1) {
    const normalized = normalizeCell(sourceHeaders[index]).trim();
    const base = normalized || `列${index + 1}`;
    let candidate = base;
    let suffix = 2;

    while (used.has(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }

    used.add(candidate);
    headers.push(candidate);
  }

  return headers;
}

function matrixToTable(
  matrix: readonly (readonly unknown[])[],
  sourceName: string,
  sourceType: SourceType,
  sheetName?: string,
  skipEmptyRows = true,
): ImportedTable {
  const normalizedMatrix = matrix.map((row) => row.map(normalizeCell));
  const headerRow = normalizedMatrix[0] ?? [];

  if (!hasHeader(headerRow)) {
    throw new FileImportError(
      "missing-header",
      "使用できるヘッダー行がありません。",
    );
  }

  const width = normalizedMatrix.reduce(
    (maximum, row) => Math.max(maximum, row.length),
    headerRow.length,
  );
  const headers = makeUniqueHeaders(headerRow, width);
  const rows: Record<string, string>[] = [];

  for (const sourceRow of normalizedMatrix.slice(1)) {
    if (skipEmptyRows && isEmptyRow(sourceRow)) continue;
    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new FileImportError(
        "too-many-rows",
        `一度に読み込める行数は${MAX_IMPORT_ROWS.toLocaleString("ja-JP")}件までです。`,
      );
    }

    const row: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      row[header] = sourceRow[columnIndex] ?? "";
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    sourceName,
    sourceType,
    ...(sheetName ? { sheetName } : {}),
  };
}

function parseCsvRows(source: string, delimiter: CsvDelimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let justClosedQuote = false;
  let rowStarted = false;

  const finishRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
    justClosedQuote = false;
    rowStarted = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else if (character === "\r" || character === "\n") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        field += "\n";
      } else {
        field += character;
      }
      rowStarted = true;
      continue;
    }

    if (justClosedQuote) {
      if (character === delimiter) {
        row.push(field);
        field = "";
        justClosedQuote = false;
        rowStarted = true;
      } else if (character === "\r" || character === "\n") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        finishRow();
      } else {
        throw new FileImportError(
          "csv-parse-error",
          "引用符で囲まれた値の後に区切り文字以外があります。",
        );
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
      rowStarted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
      rowStarted = true;
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      field += character;
      rowStarted = true;
    }
  }

  if (inQuotes) {
    throw new FileImportError(
      "csv-parse-error",
      "CSVの引用符が閉じられていません。",
    );
  }

  if (rowStarted || row.length > 0 || field.length > 0) finishRow();
  return rows;
}

/** Infer a common delimiter using row-width consistency. */
export function detectCsvDelimiter(source: string): CsvDelimiter {
  const sample = source.replace(/^\uFEFF/u, "").slice(0, 128 * 1024);
  let bestDelimiter: CsvDelimiter = ",";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const delimiter of CSV_DELIMITERS) {
    try {
      const rows = parseCsvRows(sample, delimiter)
        .filter((row) => !isEmptyRow(row))
        .slice(0, 32);
      if (rows.length === 0 || rows[0].length <= 1) continue;

      const width = rows[0].length;
      const consistent = rows.filter((row) => row.length === width).length;
      const score = consistent * 100 + width * 10 - (rows.length - consistent) * 25;
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    } catch {
      // The selected delimiter is validated again by the complete parse.
    }
  }

  return bestDelimiter;
}

export function parseCsvText(
  source: string,
  nameOrOptions: string | CsvParseOptions = {},
): ImportedTable {
  const options =
    typeof nameOrOptions === "string"
      ? { sourceName: nameOrOptions }
      : nameOrOptions;
  const text = source.replace(/^\uFEFF/u, "");
  if (text.trim().length === 0) {
    throw new FileImportError("empty-file", "CSVファイルが空です。");
  }

  const delimiter = options.delimiter ?? detectCsvDelimiter(text);
  const rows = parseCsvRows(text, delimiter);
  const filteredRows = (options.skipEmptyRows ?? true)
    ? rows.filter((row) => !isEmptyRow(row))
    : rows;

  return matrixToTable(
    filteredRows,
    options.sourceName ?? "data.csv",
    "csv",
    undefined,
    options.skipEmptyRows,
  );
}

/** Decode as strict UTF-8 first and fall back to Shift_JIS. */
export async function decodeCsvBuffer(input: BinaryInput): Promise<CsvDecodeResult> {
  const bytes = toBytes(input);
  const hadBom = isUtf8Bom(bytes);
  const content = hadBom ? bytes.slice(UTF8_BOM.length) : bytes;

  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(content),
      encoding: "utf-8",
      hadBom,
    };
  } catch {
    const encodingModule = await import("encoding-japanese");
    const Encoding = encodingModule.default;
    const unicodeCodes = Encoding.convert(Array.from(content), {
      from: "SJIS",
      to: "UNICODE",
      type: "array",
    });
    return {
      text: Encoding.codeToString(unicodeCodes),
      encoding: "shift-jis",
      hadBom: false,
    };
  }
}

export async function parseCsvBuffer(
  input: BinaryInput,
  sourceName = "data.csv",
): Promise<ImportedTable> {
  assertAcceptedSize({ name: sourceName }, byteLength(input));
  const decoded = await decodeCsvBuffer(input);
  return parseCsvText(decoded.text, { sourceName });
}

function worksheetToMatrix(
  xlsx: XlsxModule,
  worksheet: WorkSheet,
): string[][] {
  return xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }).map((row) => row.map(normalizeCell));
}

export async function getXlsxSheetNames(input: BinaryInput): Promise<string[]> {
  const xlsx = await loadXlsx();
  try {
    const workbook = xlsx.read(toBytes(input), {
      type: "array",
      cellDates: true,
      cellText: true,
    });
    return [...workbook.SheetNames];
  } catch (error) {
    throw new FileImportError(
      "xlsx-parse-error",
      "Excelファイルを解析できませんでした。",
      { cause: error },
    );
  }
}

export async function parseXlsxBuffer(
  input: BinaryInput,
  sourceName = "data.xlsx",
  options: XlsxParseOptions = {},
): Promise<ImportedTable> {
  assertAcceptedSize({ name: sourceName }, byteLength(input));
  const xlsx = await loadXlsx();

  try {
    const workbook = xlsx.read(toBytes(input), {
      type: "array",
      cellDates: true,
      cellText: true,
    });

    if (options.sheetName && !workbook.SheetNames.includes(options.sheetName)) {
      throw new FileImportError(
        "sheet-not-found",
        `シート「${options.sheetName}」が見つかりません。`,
      );
    }

    const candidates = options.sheetName
      ? [options.sheetName]
      : workbook.SheetNames;

    for (const sheetName of candidates) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;
      const matrix = worksheetToMatrix(xlsx, worksheet);
      try {
        return matrixToTable(matrix, sourceName, "xlsx", sheetName);
      } catch (error) {
        if (
          error instanceof FileImportError &&
          error.code === "missing-header" &&
          !options.sheetName
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new FileImportError(
      "no-usable-sheet",
      "Excelファイルに使用できるシートがありません。",
    );
  } catch (error) {
    if (error instanceof FileImportError) throw error;
    throw new FileImportError(
      "xlsx-parse-error",
      `Excelファイルを解析できませんでした: ${sourceName}`,
      { cause: error },
    );
  }
}

export async function parseWorkbook(
  input: BinaryInput,
  sourceName = "data.xlsx",
  options: XlsxParseOptions = {},
): Promise<ImportedTable> {
  return parseXlsxBuffer(input, sourceName, options);
}

export function detectSourceType(file: FileInfo): Exclude<SourceType, "manual"> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv" || extension === "xlsx") return extension;

  if (!file.name.includes(".")) {
    const mime = file.type?.toLowerCase() ?? "";
    if (mime === "text/csv" || mime.includes("/csv")) return "csv";
    if (
      mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return "xlsx";
    }
  }

  throw new FileImportError(
    "unsupported-format",
    "CSVまたはXLSXファイルを選択してください。",
  );
}

function assertAcceptedSize(file: FileInfo, actualSize?: number): void {
  const size = Math.max(file.size ?? 0, actualSize ?? 0);
  if (size === 0) {
    throw new FileImportError("empty-file", `ファイルが空です: ${file.name}`);
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new FileImportError(
      "file-too-large",
      `ファイルサイズは${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB以下にしてください。`,
    );
  }
}

async function parseDataBytes(
  input: BinaryInput,
  file: FileInfo,
  options: XlsxParseOptions = {},
): Promise<ImportedTable> {
  assertAcceptedSize(file, byteLength(input));
  const sourceType = detectSourceType(file);
  return sourceType === "csv"
    ? parseCsvBuffer(input, file.name)
    : parseXlsxBuffer(input, file.name, options);
}

export function parseDataFile(
  file: BrowserFileLike,
  options?: XlsxParseOptions,
): Promise<ImportedTable>;
export function parseDataFile(
  input: BinaryInput,
  file: FileInfo,
  options?: XlsxParseOptions,
): Promise<ImportedTable>;
export async function parseDataFile(
  inputOrFile: BinaryInput | BrowserFileLike,
  fileOrOptions: FileInfo | XlsxParseOptions = {},
  options: XlsxParseOptions = {},
): Promise<ImportedTable> {
  if (
    typeof inputOrFile === "object" &&
    "arrayBuffer" in inputOrFile &&
    typeof inputOrFile.arrayBuffer === "function"
  ) {
    const file = inputOrFile;
    const browserOptions = fileOrOptions as XlsxParseOptions;
    detectSourceType(file);
    if (file.size !== undefined) assertAcceptedSize(file);
    return parseDataBytes(await file.arrayBuffer(), file, browserOptions);
  }

  return parseDataBytes(
    inputOrFile as BinaryInput,
    fileOrOptions as FileInfo,
    options,
  );
}

export async function parseBrowserFile(
  file: BrowserFileLike,
  options: XlsxParseOptions = {},
): Promise<ImportedTable> {
  return parseDataFile(file, options);
}

export function createManualTable(
  rows: readonly Record<string, unknown>[] = [],
  headers: readonly string[] = DEFAULT_MANUAL_HEADERS,
  sourceName = "手入力",
): ImportedTable {
  const derivedHeaders = [...headers];
  for (const row of rows) {
    for (const header of Object.keys(row)) {
      if (!derivedHeaders.includes(header)) derivedHeaders.push(header);
    }
  }
  const uniqueHeaders = makeUniqueHeaders(derivedHeaders);

  return {
    headers: uniqueHeaders,
    rows: rows.map((sourceRow) => {
      const row: Record<string, string> = {};
      uniqueHeaders.forEach((header) => {
        row[header] = normalizeCell(sourceRow[header]);
      });
      return row;
    }),
    sourceName,
    sourceType: "manual",
  };
}

export function parseManualText(
  source: string,
  sourceName = "手入力",
): ImportedTable {
  return {
    ...parseCsvText(source, { sourceName }),
    sourceType: "manual",
  };
}

export function createEmptyManualRow(
  headers: readonly string[] = DEFAULT_MANUAL_HEADERS,
): Record<string, string> {
  return Object.fromEntries(headers.map((header) => [header, ""]));
}

export const readDataFile = parseDataFile;
export const readBrowserFile = parseBrowserFile;
