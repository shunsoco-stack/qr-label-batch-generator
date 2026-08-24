import QRCode, { type QRCodeErrorCorrectionLevel } from "qrcode";

export const DEFAULT_QR_QUIET_ZONE_MODULES = 4;

export interface QrMatrix {
  /** Number of data modules on one side, excluding the quiet zone. */
  size: number;
  /** Row-major module values. A value of 1 is dark and 0 is light. */
  modules: Uint8Array;
  /** Recommended quiet zone used by the render helpers. */
  quietZoneModules: number;
}

export interface QrGenerationOptions {
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  quietZoneModules?: number;
}

export interface QrSvgOptions extends QrGenerationOptions {
  foreground?: string;
  background?: string;
  title?: string;
}

export interface QrCanvasOptions extends QrGenerationOptions {
  foreground?: string;
  background?: string;
}

function assertQrValue(value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("QR内容を入力してください。");
  }
}

function normalizeQuietZone(value: number | undefined): number {
  const quietZone = value ?? DEFAULT_QR_QUIET_ZONE_MODULES;
  if (!Number.isInteger(quietZone) || quietZone < 0 || quietZone > 32) {
    throw new Error("QRの余白は0〜32の整数で指定してください。");
  }
  return quietZone;
}

function normalizeColor(value: string | undefined, fallback: string): string {
  const color = value ?? fallback;
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(color)) {
    throw new Error("QRの色は6桁または8桁の16進数で指定してください。");
  }
  return color;
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}

export function createQrMatrix(
  value: string,
  options: QrGenerationOptions = {},
): QrMatrix {
  assertQrValue(value);
  const result = QRCode.create(value, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
  });

  return {
    size: result.modules.size,
    modules: Uint8Array.from(result.modules.data, (module) => (module ? 1 : 0)),
    quietZoneModules: normalizeQuietZone(options.quietZoneModules),
  };
}

function createSvgPath(matrix: QrMatrix, quietZoneModules: number): string {
  const commands: string[] = [];

  for (let row = 0; row < matrix.size; row += 1) {
    let runStart = -1;
    for (let column = 0; column <= matrix.size; column += 1) {
      const isDark =
        column < matrix.size &&
        matrix.modules[row * matrix.size + column] === 1;

      if (isDark && runStart < 0) {
        runStart = column;
      } else if (!isDark && runStart >= 0) {
        const runLength = column - runStart;
        commands.push(
          `M${runStart + quietZoneModules} ${row + quietZoneModules}h${runLength}v1h-${runLength}z`,
        );
        runStart = -1;
      }
    }
  }

  return commands.join("");
}

export function qrMatrixToSvg(
  source: string | QrMatrix,
  options: QrSvgOptions = {},
): string {
  const matrix =
    typeof source === "string" ? createQrMatrix(source, options) : source;
  const quietZoneModules = normalizeQuietZone(
    options.quietZoneModules ?? matrix.quietZoneModules,
  );
  const foreground = normalizeColor(options.foreground, "#111827");
  const background = normalizeColor(options.background, "#ffffff");
  const viewBoxSize = matrix.size + quietZoneModules * 2;
  const title = escapeXml(options.title?.trim() || "QRコード");
  const path = createSvgPath(matrix, quietZoneModules);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" role="img" aria-label="${title}" shape-rendering="crispEdges">`,
    `<title>${title}</title>`,
    `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${background}"/>`,
    `<path d="${path}" fill="${foreground}"/>`,
    "</svg>",
  ].join("");
}

export function drawQrMatrixToCanvas(
  context: CanvasRenderingContext2D,
  matrix: QrMatrix,
  x: number,
  y: number,
  size: number,
  options: QrCanvasOptions = {},
): void {
  if (![x, y, size].every(Number.isFinite) || size <= 0) {
    throw new Error("QR描画領域を正しく指定してください。");
  }

  const quietZoneModules = normalizeQuietZone(
    options.quietZoneModules ?? matrix.quietZoneModules,
  );
  const foreground = normalizeColor(options.foreground, "#111827");
  const background = normalizeColor(options.background, "#ffffff");
  const moduleCount = matrix.size + quietZoneModules * 2;

  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = background;
  context.fillRect(x, y, size, size);
  context.fillStyle = foreground;

  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.modules[row * matrix.size + column] !== 1) continue;
      const left =
        x + ((column + quietZoneModules) / moduleCount) * size;
      const top = y + ((row + quietZoneModules) / moduleCount) * size;
      const right =
        x + ((column + quietZoneModules + 1) / moduleCount) * size;
      const bottom =
        y + ((row + quietZoneModules + 1) / moduleCount) * size;
      context.fillRect(left, top, right - left, bottom - top);
    }
  }

  context.restore();
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/u.exec(dataUrl);
  if (!match) throw new Error("PNG画像を生成できませんでした。");

  const mimeType = match[1] || "application/octet-stream";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  if (typeof canvas.toBlob === "function") {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (blob) return blob;
  }

  return dataUrlToBlob(canvas.toDataURL("image/png"));
}

export async function createQrPngBlob(
  value: string,
  size = 1024,
  options: QrCanvasOptions = {},
): Promise<Blob> {
  if (!Number.isInteger(size) || size < 64 || size > 8192) {
    throw new Error("PNGサイズは64〜8192 pxの整数で指定してください。");
  }
  if (typeof document === "undefined") {
    throw new Error("PNG生成にはブラウザのCanvasが必要です。");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvasを初期化できませんでした。");

  const matrix = createQrMatrix(value, options);
  drawQrMatrixToCanvas(context, matrix, 0, 0, size, options);
  return canvasToPngBlob(canvas);
}

export function createQrSvgBlob(
  value: string,
  options: QrSvgOptions = {},
): Blob {
  return new Blob([qrMatrixToSvg(value, options)], {
    type: "image/svg+xml;charset=utf-8",
  });
}

