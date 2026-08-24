"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Grid2X2,
  Printer,
  Ruler,
} from "lucide-react";
import { useMemo, useState } from "react";
import { computeSheetLayout, getPagePlacements } from "@/lib/label-layout";
import type { LabelRecord, LabelTemplate } from "@/lib/types";
import { LabelSheetItem } from "./label-sheet";

interface MultiLabelPreviewProps {
  records: readonly LabelRecord[];
  excludedCount: number;
  template: LabelTemplate;
}

export function MultiLabelPreview({ records, excludedCount, template }: MultiLabelPreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const layoutResult = useMemo(() => {
    try {
      return { layout: computeSheetLayout(records.length, template), error: null };
    } catch (caught) {
      return {
        layout: null,
        error: caught instanceof Error ? caught.message : "A4配置を計算できませんでした。",
      };
    }
  }, [records.length, template]);

  if (!layoutResult.layout) {
    return (
      <div className="workspace-content" data-screen="multi-label-preview">
        <header className="page-heading">
          <div>
            <p className="eyebrow">04 · Multi-label Preview</p>
            <h1>A4配置を見直してください。</h1>
            <p className="page-heading__description">
              Label Designerへ戻り、ラベルサイズをA4の印刷可能領域内に調整してください。
            </p>
          </div>
        </header>
        <div className="notice notice--danger" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {layoutResult.error}
        </div>
      </div>
    );
  }

  const layout = layoutResult.layout;

  const safePageIndex = Math.min(pageIndex, Math.max(0, layout.pageCount - 1));

  const renderPage = (targetPageIndex: number, keyPrefix: string) => {
    const pagePlacements = getPagePlacements(layout, targetPageIndex);
    return (
      <div
        className="a4-page"
        role="img"
        aria-label={`A4 ${targetPageIndex + 1}ページ目、${pagePlacements.length}ラベル`}
        key={`${keyPrefix}-${targetPageIndex}`}
      >
        {pagePlacements.map((placement) => {
          const record = records[placement.recordIndex];
          if (!record) return null;
          return (
            <LabelSheetItem
              key={`${keyPrefix}-${targetPageIndex}-${record.rowNumber}`}
              record={record}
              template={template}
              style={{
                left: `${(placement.xMm / layout.pageWidthMm) * 100}%`,
                top: `${(placement.yMm / layout.pageHeightMm) * 100}%`,
                width: `${(placement.widthMm / layout.pageWidthMm) * 100}%`,
                height: `${(placement.heightMm / layout.pageHeightMm) * 100}%`,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="workspace-content" data-screen="multi-label-preview">
      <header className="page-heading">
        <div>
          <p className="eyebrow">04 · Multi-label Preview</p>
          <h1>A4での配置を、ページ単位で確認。</h1>
          <p className="page-heading__description">
            実寸の余白・間隔・改ページを反映した印刷プレビューです。PDFと同じ配置計算を使用しています。
          </p>
        </div>
        <div className="section-actions">
          <span className="status-pill status-pill--success"><Grid2X2 size={13} aria-hidden="true" /> {layout.columns}列 × {layout.rows}行</span>
          <span className="status-pill"><FileStack size={13} aria-hidden="true" /> {layout.pageCount}ページ</span>
        </div>
      </header>

      {excludedCount > 0 ? (
        <div className="notice notice--warning" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} aria-hidden="true" />
          エラーのある{excludedCount}件は出力対象から除外しています。Field Mappingで修正できます。
        </div>
      ) : null}

      <div className="preview-layout">
        <section className="preview-canvas-wrap" aria-label="A4印刷プレビュー">
          {renderPage(safePageIndex, "screen")}
        </section>

        <aside className="preview-sidebar">
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>Page navigation</h2>
                <p>全{layout.pageCount}ページ</p>
              </div>
            </div>
            <div className="page-counter">
              <button
                className="pagination-button"
                type="button"
                aria-label="前のページ"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span>{layout.pageCount === 0 ? "0 / 0" : `${safePageIndex + 1} / ${layout.pageCount}`}</span>
              <button
                className="pagination-button"
                type="button"
                aria-label="次のページ"
                disabled={safePageIndex >= layout.pageCount - 1}
                onClick={() => setPageIndex((value) => Math.min(layout.pageCount - 1, value + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <section className="card">
            <div className="section-heading">
              <div>
                <h2>Print specification</h2>
                <p>{template.name}</p>
              </div>
              <Ruler size={18} color="var(--accent-strong)" aria-hidden="true" />
            </div>
            <ul className="print-spec-list">
              <li><span>用紙</span><strong>A4 · 210 × 297 mm</strong></li>
              <li><span>ラベル</span><strong>{template.size.widthMm} × {template.size.heightMm} mm</strong></li>
              <li><span>用紙余白</span><strong>{template.print.marginMm} mm</strong></li>
              <li><span>ラベル間隔</span><strong>{template.print.gapMm} mm</strong></li>
              <li><span>1ページ</span><strong>{layout.labelsPerPage} labels</strong></li>
              <li><span>総数</span><strong>{records.length} labels</strong></li>
            </ul>
          </section>

          <section className="notice notice--info">
            <Printer size={16} aria-hidden="true" />
            <span><strong>印刷時は「実際のサイズ / 100%」</strong><br />ブラウザ側の拡大縮小はオフにしてください。</span>
          </section>
        </aside>
      </div>

      <div className="print-page-stack" aria-hidden="true">
        {Array.from({ length: layout.pageCount }, (_, targetPageIndex) =>
          renderPage(targetPageIndex, "print"),
        )}
      </div>
    </div>
  );
}
