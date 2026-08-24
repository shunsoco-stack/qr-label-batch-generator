import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LabelRecord, LabelTemplate, ValidationIssue } from "./types";
import {
  generatePdfBlob,
  generateQrZipBlob,
  getExportableRecords,
  safeFileName,
  type ExportProgress,
} from "./export-files";

const pdfState = vi.hoisted(() => ({
  instances: [] as Array<{
    addPage: ReturnType<typeof vi.fn>;
    addImage: ReturnType<typeof vi.fn>;
    output: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("jspdf", () => ({
  jsPDF: function MockJsPdf() {
    const bytes = new TextEncoder().encode("%PDF-1.7\n% test PDF");
    const instance = {
      addPage: vi.fn(),
      addImage: vi.fn(),
      output: vi.fn(() => bytes.buffer),
    };
    pdfState.instances.push(instance);
    return instance;
  },
}));

const TEST_TEMPLATE: LabelTemplate = {
  id: "test",
  name: "テスト",
  builtIn: false,
  size: { widthMm: 100, heightMm: 100 },
  print: { marginMm: 5, gapMm: 0 },
  elements: [
    {
      id: "qr",
      type: "qr",
      xMm: 4,
      yMm: 4,
      widthMm: 35,
      heightMm: 35,
      fontSizePt: 10,
      align: "center",
      visible: true,
    },
    {
      id: "title",
      type: "title",
      xMm: 42,
      yMm: 5,
      widthMm: 52,
      heightMm: 18,
      fontSizePt: 12,
      align: "left",
      visible: true,
    },
    {
      id: "id",
      type: "id",
      xMm: 42,
      yMm: 26,
      widthMm: 52,
      heightMm: 12,
      fontSizePt: 9,
      align: "left",
      visible: true,
    },
    {
      id: "additional",
      type: "additional",
      xMm: 5,
      yMm: 44,
      widthMm: 89,
      heightMm: 45,
      fontSizePt: 8,
      align: "left",
      visible: true,
    },
  ],
};

function makeRecord(
  index: number,
  overrides: Partial<LabelRecord> = {},
): LabelRecord {
  return {
    rowNumber: index + 1,
    content: `https://example.com/items/${index + 1}`,
    title: `備品ラベル ${index + 1}`,
    managementId: `AST-${String(index + 1).padStart(3, "0")}`,
    additionalText: "総務部で管理しています",
    issues: [],
    ...overrides,
  };
}

function errorIssue(): ValidationIssue {
  return {
    code: "invalid-url",
    severity: "error",
    field: "content",
    message: "URLが不正です。",
  };
}

async function readBlob(blob: Blob): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}

describe("export file helpers", () => {
  beforeEach(() => {
    pdfState.instances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates deterministic cross-platform safe names", () => {
    expect(safeFileName("  備品 / A:01  ", 0)).toBe("備品-A-01");
    expect(safeFileName("CON", 0)).toBe("_CON");
    expect(safeFileName("***", 7)).toBe("qr-008");
    expect(safeFileName("A".repeat(150), 0)).toHaveLength(96);
  });

  it("excludes blocking errors while keeping warnings exportable", () => {
    const warning: ValidationIssue = {
      code: "duplicate-qr-content",
      severity: "warning",
      message: "重複しています。",
    };
    const records = [
      makeRecord(0),
      makeRecord(1, { issues: [warning] }),
      makeRecord(2, { issues: [errorIssue()] }),
    ];

    expect(getExportableRecords(records).map((record) => record.rowNumber)).toEqual([
      1,
      2,
    ]);
  });

  it("rasterizes Japanese labels onto every A4 print-plan page", async () => {
    const fillText = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillText,
      measureText: vi.fn((text: string) => ({ width: [...text].length * 8 })),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "left",
      textBaseline: "top",
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);

    const progress: ExportProgress[] = [];
    const blob = await generatePdfBlob(
      Array.from({ length: 5 }, (_, index) => makeRecord(index)),
      TEST_TEMPLATE,
      (event) => progress.push(event),
    );
    const bytes = await readBlob(blob);
    const instance = pdfState.instances[0];

    expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe("%PDF-1.7");
    expect(blob.type).toBe("application/pdf");
    expect(instance.addPage).toHaveBeenCalledTimes(1);
    expect(instance.addImage).toHaveBeenCalledTimes(2);
    expect(fillText.mock.calls.some(([text]) => String(text).includes("備品"))).toBe(
      true,
    );
    expect(progress.at(-1)).toMatchObject({
      stage: "rendering-pdf",
      completed: 2,
      total: 2,
      percent: 100,
    });
  });

  it("creates one collision-safe SVG per valid record in a ZIP", async () => {
    const progress: ExportProgress[] = [];
    const records = [
      makeRecord(0, { managementId: "DUPLICATE" }),
      makeRecord(1, { managementId: "duplicate" }),
      makeRecord(2, { managementId: "duplicate-2" }),
      makeRecord(3, { managementId: "SKIP", issues: [errorIssue()] }),
    ];
    const blob = await generateQrZipBlob(records, "svg", (event) =>
      progress.push(event),
    );
    const bytes = await readBlob(blob);
    const { default: JSZip } = await import("jszip");
    const archive = await JSZip.loadAsync(bytes);
    const names = Object.values(archive.files)
      .filter((file) => !file.dir)
      .map((file) => file.name)
      .sort();

    expect(blob.type).toBe("application/zip");
    expect(names).toEqual([
      "DUPLICATE.svg",
      "duplicate-2-2.svg",
      "duplicate-2.svg",
    ]);
    await expect(archive.file("DUPLICATE.svg")?.async("string")).resolves.toContain(
      "<svg",
    );
    expect(progress.at(-1)).toMatchObject({
      stage: "creating-zip",
      completed: 4,
      total: 4,
      percent: 100,
    });
  });
});
