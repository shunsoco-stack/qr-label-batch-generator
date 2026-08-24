"use client";

import {
  FileSpreadsheet,
  Keyboard,
  Package,
  ShieldCheck,
  ShoppingBag,
  TicketCheck,
  UploadCloud,
} from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import type { DemoScenario, ImportedTable } from "@/lib/types";

interface DataImportPanelProps {
  table: ImportedTable;
  demos: readonly DemoScenario[];
  activeDemoId: string | null;
  isReading: boolean;
  importError: string | null;
  manualText: string;
  onDemoSelect: (demo: DemoScenario) => void;
  onFileSelect: (file: File) => void;
  onManualTextChange: (value: string) => void;
  onParseManual: () => void;
}

const demoIcons = {
  asset: Package,
  product: ShoppingBag,
  event: TicketCheck,
} as const;

function formatSourceType(table: ImportedTable): string {
  if (table.sourceType === "xlsx") return `XLSX${table.sheetName ? ` · ${table.sheetName}` : ""}`;
  if (table.sourceType === "csv") return "CSV";
  return "手入力 / Demo";
}

export function DataImportPanel({
  table,
  demos,
  activeDemoId,
  isReading,
  importError,
  manualText,
  onDemoSelect,
  onFileSelect,
  onManualTextChange,
  onParseManual,
}: DataImportPanelProps) {
  const fileInputId = useId();
  const [mode, setMode] = useState<"file" | "manual">("file");
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files.item(0);
    if (file) onFileSelect(file);
  };

  return (
    <div className="workspace-content" data-screen="data-import">
      <header className="page-heading">
        <div>
          <p className="eyebrow">01 · Data Import</p>
          <h1>業務データを、印刷できるQRラベルへ。</h1>
          <p className="page-heading__description">
            CSV・Excel・手入力に対応。ファイルの内容は端末内だけで解析し、サーバーへのアップロードや保存は行いません。
          </p>
        </div>
        <div className="section-actions" role="group" aria-label="処理方針">
          <span className="privacy-pill">
            <ShieldCheck size={14} aria-hidden="true" />
            Local-first
          </span>
          <span className="status-pill">最大 5,000件</span>
        </div>
      </header>

      <section className="section-block" aria-labelledby="demo-heading">
        <div className="section-heading">
          <div>
            <h2 id="demo-heading">すぐ試せるDemo</h2>
            <p>用途に合わせた架空データとラベルテンプレートを読み込みます。</p>
          </div>
        </div>
        <div className="demo-grid">
          {demos.map((demo) => {
            const Icon = demoIcons[demo.id];
            return (
              <button
                className="demo-card"
                type="button"
                key={demo.id}
                aria-pressed={activeDemoId === demo.id}
                onClick={() => onDemoSelect(demo)}
              >
                <div className="demo-card__top">
                  <span className="demo-card__icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className={activeDemoId === demo.id ? "mini-pill mini-pill--success" : "mini-pill"}>
                    {demo.table.rows.length}件
                  </span>
                </div>
                <h3>{demo.name}</h3>
                <p>{demo.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="section-divider" />

      <section className="section-block" aria-labelledby="source-heading">
        <div className="section-heading">
          <div>
            <h2 id="source-heading">データソース</h2>
            <p>CSV / XLSXファイルを選ぶか、表データを直接貼り付けます。</p>
          </div>
          <div className="segmented-control" role="group" aria-label="入力方法">
            <button type="button" aria-pressed={mode === "file"} onClick={() => setMode("file")}>
              <FileSpreadsheet size={13} aria-hidden="true" /> ファイル
            </button>
            <button type="button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>
              <Keyboard size={13} aria-hidden="true" /> 手入力
            </button>
          </div>
        </div>

        <div className="import-layout">
          <div className="source-panel card">
            {mode === "file" ? (
              <>
                <label
                  className="dropzone"
                  data-dragging={isDragging}
                  htmlFor={fileInputId}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div>
                    <span className="dropzone__icon">
                      <UploadCloud size={23} aria-hidden="true" />
                    </span>
                    <strong>{isReading ? "ファイルを解析しています…" : "CSV / XLSXをドロップ"}</strong>
                    <p>またはクリックして選択 · 10 MBまで</p>
                  </div>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={isReading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onFileSelect(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <div className="notice notice--info" style={{ marginTop: 12 }}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span><strong>Privacy by design</strong><br />解析はブラウザ内で完結します。</span>
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="manual-data">表データを貼り付け</label>
                <textarea
                  id="manual-data"
                  value={manualText}
                  spellCheck={false}
                  onChange={(event) => onManualTextChange(event.target.value)}
                  aria-describedby="manual-help"
                />
                <p className="help-text" id="manual-help">1行目を列名として、CSV形式で入力してください。</p>
                <button className="button button--primary" type="button" onClick={onParseManual}>
                  <Keyboard size={15} aria-hidden="true" /> この内容を読み込む
                </button>
              </div>
            )}

            {importError ? (
              <div className="notice notice--danger" role="alert" style={{ marginTop: 12 }}>
                {importError}
              </div>
            ) : null}
          </div>

          <div className="preview-panel card">
            <div className="panel-toolbar" style={{ marginBottom: 12 }}>
              <div>
                <p className="eyebrow">Current source</p>
                <h3>{table.sourceName}</h3>
              </div>
              <span className="source-badge">{formatSourceType(table)}</span>
            </div>
            <div className="table-shell" role="region" aria-label="読み込みデータ表" tabIndex={0}>
              <table className="data-table">
                <caption>先頭{Math.min(7, table.rows.length)}件のデータプレビュー</caption>
                <thead>
                  <tr>
                    <th className="data-table__row-number" scope="col">#</th>
                    {table.headers.slice(0, 6).map((header) => (
                      <th key={header} scope="col">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 7).map((row, index) => (
                    <tr key={`${table.sourceName}-${index}`}>
                      <td className="data-table__row-number">{index + 2}</td>
                      {table.headers.slice(0, 6).map((header) => (
                        <td key={header} title={row[header]}>{row[header] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="source-summary">
              <div>
                <strong>{table.rows.length.toLocaleString("ja-JP")} records</strong>
                <span>{table.headers.length} columns · 先頭行をHeaderとして認識</span>
              </div>
              <span className="mini-pill mini-pill--success">読込済み</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
