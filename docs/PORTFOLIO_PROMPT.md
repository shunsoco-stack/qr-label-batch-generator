# ポートフォリオ掲載用・完全版プロンプト

以下をそのままポートフォリオサイトの実績追加タスクへ使用してください。

---

あなたは、実務で使えるWebアプリケーションを紹介する日本語ポートフォリオサイトの編集者兼フロントエンドエンジニアです。既存サイトのデザインシステム、コンポーネント、データ構造、レスポンシブ仕様を維持したまま、次の制作実績を新規掲載してください。

## 基本情報

- アプリ名: QRコード一括生成・ラベル作成ツール
- 英語補助名: QR Label Batch Generator
- カテゴリ: 業務効率化ツール
- サブカテゴリ: QR・ラベル生成
- 本番URL: https://qr-label-batch-generator.vercel.app
- GitHub Repository: https://github.com/shunsoco-stack/qr-label-batch-generator
- 公開年: 2026
- 提供形態: Local-first Web Application
- ステータス: Production

## 一覧カード用コピー

### 短い説明

CSV・Excelの業務データをField Mappingし、QR付きラベルの一括設計・複数ページPreview・A4 PDF出力までをブラウザ内で完結する業務効率化ツール。

### タグ

- Next.js
- React
- TypeScript
- CSV / XLSX
- QR Code
- PDF
- Local-first
- Vercel

## 詳細ページ用コピー

### リード文

「QRコードを1個作るサイト」ではなく、Business Dataの取り込みから印刷データの完成までを一気通貫で自動化しました。列名が案件ごとに異なるCSV / Excelでも、Field MappingでQR内容・表示名・管理番号・補足へ対応付け、数百件のラベルをまとめて生成できます。

### 課題

備品管理、商品棚、イベント受付などの現場では、台帳データからQRコードを一件ずつ作り、管理番号や名称と組み合わせ、印刷用紙へ整列する作業が発生します。件数が増えるほど転記ミス、重複、レイアウト調整、ファイル管理の負担が大きくなります。また、業務データを外部サーバーへアップロードしたくないケースもあります。

### 解決策

次の工程を一つのガイド付きワークフローとして設計してください。

`Business Data → Mapping → Batch QR → Label Design → Preview → PDF / Print`

データ解析、QR生成、PDF作成、ZIP圧縮をブラウザ内で行うLocal-first構成により、データをサーバーへ送らずに印刷・配布用ファイルを完成できます。

### 主な機能

1. **Data Import**
   - CSV、XLSX、手入力に対応
   - ドラッグ&ドロップと表プレビュー
   - UTF-8 / Shift_JIS CSV、カンマ / タブ / セミコロン区切りを判定
   - 最大5,000件、10 MBまで

2. **Field Mapping**
   - 任意の列をQR内容、表示名、管理番号、補足へ割り当て
   - 列名からMapping候補を自動推定
   - QR内容はURL / Textに対応

3. **Validation / Duplicate Check**
   - QR内容の空欄、不正URL、非対応プロトコル、長すぎる文字列を検証
   - 同じQR内容を行番号付きで警告
   - エラー行を出力対象から自動除外

4. **Batch QR / Label Designer**
   - 数百件のQRコードを一括生成
   - QR、Title、ID、Additional Textをドラッグ移動・サイズ変更
   - 0.5 mmグリッド、数値入力、キーボード操作、表示切替
   - 50 × 30、60 × 40、70 × 36、86 × 54 mmのPresetと任意サイズ

5. **Template**
   - 備品管理、商品ラベル、イベント受付、URL配布の組み込みTemplate
   - 編集したレイアウトをブラウザのlocalStorageへ保存・再利用・削除
   - Templateには業務データを保存しない

6. **Preview / Export**
   - A4用紙へラベルを自動配置し、複数ページを事前確認
   - 日本語対応のA4印刷用PDF
   - ブラウザ印刷
   - QR単体PNG / SVG
   - 全QRのPNG / SVG ZIP
   - 大量処理中の進捗表示

### Demo Mode

次の3種類、各24件の架空データを用意しています。

- 備品ラベル: 備品名、管理番号、設置場所
- 商品ラベル: 商品URL、商品名、SKU、価格情報
- イベント受付: 受付URL、参加者名、受付番号、チケット種別

### 想定利用シーン

- 備品管理・資産管理
- 商品ラベル・商品棚札
- イベント受付
- 棚番号・ロケーション管理
- URL配布
- 在庫管理
- 会員証・受付カード

### Local-first / Privacy

- CSV / XLSXはブラウザ内で解析
- QR、PDF、ZIPも端末内で生成
- 業務データをアプリケーションサーバーへ送信・保存しない
- 保存するのはラベルのサイズ・配置・文字設定のみ
- 静的サイトとしてVercelへ配信

### 技術スタック

- Next.js 16 / App Router / Static Export
- React 19 / TypeScript 5
- SheetJS / encoding-japanese
- qrcode
- jsPDF / JSZip
- Lucide React
- Vitest / Testing Library / ESLint
- Vercel

### 品質保証

以下をテスト対象として明記してください。

- CSV / XLSXの正常系・異常系
- Field Mappingの推定と変換
- QRのMatrix / SVG / PNG生成
- Duplicate CheckとValidation
- 500件のLarge Batch
- A4 PDFのページ分割と日本語描画
- SVG / PNG ZIPの件数とファイル名
- Templateの保存・復元・削除
- ラベルPreset、任意サイズ、A4配置
- Lint、型検査、Production Build

## スクリーンショット

次の5枚をこの順番でギャラリーへ掲載し、PCでは見比べやすいGrid、モバイルでは1列で表示してください。

1. `docs/screenshots/01-data-import.png`
   - タイトル: Data Import
   - キャプション: CSV / XLSX / 手入力と3種類のDemoから業務データを読み込み、内容をその場で確認。

2. `docs/screenshots/02-field-mapping.png`
   - タイトル: Field Mapping
   - キャプション: 列名の異なるデータをQR内容・表示名・管理番号・補足へ対応付け、エラーと重複を事前検証。

3. `docs/screenshots/03-label-designer.png`
   - タイトル: Label Designer
   - キャプション: QR・Title・ID・Additional Textをmm単位で移動・サイズ変更し、実務に必要な範囲へ機能を絞ったEditor。

4. `docs/screenshots/04-multi-label-preview.png`
   - タイトル: Multi-label Preview
   - キャプション: A4上の配置数と複数ページを出力前に確認。

5. `docs/screenshots/05-pdf-export.png`
   - タイトル: PDF / Export
   - キャプション: A4 PDF、ブラウザ印刷、単体PNG / SVG、一括ZIPを端末内で生成。

各画像には具体的な日本語altを設定し、クリック時に拡大表示できるようにしてください。画像の縦横比を維持し、読み込み時のLayout Shiftを避けてください。

## デザイン・アイコン

- アプリのUIはAppleの設計思想を参考にした、静かで精密な業務画面
- 情報階層を明確にした5段階ワークフロー
- 即時フィードバック、控えめなMotion、キーボード操作、Reduced Motionへの配慮
- 専用アイコンはQR + Label / Printerを組み合わせたシンボル
- ポートフォリオ側では既存の色・余白・Typographyへ合わせ、アプリ固有の見た目を無理に持ち込まない

## CTA

詳細ページの目立つ位置に次の2つを設置してください。

- 「アプリを開く」→ https://qr-label-batch-generator.vercel.app
- 「GitHubを見る」→ https://github.com/shunsoco-stack/qr-label-batch-generator

外部リンクは新しいタブで開き、`rel="noopener noreferrer"`を設定してください。

## SEO

- Title案: QRコード一括生成・ラベル作成ツール | 業務効率化ツール
- Description案: CSV・Excelの業務データをField Mappingし、QR付きラベルの一括設計、複数ページPreview、A4 PDF・PNG・SVG・ZIP出力までをブラウザ内で完結するLocal-firstツール。
- Keywords: QRコード一括生成, ラベル作成, CSV, Excel, Field Mapping, A4 PDF, QRラベル, 業務効率化, Local-first

## 表現上のルール

- 「QRコードを1個作るサイト」として紹介しない
- Business DataからPDF / Printまでの業務全体を自動化した点を最上位の価値として扱う
- 実装されていないログイン、クラウド保存、共同編集、分析機能は記載しない
- 実測していない削減率や売上効果などの数値を作らない
- Local-firstは「サーバー送信なし」という具体的な挙動とセットで説明する
- 日本語を主言語とし、Field Mapping、Label Designerなど画面上の英語は必要な範囲で併記する

## 完了条件

- 一覧カードと詳細ページの両方へ掲載されている
- カテゴリ「業務効率化ツール」、サブカテゴリ「QR・ラベル生成」で絞り込める
- 本番URLとGitHub URLが正しく動作する
- 5枚のスクリーンショットが指定順に表示される
- PC / Tablet / Mobileでレイアウトが崩れない
- 画像alt、見出し構造、フォーカス表示、外部リンク属性を確認済み
- 既存ポートフォリオのLint、型検査、テスト、Production Buildが成功する

---

上記の本番URLとGitHub URLをそのまま使用してください。
