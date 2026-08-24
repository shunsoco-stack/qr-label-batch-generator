import { describe, expect, it } from "vitest";
import type { LabelElement, LabelTemplate } from "./types";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  LABEL_SIZE_PRESETS,
  LabelLayoutError,
  calculateA4Layout,
  clampElementToLabel,
  computeSheetLayout,
  getPagePlacements,
  isElementInsideLabel,
} from "./label-layout";

describe("A4 label placement", () => {
  it("calculates deterministic rows, columns, pages and positions", () => {
    const layout = calculateA4Layout(
      { widthMm: 60, heightMm: 40 },
      { marginMm: 10, gapMm: 2 },
      19,
    );

    expect(layout).toMatchObject({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      columns: 3,
      rows: 6,
      labelsPerPage: 18,
      pageCount: 2,
    });
    expect(layout.placements[0]).toMatchObject({
      recordIndex: 0,
      pageIndex: 0,
      row: 0,
      column: 0,
      xMm: 10,
      yMm: 10,
    });
    expect(layout.placements[17]).toMatchObject({
      pageIndex: 0,
      row: 5,
      column: 2,
      xMm: 134,
      yMm: 220,
    });
    expect(layout.placements[18]).toMatchObject({
      pageIndex: 1,
      indexOnPage: 0,
      xMm: 10,
      yMm: 10,
    });
    expect(getPagePlacements(layout, 0)).toHaveLength(18);
    expect(getPagePlacements(layout, 1)).toHaveLength(1);
  });

  it("returns no pages for an empty dataset while retaining capacity", () => {
    const layout = calculateA4Layout(
      { widthMm: 50, heightMm: 30 },
      { marginMm: 8, gapMm: 2 },
      0,
    );

    expect(layout.pageCount).toBe(0);
    expect(layout.labelsPerPage).toBeGreaterThan(0);
    expect(layout.placements).toEqual([]);
    expect(getPagePlacements(layout, -1)).toEqual([]);
  });

  it("uses a custom-ready template without separate layout math", () => {
    const custom: LabelTemplate = {
      id: "custom",
      name: "カスタム",
      builtIn: false,
      size: { widthMm: 95, heightMm: 50 },
      print: { marginMm: 10, gapMm: 0 },
      elements: [],
    };

    const layout = computeSheetLayout(11, custom);
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(5);
    expect(layout.labelsPerPage).toBe(10);
    expect(layout.pageCount).toBe(2);
  });

  it("rejects impossible, negative and non-integral inputs", () => {
    expect(() =>
      calculateA4Layout(
        { widthMm: 220, heightMm: 20 },
        { marginMm: 0, gapMm: 0 },
        1,
      ),
    ).toThrowError(LabelLayoutError);
    expect(() =>
      calculateA4Layout(
        { widthMm: 50, heightMm: 30 },
        { marginMm: -1, gapMm: 0 },
        1,
      ),
    ).toThrow(/余白/u);
    expect(() =>
      calculateA4Layout(
        { widthMm: 50, heightMm: 30 },
        { marginMm: 0, gapMm: 0 },
        1.5,
      ),
    ).toThrow(/整数/u);
  });

  it("ships four representative size presets", () => {
    expect(LABEL_SIZE_PRESETS).toHaveLength(4);
    expect(LABEL_SIZE_PRESETS.map((preset) => preset.id)).toEqual([
      "compact",
      "standard",
      "shelf",
      "card",
    ]);
  });
});

describe("editor boundary helpers", () => {
  const element: LabelElement = {
    id: "title",
    type: "title",
    xMm: 58,
    yMm: -3,
    widthMm: 10,
    heightMm: 1,
    fontSizePt: 10,
    align: "left",
    visible: true,
  };

  it("clamps an element within a label", () => {
    const clamped = clampElementToLabel(element, {
      widthMm: 60,
      heightMm: 40,
    });
    expect(clamped).toMatchObject({
      xMm: 50,
      yMm: 0,
      widthMm: 10,
      heightMm: 2,
    });
    expect(isElementInsideLabel(clamped, { widthMm: 60, heightMm: 40 })).toBe(
      true,
    );
  });
});
