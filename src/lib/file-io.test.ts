import { describe, expect, it } from "vitest";
import {
  FileImportError,
  createEmptyManualRow,
  createManualTable,
  decodeCsvBuffer,
  detectCsvDelimiter,
  makeUniqueHeaders,
  parseCsvBuffer,
  parseCsvText,
  parseDataFile,
  parseManualText,
  parseWorkbook,
} from "./file-io";

describe("CSV import", () => {
  it("parses quoted commas, escaped quotes, CRLF and embedded newlines", () => {
    const table = parseCsvText(
      'URL,商品名,補足\r\n"https://example.com/a","商品, A","1行目\r\n2行目"\r\n"https://example.com/b","商品 ""B""",在庫あり',
      "products.csv",
    );

    expect(table).toMatchObject({
      sourceName: "products.csv",
      sourceType: "csv",
      headers: ["URL", "商品名", "補足"],
    });
    expect(table.rows).toEqual([
      {
        URL: "https://example.com/a",
        商品名: "商品, A",
        補足: "1行目\n2行目",
      },
      {
        URL: "https://example.com/b",
        商品名: '商品 "B"',
        補足: "在庫あり",
      },
    ]);
  });

  it("removes a BOM and gives empty or duplicate headers stable names", () => {
    const table = parseCsvText(
      "\uFEFFQR内容,管理番号,管理番号,\nA-001,01,02,補足",
    );

    expect(table.headers).toEqual([
      "QR内容",
      "管理番号",
      "管理番号_2",
      "列4",
    ]);
    expect(table.rows[0]["列4"]).toBe("補足");
    expect(makeUniqueHeaders(["A", "A", ""])).toEqual(["A", "A_2", "列3"]);
  });

  it("detects tab-delimited data", () => {
    const text = "URL\t名称\nhttps://example.com\tサンプル";
    expect(detectCsvDelimiter(text)).toBe("\t");
    expect(parseCsvText(text).rows[0].名称).toBe("サンプル");
  });

  it("rejects empty and malformed CSV", () => {
    expect(() => parseCsvText(" \n ")).toThrowError(FileImportError);
    expect(() => parseCsvText('URL,名称\n"https://example.com,未完了')).toThrow(
      /閉じられていません/u,
    );
  });

  it("decodes UTF-8 BOM and Shift_JIS buffers", async () => {
    const utf8 = Uint8Array.from([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("QR内容,表示名\nA-1,備品"),
    ]);
    await expect(decodeCsvBuffer(utf8)).resolves.toMatchObject({
      encoding: "utf-8",
      hadBom: true,
    });

    const encodingModule = await import("encoding-japanese");
    const Encoding = encodingModule.default;
    const shiftJis = Encoding.convert(
      Encoding.stringToCode("QR内容,表示名\nA-1,会議室"),
      { from: "UNICODE", to: "SJIS", type: "array" },
    );
    const table = await parseCsvBuffer(Uint8Array.from(shiftJis), "sjis.csv");
    expect(table.rows[0]).toEqual({ QR内容: "A-1", 表示名: "会議室" });
  });
});

describe("XLSX and file adapters", () => {
  it("parses a selected worksheet and preserves string IDs", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["メモ"], [""]]),
      "案内",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["URL", "商品名", "管理番号"],
        ["https://example.com/001", "商品A", "0012"],
      ]),
      "商品",
    );
    const bytes = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    }) as ArrayBuffer;

    const table = await parseWorkbook(bytes, "products.xlsx", {
      sheetName: "商品",
    });
    expect(table).toMatchObject({
      sourceName: "products.xlsx",
      sourceType: "xlsx",
      sheetName: "商品",
      headers: ["URL", "商品名", "管理番号"],
    });
    expect(table.rows[0].管理番号).toBe("0012");
  });

  it("accepts a browser-like File directly", async () => {
    const bytes = new TextEncoder().encode("URL,名称\nhttps://example.com,テスト");
    const file = {
      name: "sample.csv",
      size: bytes.byteLength,
      type: "text/csv",
      arrayBuffer: async () => bytes.buffer,
    };

    const table = await parseDataFile(file);
    expect(table.sourceType).toBe("csv");
    expect(table.rows).toHaveLength(1);
  });

  it("rejects unsupported formats", async () => {
    const bytes = new TextEncoder().encode("hello");
    await expect(
      parseDataFile(bytes, { name: "sample.txt" }),
    ).rejects.toMatchObject({ code: "unsupported-format" });
  });
});

describe("manual import", () => {
  it("parses pasted CSV as a manual source", () => {
    const table = parseManualText("QR内容,表示名\nA-001,椅子");
    expect(table).toMatchObject({
      sourceName: "手入力",
      sourceType: "manual",
      rows: [{ QR内容: "A-001", 表示名: "椅子" }],
    });
  });

  it("normalizes manual rows and derives extra headers", () => {
    const table = createManualTable([
      { QR内容: "A-001", 表示名: "椅子", 独自列: 10 },
    ]);

    expect(table.sourceType).toBe("manual");
    expect(table.headers).toContain("独自列");
    expect(table.rows[0].独自列).toBe("10");
    expect(createEmptyManualRow()).toEqual({
      QR内容: "",
      表示名: "",
      管理番号: "",
      補足: "",
    });
  });
});
