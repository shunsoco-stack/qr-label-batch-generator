import { describe, expect, it } from "vitest";
import { mapRows } from "./mapping";
import { BUILT_IN_TEMPLATES } from "./template-store";
import { DEMOS, getDemoScenario, getDemoScenarios } from "./demo-data";
import { validateMappedRecords } from "./validation";

describe("demo scenarios", () => {
  it("provides the three required workflows", () => {
    expect(DEMOS.map((demo) => demo.id)).toEqual([
      "asset",
      "product",
      "event",
    ]);
    expect(DEMOS.map((demo) => demo.name)).toEqual([
      "備品ラベル",
      "商品ラベル",
      "イベント受付",
    ]);
  });

  it("maps every demo into valid, unique label records", () => {
    const templateIds = new Set(
      BUILT_IN_TEMPLATES.map((template) => template.id),
    );

    for (const demo of DEMOS) {
      expect(templateIds.has(demo.templateId)).toBe(true);
      const mapped = mapRows(demo.table, demo.mapping);
      const result = validateMappedRecords(mapped, demo.mapping.qrMode);
      expect(mapped.length).toBeGreaterThanOrEqual(3);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.validCount).toBe(mapped.length);
    }
  });

  it("returns defensive copies for interactive demo loading", () => {
    const first = getDemoScenarios();
    first[0].table.rows[0].QR内容 = "changed";
    first[0].mapping.qrContent = "changed";

    const second = getDemoScenario("asset");
    expect(second?.table.rows[0].QR内容).toBe("ASSET-PC-001");
    expect(second?.mapping.qrContent).toBe("QR内容");
    expect(getDemoScenario("event")?.name).toBe("イベント受付");
  });
});
