import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QRコード一括生成・ラベル作成ツール",
    short_name: "QRラベル作成",
    description: "CSV・ExcelからQR付きラベルを一括作成します。",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f3",
    theme_color: "#103f3a",
    lang: "ja",
    icons: [
      {
        src: "/icons/qr-label-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
