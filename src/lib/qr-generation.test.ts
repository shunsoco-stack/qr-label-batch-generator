import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createQrMatrix,
  createQrPngBlob,
  qrMatrixToSvg,
} from "./qr-generation";

describe("QR generation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a deterministic square matrix with the standard quiet zone", () => {
    const first = createQrMatrix("https://example.com/assets/A-001");
    const second = createQrMatrix("https://example.com/assets/A-001");

    expect(first.size).toBeGreaterThanOrEqual(21);
    expect(first.modules).toHaveLength(first.size * first.size);
    expect(first.modules).toEqual(second.modules);
    expect(first.quietZoneModules).toBe(4);
    expect([...first.modules]).toContain(1);
    expect([...first.modules]).toContain(0);
  });

  it("renders a compact SVG with a four-module quiet zone and escaped title", () => {
    const matrix = createQrMatrix("棚-A-01");
    const svg = qrMatrixToSvg(matrix, { title: '棚札 <A & "01">' });
    const expectedViewBox = matrix.size + 8;

    expect(svg).toContain(
      `viewBox="0 0 ${expectedViewBox} ${expectedViewBox}"`,
    );
    expect(svg).toContain("shape-rendering=\"crispEdges\"");
    expect(svg).toContain("M4 4");
    expect(svg).toContain("棚札 &lt;A &amp; &quot;01&quot;&gt;");
    expect(svg).toContain('<rect width="');
    expect(svg).toContain('<path d="');
  });

  it("creates a PNG Blob through a browser canvas", async () => {
    const fillRect = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect,
      imageSmoothingEnabled: true,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(new Blob([new Uint8Array([137, 80, 78, 71])], {
        type: "image/png",
      })),
    );

    const blob = await createQrPngBlob("https://example.com", 256);

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(4);
    expect(fillRect).toHaveBeenCalled();
  });

  it("rejects empty values and unsafe rendering options", () => {
    expect(() => createQrMatrix("")).toThrow("QR内容");
    expect(() => qrMatrixToSvg("value", { quietZoneModules: -1 })).toThrow(
      "余白",
    );
    expect(() => qrMatrixToSvg("value", { foreground: "url(script)" })).toThrow(
      "16進数",
    );
  });
});

