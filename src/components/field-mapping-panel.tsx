"use client";

import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Link2,
  QrCode,
  Rows3,
  Type,
  XCircle,
} from "lucide-react";
import type {
  FieldMapping,
  ImportedTable,
  LabelRecord,
  ValidationResult,
} from "@/lib/types";

interface FieldMappingPanelProps {
  table: ImportedTable;
  mapping: FieldMapping;
  validation: ValidationResult;
  onMappingChange: (mapping: FieldMapping) => void;
}

const targets: Array<{
  key: Exclude<keyof FieldMapping, "qrMode">;
  label: string;
  description: string;
  required?: boolean;
}> = [
  { key: "qrContent", label: "QR内容", description: "QRコードへ埋め込む値", required: true },
  { key: "title", label: "表示名", description: "商品名・備品名・参加者名" },
  { key: "managementId", label: "管理番号", description: "Asset ID・SKU・受付番号" },
  { key: "additionalText", label: "補足", description: "場所・注意書き・任意テキスト" },
];

function recordLabel(record: LabelRecord): string {
  return record.title || record.managementId || `行 ${record.rowNumber}`;
}

export function FieldMappingPanel({
  table,
  mapping,
  validation,
  onMappingChange,
}: FieldMappingPanelProps) {
  const issues = validation.records.flatMap((record) =>
    record.issues.map((issue) => ({ ...issue, rowNumber: record.rowNumber })),
  );

  return (
    <div className="workspace-content" data-screen="field-mapping">
      <header className="page-heading">
        <div>
          <p className="eyebrow">02 · Field Mapping</p>
          <h1>列の意味を、ラベルの項目へ対応付け。</h1>
          <p className="page-heading__description">
            ファイルごとに異なる列名を、QR内容・表示名・管理番号・補足へ割り当てます。候補はいつでも変更できます。
          </p>
        </div>
        <span className="source-badge"><Rows3 size={13} aria-hidden="true" /> {table.sourceName}</span>
      </header>

      <div className="mapping-layout">
        <section className="mapping-panel card" aria-labelledby="mapping-heading">
          <div className="section-heading">
            <div>
              <h2 id="mapping-heading">列の割り当て</h2>
              <p>{table.headers.length}列を認識しました。</p>
            </div>
            <div className="segmented-control" role="group" aria-label="QR内容の形式">
              <button
                type="button"
                aria-pressed={mapping.qrMode === "url"}
                onClick={() => onMappingChange({ ...mapping, qrMode: "url" })}
              >
                <Link2 size={13} aria-hidden="true" /> URL
              </button>
              <button
                type="button"
                aria-pressed={mapping.qrMode === "text"}
                onClick={() => onMappingChange({ ...mapping, qrMode: "text" })}
              >
                <Type size={13} aria-hidden="true" /> Text
              </button>
            </div>
          </div>

          <div className="mapping-list">
            {targets.map((target) => (
              <div className="mapping-row" key={target.key}>
                <div className="mapping-target">
                  <strong>
                    {target.label} {target.required ? <><span aria-hidden="true">*</span><span className="sr-only">（必須）</span></> : null}
                  </strong>
                  <span>{target.description}</span>
                </div>
                <span className="mapping-arrow" aria-hidden="true"><ArrowDown size={15} /></span>
                <label className="sr-only" htmlFor={`mapping-${target.key}`}>{target.label}へ割り当てる列</label>
                <select
                  id={`mapping-${target.key}`}
                  value={mapping[target.key]}
                  onChange={(event) => onMappingChange({ ...mapping, [target.key]: event.target.value })}
                >
                  <option value="">{target.required ? "列を選択" : "使用しない"}</option>
                  {table.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="notice notice--info" style={{ marginTop: 13 }}>
            <QrCode size={16} aria-hidden="true" />
            <span><strong>QR形式: {mapping.qrMode === "url" ? "URL" : "Text"}</strong><br />{mapping.qrMode === "url" ? "http / httpsの形式を検証します。" : "日本語・Asset IDなどの任意テキストに対応します。"}</span>
          </div>
        </section>

        <aside className="inspector-panel" aria-label="マッピング結果">
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>変換プレビュー</h2>
                <p>実際のラベルデータ</p>
              </div>
              <span className="mini-pill">先頭4件</span>
            </div>
            <ul className="mapped-preview-list">
              {validation.records.slice(0, 4).map((record) => (
                <li className="mapped-preview-item" key={record.rowNumber}>
                  <span className="mapped-preview-item__qr"><QrCode size={18} aria-hidden="true" /></span>
                  <div>
                    <strong>{recordLabel(record)}</strong>
                    <span>{record.managementId || "管理番号なし"}</span>
                    <span title={record.content}>{record.content || "QR内容が未設定"}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" style={{ marginTop: 12 }} aria-labelledby="validation-heading">
            <div className="section-heading">
              <div>
                <h2 id="validation-heading">Validation</h2>
                <p>出力前のデータ品質チェック</p>
              </div>
            </div>
            <div className="issue-summary">
              <div className="issue-summary__item">
                <span>Ready</span>
                <strong>{validation.validCount}</strong>
              </div>
              <div className="issue-summary__item">
                <span>Warning</span>
                <strong>{validation.warningCount}</strong>
              </div>
              <div className="issue-summary__item">
                <span>Error</span>
                <strong>{validation.errorCount}</strong>
              </div>
            </div>
            <ul className="issue-list" style={{ marginTop: 12 }} aria-live="polite">
              {issues.slice(0, 6).map((issue, index) => {
                const Icon = issue.severity === "error" ? XCircle : AlertTriangle;
                return (
                  <li className={`issue-item issue-item--${issue.severity}`} key={`${issue.rowNumber}-${issue.code}-${index}`}>
                    <Icon size={13} aria-hidden="true" />
                    <span>行{issue.rowNumber}: {issue.message}</span>
                  </li>
                );
              })}
              {issues.length === 0 ? (
                <li className="issue-item issue-item--success">
                  <CheckCircle2 size={13} aria-hidden="true" /> 全件、出力可能です。
                </li>
              ) : null}
            </ul>
            {validation.duplicateGroups.length > 0 ? (
              <div className="notice notice--warning" style={{ marginTop: 12 }}>
                <AlertTriangle size={15} aria-hidden="true" />
                同じQR内容を{validation.duplicateGroups.length}組検出しました。削除せず警告として保持します。
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
