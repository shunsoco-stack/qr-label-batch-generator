import type {
  LabelElement,
  LabelPlacement,
  LabelPrintSettings,
  LabelSize,
  LabelTemplate,
  SheetLayout,
} from "./types";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const LABEL_SIZE_PRESETS = [
  { id: "compact", name: "コンパクト 50 × 30 mm", widthMm: 50, heightMm: 30 },
  { id: "standard", name: "標準 60 × 40 mm", widthMm: 60, heightMm: 40 },
  { id: "shelf", name: "棚札 70 × 36 mm", widthMm: 70, heightMm: 36 },
  { id: "card", name: "カード 86 × 54 mm", widthMm: 86, heightMm: 54 },
] as const;

export type LabelSizePresetId = (typeof LABEL_SIZE_PRESETS)[number]["id"];

export class LabelLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabelLayoutError";
  }
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new LabelLayoutError(`${name}には有限の数値を指定してください。`);
  }
}

function validateInputs(
  size: LabelSize,
  print: LabelPrintSettings,
  labelCount: number,
): void {
  assertFinite("ラベル幅", size.widthMm);
  assertFinite("ラベル高さ", size.heightMm);
  assertFinite("余白", print.marginMm);
  assertFinite("間隔", print.gapMm);
  assertFinite("ラベル件数", labelCount);

  if (size.widthMm <= 0 || size.heightMm <= 0) {
    throw new LabelLayoutError("ラベルサイズは0より大きくしてください。");
  }
  if (print.marginMm < 0 || print.gapMm < 0) {
    throw new LabelLayoutError("余白と間隔は0以上にしてください。");
  }
  if (!Number.isInteger(labelCount) || labelCount < 0) {
    throw new LabelLayoutError("ラベル件数は0以上の整数にしてください。");
  }
}

export function calculateA4Layout(
  size: LabelSize,
  print: LabelPrintSettings,
  labelCount: number,
): SheetLayout {
  validateInputs(size, print, labelCount);

  const availableWidth = A4_WIDTH_MM - print.marginMm * 2;
  const availableHeight = A4_HEIGHT_MM - print.marginMm * 2;
  const epsilon = 1e-9;
  const columns = Math.max(
    0,
    Math.floor(
      (availableWidth + print.gapMm + epsilon) /
        (size.widthMm + print.gapMm),
    ),
  );
  const rows = Math.max(
    0,
    Math.floor(
      (availableHeight + print.gapMm + epsilon) /
        (size.heightMm + print.gapMm),
    ),
  );
  const labelsPerPage = columns * rows;

  if (labelsPerPage === 0) {
    throw new LabelLayoutError(
      "指定したラベルサイズ・余白ではA4用紙に配置できません。",
    );
  }

  const placements: LabelPlacement[] = Array.from(
    { length: labelCount },
    (_, recordIndex) => {
      const pageIndex = Math.floor(recordIndex / labelsPerPage);
      const indexOnPage = recordIndex % labelsPerPage;
      const row = Math.floor(indexOnPage / columns);
      const column = indexOnPage % columns;
      return {
        recordIndex,
        pageIndex,
        indexOnPage,
        row,
        column,
        xMm: print.marginMm + column * (size.widthMm + print.gapMm),
        yMm: print.marginMm + row * (size.heightMm + print.gapMm),
        widthMm: size.widthMm,
        heightMm: size.heightMm,
      };
    },
  );

  return {
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    columns,
    rows,
    labelsPerPage,
    pageCount: labelCount === 0 ? 0 : Math.ceil(labelCount / labelsPerPage),
    placements,
  };
}

export function getPagePlacements(
  layout: SheetLayout,
  pageIndex: number,
): LabelPlacement[] {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) return [];
  return layout.placements.filter(
    (placement) => placement.pageIndex === pageIndex,
  );
}

export function isElementInsideLabel(
  element: LabelElement,
  size: LabelSize,
): boolean {
  return (
    element.xMm >= 0 &&
    element.yMm >= 0 &&
    element.widthMm > 0 &&
    element.heightMm > 0 &&
    element.xMm + element.widthMm <= size.widthMm &&
    element.yMm + element.heightMm <= size.heightMm
  );
}

/** Clamp editor values to a printable label while retaining all style fields. */
export function clampElementToLabel(
  element: LabelElement,
  size: LabelSize,
  minimumSizeMm = 2,
): LabelElement {
  const widthMm = Math.min(
    Math.max(element.widthMm, minimumSizeMm),
    size.widthMm,
  );
  const heightMm = Math.min(
    Math.max(element.heightMm, minimumSizeMm),
    size.heightMm,
  );
  return {
    ...element,
    widthMm,
    heightMm,
    xMm: Math.min(Math.max(element.xMm, 0), size.widthMm - widthMm),
    yMm: Math.min(Math.max(element.yMm, 0), size.heightMm - heightMm),
  };
}

export const layoutA4Labels = calculateA4Layout;

export function computeSheetLayout(
  labelCount: number,
  template: Pick<LabelTemplate, "size" | "print">,
): SheetLayout {
  return calculateA4Layout(template.size, template.print, labelCount);
}
