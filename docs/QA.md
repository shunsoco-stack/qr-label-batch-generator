# 品質確認レポート

最終確認日: 2026-08-24

## 自動検証

`npm run verify`で次を一括実行し、すべて成功しました。

- ESLint
- Next.js route type生成 + TypeScript型検査
- Vitest: 8ファイル / 46テスト
- Next.js 16 Production Build / Static Export

`npm audit --audit-level=high`は`found 0 vulnerabilities`でした。

## ブラウザE2E

- UTF-8 CSV: 日本語、URL、先頭ゼロ付き管理番号を保持して読込
- XLSX: シート名「商品一覧」、日本語、先頭ゼロ付き管理番号を保持して読込
- 手入力: 4行を解析し、重複2件、不正URL1件、空欄1件を期待どおり表示
- Field Mapping: URL、商品名、管理番号、補足を自動推定
- Label Designer: ドラッグ、キーボード移動、サイズ変更、A4印刷領域へのClampを確認
- Template: 保存後に再読込して`localStorage`から復元されることを確認
- Preview: 24件Demoが2ページになり、画面表示1ページ / 印刷DOM 2ページを確認
- A4 PDF: 24件を2ページ、500件を28ページとして実生成
- PDF仕様: `%PDF`シグネチャ、A4 MediaBox、全ページ数を実ファイルで確認
- PDF描画: Chrome PDF Viewerで2ページを表示し、日本語、管理番号、QR、余白を目視確認
- SVG ZIP: 500件を実生成し、500ファイル、管理番号ベースのファイル名、SVG内容を確認
- Responsive: 390 × 844 pxで横方向のページOverflowなし
- axe-core 4.12.1: Desktop / Mobileの主要画面で自動検出Violation 0

## Large Batch実測

- 入力: 500件CSV
- Validation: 500件すべて出力可能
- A4 PDF: 6,464,446 bytes / 28ページ
- SVG ZIP: 464,136 bytes / 500エントリー

処理中はイベントループへ定期的に制御を戻し、進捗表示が更新できる実装にしています。

## 対象領域

| 要件 | 自動テスト | 実ブラウザ |
| --- | --- | --- |
| CSV | Yes | Yes |
| XLSX | Yes | Yes |
| Mapping | Yes | Yes |
| QR | Yes | Yes |
| Duplicate / Validation | Yes | Yes |
| PDF | Yes | Yes |
| Template | Yes | Yes |
| Large Batch | Yes | Yes |

