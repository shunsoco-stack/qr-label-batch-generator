import { describe, expect, it } from "vitest";
import type { FieldMapping, ImportedTable } from "./types";
import {
  createEmptyMapping,
  inferFieldMapping,
  isMappingComplete,
  mapRows,
  mappingUsesUnknownColumns,
} from "./mapping";

const table: ImportedTable = {
  headers: ["商品URL", "商品名", "管理番号", "備考"],
  rows: [
    {
      商品URL: "  https://example.com/item/1  ",
      商品名: "  商品 A ",
      管理番号: " 0012 ",
      備考: " 1行目\r\n2行目 ",
    },
  ],
  sourceName: "products.csv",
  sourceType: "csv",
};

describe("field mapping", () => {
  it("infers common Japanese business headers", () => {
    expect(inferFieldMapping(table.headers)).toEqual({
      qrContent: "商品URL",
      title: "商品名",
      managementId: "管理番号",
      additionalText: "備考",
      qrMode: "url",
    });
  });

  it("supports English headers and an explicit text mode", () => {
    expect(
      inferFieldMapping(
        ["QR Content", "Display_Name", "Asset-ID", "Notes"],
        "text",
      ),
    ).toEqual({
      qrContent: "QR Content",
      title: "Display_Name",
      managementId: "Asset-ID",
      additionalText: "Notes",
      qrMode: "text",
    });
  });

  it("falls back to an ID as text QR content without mapping it twice", () => {
    const inferred = inferFieldMapping(["管理番号", "名称"], "text");
    expect(inferred).toMatchObject({
      qrContent: "管理番号",
      title: "名称",
      managementId: "",
      qrMode: "text",
    });
  });

  it("maps and trims canonical records while preserving source row numbers", () => {
    const mapping = inferFieldMapping(table.headers);
    const records = mapRows(table, mapping);

    expect(records).toEqual([
      {
        rowNumber: 2,
        content: "https://example.com/item/1",
        title: "商品 A",
        managementId: "0012",
        additionalText: "1行目\n2行目",
        issues: [],
      },
    ]);
  });

  it("returns empty optional values and exposes mapping readiness", () => {
    const mapping: FieldMapping = {
      ...createEmptyMapping("text"),
      qrContent: "管理番号",
    };
    const minimal: ImportedTable = {
      headers: ["管理番号"],
      rows: [{ 管理番号: "A-1" }, { 管理番号: "A-2" }],
      sourceName: "manual",
      sourceType: "manual",
    };

    expect(isMappingComplete(minimal, mapping)).toBe(true);
    expect(mapRows(minimal, mapping)[1]).toMatchObject({
      rowNumber: 3,
      content: "A-2",
      title: "",
      managementId: "",
      additionalText: "",
    });
  });

  it("reports columns that disappeared after a re-import", () => {
    const mapping = inferFieldMapping(table.headers);
    expect(mappingUsesUnknownColumns(table, mapping)).toEqual([]);
    expect(
      mappingUsesUnknownColumns(
        { ...table, headers: ["商品URL"] },
        mapping,
      ),
    ).toEqual(["商品名", "管理番号", "備考"]);
  });
});
