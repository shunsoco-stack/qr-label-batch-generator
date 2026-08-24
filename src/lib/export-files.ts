import { computeSheetLayout } from "./label-layout";
import {
  createQrMatrix,
  createQrPngBlob,
  createQrSvgBlob,
  drawQrMatrixToCanvas,
} from "./qr-generation";
import type {
  LabelElement,
  LabelPlacement,
  LabelRecord,
  LabelTemplate,
} from "./types";

export type QrArchiveFormat = "svg" | "png";

export type ExportProgressStage =
  | "rendering-pdf"
  | "generating-qr"
  | "creating-zip";

export interface ExportProgress {
  stage: ExportProgressStage;
  completed: number;
  total: number;
  percent: number;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PDF_RENDER_DPI = 144;
const PNG_EXPORT_SIZE_PX = 1024;
const MAX_FILE_NAME_CHARACTERS = 96;

function isValidRecord(record: LabelRecord): boolean {
  return record.issues.every((issue) => issue.severity !== "error");
}

export function getExportableRecords(
  records: readonly LabelRecord[],
): LabelRecord[] {
  return records.filter(isValidRecord);
}

function compactDashes(value: string): string {
  return value.replace(/-+/gu, "-").replace(/^[-. ]+|[-. ]+$/gu, "");
}

function isReservedWindowsName(value: string): boolean {
  return /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value);
}

/** Returns an extension-free file name that is stable for the same input. */
export function safeFileName(value: string, index = 0): string {
  const normalized = compactDashes(
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/gu, "-")
      .replace(/\s+/gu, "-")
      .trim(),
  );
  const shortened = [...normalized].slice(0, MAX_FILE_NAME_CHARACTERS).join("");
  const fallback = `qr-${String(Math.max(0, index) + 1).padStart(3, "0")}`;
  const candidate = shortened || fallback;
  return isReservedWindowsName(candidate) ? `_${candidate}` : candidate;
}

function uniqueArchiveName(
  baseName: string,
  extension: QrArchiveFormat,
  usedNames: Set<string>,
): string {
  let suffix = 1;
  let candidate = baseName;
  while (usedNames.has(candidate.toLocaleLowerCase("ja-JP"))) {
    suffix += 1;
    candidate = `${baseName}-${suffix}`;
  }
  usedNames.add(candidate.toLocaleLowerCase("ja-JP"));
  return `${candidate}.${extension}`;
}

function reportProgress(
  callback: ExportProgressCallback | undefined,
  stage: ExportProgressStage,
  completed: number,
  total: number,
): void {
  const percent = total === 0 ? 100 : Math.min(100, (completed / total) * 100);
  callback?.({ stage, completed, total, percent });
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("ダウンロードにはブラウザ環境が必要です。");
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Keep the object URL alive until the browser has handed the file to its
  // download manager. Revoking in the same task can cancel larger PDF/ZIP
  // downloads in Chromium.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

function elementText(record: LabelRecord, element: LabelElement): string {
  switch (element.type) {
    case "title":
      return record.title;
    case "id":
      return record.managementId;
    case "additional":
      return record.additionalText;
    default:
      return "";
  }
}

function fitLineWithEllipsis(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  if (context.measureText(value).width <= maxWidth) return value;
  const characters = [...value];
  while (characters.length > 0) {
    characters.pop();
    const candidate = `${characters.join("")}…`;
    if (context.measureText(candidate).width <= maxWidth) return candidate;
  }
  return "";
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (maxLines <= 0 || maxWidth <= 0) return [];
  const lines: string[] = [];

  for (const paragraph of value.replace(/\r\n?/gu, "\n").split("\n")) {
    if (lines.length >= maxLines) break;
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const character of [...paragraph]) {
      const candidate = `${line}${character}`;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
        if (lines.length >= maxLines) break;
      } else {
        line = candidate;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
  }

  const normalizedText = value.replace(/\r\n?/gu, "\n");
  const renderedText = lines.join("\n");
  if (renderedText.length < normalizedText.length && lines.length > 0) {
    lines[lines.length - 1] = fitLineWithEllipsis(
      context,
      lines[lines.length - 1],
      maxWidth,
    );
  }
  return lines.slice(0, maxLines);
}

function renderTextElement(
  context: CanvasRenderingContext2D,
  record: LabelRecord,
  element: LabelElement,
  labelX: number,
  labelY: number,
  pixelsPerMm: number,
): void {
  const text = elementText(record, element);
  if (!text) return;

  const x = labelX + element.xMm * pixelsPerMm;
  const y = labelY + element.yMm * pixelsPerMm;
  const width = element.widthMm * pixelsPerMm;
  const height = element.heightMm * pixelsPerMm;
  const fontSizePx = Math.max(1, (element.fontSizePt * PDF_RENDER_DPI) / 72);
  const lineHeight = fontSizePx * 1.25;
  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  const fontWeight = element.type === "title" ? 700 : element.type === "id" ? 650 : 400;

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = "#111827";
  context.font = `${fontWeight} ${fontSizePx}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif`;
  context.textAlign = element.align;
  context.textBaseline = "top";

  const textX =
    element.align === "center"
      ? x + width / 2
      : element.align === "right"
        ? x + width
        : x;
  const lines = wrapText(context, text, width, maxLines);
  lines.forEach((line, lineIndex) => {
    context.fillText(line, textX, y + lineIndex * lineHeight, width);
  });
  context.restore();
}

function renderQrElement(
  context: CanvasRenderingContext2D,
  record: LabelRecord,
  element: LabelElement,
  labelX: number,
  labelY: number,
  pixelsPerMm: number,
): void {
  const width = element.widthMm * pixelsPerMm;
  const height = element.heightMm * pixelsPerMm;
  const size = Math.min(width, height);
  const x = labelX + element.xMm * pixelsPerMm + (width - size) / 2;
  const y = labelY + element.yMm * pixelsPerMm + (height - size) / 2;
  drawQrMatrixToCanvas(
    context,
    createQrMatrix(record.content),
    x,
    y,
    size,
  );
}

function renderLabel(
  context: CanvasRenderingContext2D,
  record: LabelRecord,
  template: LabelTemplate,
  placement: LabelPlacement,
  pixelsPerMm: number,
): void {
  const x = placement.xMm * pixelsPerMm;
  const y = placement.yMm * pixelsPerMm;
  const width = placement.widthMm * pixelsPerMm;
  const height = placement.heightMm * pixelsPerMm;

  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(x, y, width, height);
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = Math.max(0.5, pixelsPerMm * 0.12);
  context.strokeRect(x, y, width, height);
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();

  for (const element of template.elements) {
    if (!element.visible) continue;
    if (element.type === "qr") {
      renderQrElement(context, record, element, x, y, pixelsPerMm);
    } else {
      renderTextElement(context, record, element, x, y, pixelsPerMm);
    }
  }
  context.restore();
}

function createPageCanvas(
  records: readonly LabelRecord[],
  template: LabelTemplate,
  placements: readonly LabelPlacement[],
): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new Error("PDF生成にはブラウザのCanvasが必要です。");
  }

  const pixelsPerMm = PDF_RENDER_DPI / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(A4_WIDTH_MM * pixelsPerMm);
  canvas.height = Math.round(A4_HEIGHT_MM * pixelsPerMm);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF用Canvasを初期化できませんでした。");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  placements.forEach((placement) => {
    const record = records[placement.recordIndex];
    if (record) renderLabel(context, record, template, placement, pixelsPerMm);
  });
  return canvas;
}

/**
 * Creates an A4 PDF entirely in the browser. Each page is rasterized through
 * Canvas first so Japanese and other system-font text remains printable
 * without shipping a large embedded PDF font.
 */
export async function generatePdfBlob(
  records: readonly LabelRecord[],
  template: LabelTemplate,
  onProgress?: ExportProgressCallback,
): Promise<Blob> {
  const exportableRecords = getExportableRecords(records);
  if (exportableRecords.length === 0) {
    throw new Error("PDFへ出力できる有効なラベルがありません。");
  }

  const layout = computeSheetLayout(exportableRecords.length, template);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  reportProgress(onProgress, "rendering-pdf", 0, layout.pageCount);

  for (let pageIndex = 0; pageIndex < layout.pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage("a4", "portrait");
    const placements = layout.placements.filter(
      (placement) => placement.pageIndex === pageIndex,
    );
    const canvas = createPageCanvas(exportableRecords, template, placements);
    pdf.addImage(canvas, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "FAST");
    reportProgress(
      onProgress,
      "rendering-pdf",
      pageIndex + 1,
      layout.pageCount,
    );
    await yieldToBrowser();
  }

  const bytes = pdf.output("arraybuffer");
  return new Blob([bytes], { type: "application/pdf" });
}

function suggestedRecordName(record: LabelRecord, index: number): string {
  return safeFileName(
    record.managementId || record.title || record.content,
    record.rowNumber > 0 ? record.rowNumber - 1 : index,
  );
}

export async function generateQrZipBlob(
  records: readonly LabelRecord[],
  format: QrArchiveFormat,
  onProgress?: ExportProgressCallback,
): Promise<Blob> {
  if (format !== "svg" && format !== "png") {
    throw new Error("ZIP形式はSVGまたはPNGを指定してください。");
  }
  const exportableRecords = getExportableRecords(records);
  if (exportableRecords.length === 0) {
    throw new Error("ZIPへ出力できる有効なQRコードがありません。");
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const totalWork = exportableRecords.length + 1;
  reportProgress(onProgress, "generating-qr", 0, totalWork);

  for (let index = 0; index < exportableRecords.length; index += 1) {
    const record = exportableRecords[index];
    const name = uniqueArchiveName(
      suggestedRecordName(record, index),
      format,
      usedNames,
    );
    const blob =
      format === "svg"
        ? createQrSvgBlob(record.content, {
            title: record.title || record.managementId || "QRコード",
          })
        : await createQrPngBlob(record.content, PNG_EXPORT_SIZE_PX);
    zip.file(name, blob);
    reportProgress(onProgress, "generating-qr", index + 1, totalWork);
    if ((index + 1) % 25 === 0) await yieldToBrowser();
  }

  const zipBytes = await zip.generateAsync(
    {
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      mimeType: "application/zip",
    },
    (metadata) => {
      reportProgress(
        onProgress,
        "creating-zip",
        exportableRecords.length + metadata.percent / 100,
        totalWork,
      );
    },
  );
  reportProgress(onProgress, "creating-zip", totalWork, totalWork);
  const zipBuffer = new ArrayBuffer(zipBytes.byteLength);
  new Uint8Array(zipBuffer).set(zipBytes);
  return new Blob([zipBuffer], { type: "application/zip" });
}
