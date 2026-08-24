"use client";

import {
  Archive,
  CheckCircle2,
  FileDown,
  FileText,
  ImageDown,
  LockKeyhole,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  downloadBlob,
  generatePdfBlob,
  generateQrZipBlob,
  safeFileName,
  type ExportProgress,
} from "@/lib/export-files";
import { createQrPngBlob, createQrSvgBlob } from "@/lib/qr-generation";
import type { LabelRecord, LabelTemplate } from "@/lib/types";

interface ExportPanelProps {
  records: readonly LabelRecord[];
  template: LabelTemplate;
  onPrint: () => void;
}

type ExportKind = "pdf" | "zip-svg" | "zip-png" | "single-svg" | "single-png";

interface ExportLogItem {
  id: number;
  label: string;
}

function stageLabel(progress: ExportProgress): string {
  if (progress.stage === "rendering-pdf") return "A4ページを描画中";
  if (progress.stage === "generating-qr") return "QR画像を生成中";
  return "ZIPを圧縮中";
}

export function ExportPanel({ records, template, onPrint }: ExportPanelProps) {
  const validRecords = useMemo(
    () => records.filter((record) => record.issues.every((issue) => issue.severity !== "error")),
    [records],
  );
  const [activeExport, setActiveExport] = useState<ExportKind | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ExportLogItem[]>([]);

  const runExport = async (kind: ExportKind) => {
    const first = validRecords[0];
    if (!first) {
      setError("出力できる有効なラベルがありません。");
      return;
    }

    setActiveExport(kind);
    setProgress(null);
    setError(null);
    try {
      let label = "";
      if (kind === "pdf") {
        const blob = await generatePdfBlob(validRecords, template, setProgress);
        downloadBlob(blob, "QRラベル_A4印刷用.pdf");
        label = `A4 PDF · ${validRecords.length}件`;
      } else if (kind === "zip-svg" || kind === "zip-png") {
        const format = kind === "zip-svg" ? "svg" : "png";
        const blob = await generateQrZipBlob(validRecords, format, setProgress);
        downloadBlob(blob, `QRコード_${format.toUpperCase()}_${validRecords.length}件.zip`);
        label = `${format.toUpperCase()} ZIP · ${validRecords.length}件`;
      } else if (kind === "single-svg") {
        const blob = createQrSvgBlob(first.content, { title: first.title || first.managementId });
        downloadBlob(blob, `${safeFileName(first.managementId || first.title, 0)}.svg`);
        label = "先頭QR · SVG";
      } else {
        const blob = await createQrPngBlob(first.content, 1024);
        downloadBlob(blob, `${safeFileName(first.managementId || first.title, 0)}.png`);
        label = "先頭QR · PNG";
      }
      setLogs((current) => [{ id: Date.now(), label }, ...current].slice(0, 4));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "出力処理に失敗しました。");
    } finally {
      setActiveExport(null);
    }
  };

  return (
    <div className="workspace-content" data-screen="pdf-export">
      <header className="page-heading">
        <div>
          <p className="eyebrow">05 · PDF / Export</p>
          <h1>印刷・配布に使える形式で、まとめて出力。</h1>
          <p className="page-heading__description">
            A4 PDF、QR単体のSVG / PNG、一括ZIPをブラウザ内で生成します。元データは外部へ送信されません。
          </p>
        </div>
        <span className="privacy-pill"><LockKeyhole size={14} aria-hidden="true" /> 端末内で生成</span>
      </header>

      <section className="export-hero" aria-labelledby="export-ready-heading">
        <div>
          <p className="eyebrow" style={{ color: "#8de0ca" }}>Ready to export</p>
          <h2 id="export-ready-heading">{template.name} · A4印刷データ</h2>
          <p>{template.size.widthMm} × {template.size.heightMm} mmのラベルを、余白{template.print.marginMm} mm・間隔{template.print.gapMm} mmで配置します。</p>
        </div>
        <div className="export-hero__stat">
          <span>EXPORTABLE</span>
          <strong>{validRecords.length}<small style={{ fontSize: 11, marginLeft: 4 }}>labels</small></strong>
        </div>
      </section>

      <section className="section-block" style={{ marginTop: 18 }} aria-labelledby="format-heading">
        <div className="section-heading">
          <div>
            <h2 id="format-heading">出力形式</h2>
            <p>用途に合わせて何度でも生成できます。</p>
          </div>
        </div>

        <div className="export-grid">
          <article className="export-card">
            <div className="export-card__top">
              <span className="export-card__icon"><FileText size={19} aria-hidden="true" /></span>
              <span className="mini-pill mini-pill--success">推奨</span>
            </div>
            <h3>A4 印刷用PDF</h3>
            <p>複数ページへ自動配置。日本語を含むラベルを実寸でまとめます。</p>
            <button className="button button--primary" type="button" disabled={activeExport !== null} onClick={() => void runExport("pdf")}>
              <FileDown size={15} aria-hidden="true" /> {activeExport === "pdf" ? "生成中…" : "PDFを作成"}
            </button>
          </article>

          <article className="export-card">
            <div className="export-card__top">
              <span className="export-card__icon"><Archive size={19} aria-hidden="true" /></span>
              <span className="mini-pill">Vector</span>
            </div>
            <h3>QR一括 SVG ZIP</h3>
            <p>拡大しても鮮明なQR画像を、管理番号ベースのファイル名で一括保存。</p>
            <button className="button button--secondary" type="button" disabled={activeExport !== null} onClick={() => void runExport("zip-svg")}>
              <Archive size={15} aria-hidden="true" /> {activeExport === "zip-svg" ? "圧縮中…" : "SVGをZIP保存"}
            </button>
          </article>

          <article className="export-card">
            <div className="export-card__top">
              <span className="export-card__icon"><ImageDown size={19} aria-hidden="true" /></span>
              <span className="mini-pill">1024 px</span>
            </div>
            <h3>QR一括 PNG ZIP</h3>
            <p>各QRを透過しないPNGとして生成。資料・台帳への貼り付けに便利です。</p>
            <button className="button button--secondary" type="button" disabled={activeExport !== null} onClick={() => void runExport("zip-png")}>
              <Archive size={15} aria-hidden="true" /> {activeExport === "zip-png" ? "圧縮中…" : "PNGをZIP保存"}
            </button>
          </article>

          <article className="export-card">
            <div className="export-card__top">
              <span className="export-card__icon"><Printer size={19} aria-hidden="true" /></span>
              <span className="mini-pill">Browser</span>
            </div>
            <h3>ブラウザから印刷</h3>
            <p>PDFを保存せず、全A4ページをそのままプリンターへ送ります。</p>
            <button className="button button--secondary" type="button" disabled={activeExport !== null} onClick={onPrint}>
              <Printer size={15} aria-hidden="true" /> 印刷画面を開く
            </button>
          </article>
        </div>
      </section>

      <div className="card-grid card-grid--2" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="individual-heading">
          <div className="section-heading">
            <div>
              <h2 id="individual-heading">Individual download</h2>
              <p>先頭レコードを個別保存</p>
            </div>
            <QrCode size={18} color="var(--accent-strong)" aria-hidden="true" />
          </div>
          <div className="button-row">
            <button className="button button--secondary" type="button" disabled={activeExport !== null} onClick={() => void runExport("single-svg")}>
              <FileDown size={14} aria-hidden="true" /> SVG
            </button>
            <button className="button button--secondary" type="button" disabled={activeExport !== null} onClick={() => void runExport("single-png")}>
              <ImageDown size={14} aria-hidden="true" /> PNG
            </button>
          </div>
          <p className="help-text">対象: {validRecords[0]?.managementId || validRecords[0]?.title || "—"}</p>
        </section>

        <section className="card" aria-labelledby="privacy-heading">
          <div className="section-heading">
            <div>
              <h2 id="privacy-heading">Local-first export</h2>
              <p>データ保護の設計</p>
            </div>
            <ShieldCheck size={18} color="var(--accent-strong)" aria-hidden="true" />
          </div>
          <ul className="privacy-list">
            <li><CheckCircle2 size={14} color="var(--accent-strong)" aria-hidden="true" /> CSV / XLSXはブラウザ内で解析</li>
            <li><CheckCircle2 size={14} color="var(--accent-strong)" aria-hidden="true" /> QR・PDF・ZIPも端末内で生成</li>
            <li><CheckCircle2 size={14} color="var(--accent-strong)" aria-hidden="true" /> Templateに業務データを保存しない</li>
          </ul>
        </section>
      </div>

      {progress && activeExport ? (
        <section className="progress-shell" style={{ marginTop: 16 }} aria-live="polite" aria-busy="true">
          <div className="progress-meta">
            <span>{stageLabel(progress)}</span>
            <strong>{Math.round(progress.percent)}%</strong>
          </div>
          <div className="progress-track"><div className="progress-track__bar" style={{ width: `${progress.percent}%` }} /></div>
        </section>
      ) : null}

      {error ? <div className="notice notice--danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}

      {logs.length > 0 ? (
        <section className="card" style={{ marginTop: 16 }} aria-labelledby="history-heading">
          <div className="section-heading">
            <div>
              <h2 id="history-heading">今回の出力</h2>
              <p>ブラウザのDownloadフォルダへ保存しました。</p>
            </div>
            <Sparkles size={18} color="var(--accent-strong)" aria-hidden="true" />
          </div>
          <ul className="export-log">
            {logs.map((item) => <li key={item.id}><CheckCircle2 size={13} color="var(--accent-strong)" aria-hidden="true" /> {item.label}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
