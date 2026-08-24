import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "QRコード一括生成・ラベル作成ツール",
  description:
    "CSV・Excelの業務データをField Mappingし、QR付きラベルを一括設計・プレビュー・PDF出力できるLocal-first業務効率化ツールです。",
  applicationName: "QRコード一括生成・ラベル作成ツール",
  keywords: [
    "QRコード一括生成",
    "ラベル作成",
    "CSV",
    "Excel",
    "Field Mapping",
    "PDF",
    "Local-first",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#103f3a",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
