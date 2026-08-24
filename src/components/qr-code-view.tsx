"use client";

import { useMemo } from "react";
import { createQrMatrix } from "@/lib/qr-generation";

interface QrCodeViewProps {
  value: string;
  className?: string;
  title?: string;
}

export function QrCodeView({ value, className, title = "QRコード" }: QrCodeViewProps) {
  const rendered = useMemo(() => {
    try {
      const matrix = createQrMatrix(value || " ");
      const quiet = matrix.quietZoneModules;
      const commands: string[] = [];

      for (let row = 0; row < matrix.size; row += 1) {
        let runStart = -1;
        for (let column = 0; column <= matrix.size; column += 1) {
          const dark = column < matrix.size && matrix.modules[row * matrix.size + column] === 1;
          if (dark && runStart < 0) runStart = column;
          if (!dark && runStart >= 0) {
            const length = column - runStart;
            commands.push(`M${runStart + quiet} ${row + quiet}h${length}v1h-${length}z`);
            runStart = -1;
          }
        }
      }

      return {
        path: commands.join(""),
        viewBoxSize: matrix.size + quiet * 2,
      };
    } catch {
      return null;
    }
  }, [value]);

  if (!rendered) {
    return <span className={className} aria-label="QRコードを生成できません" />;
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${rendered.viewBoxSize} ${rendered.viewBoxSize}`}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
    >
      <rect width={rendered.viewBoxSize} height={rendered.viewBoxSize} fill="#fff" />
      <path d={rendered.path} fill="#101918" />
    </svg>
  );
}
