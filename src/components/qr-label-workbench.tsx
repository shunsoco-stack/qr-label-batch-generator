"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Database,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DEMOS } from "@/lib/demo-data";
import { parseBrowserFile, parseCsvText } from "@/lib/file-io";
import { inferFieldMapping, mapRows } from "@/lib/mapping";
import {
  BUILT_IN_TEMPLATES,
  cloneTemplate,
  createCustomTemplate,
  deleteUserTemplate,
  loadAllTemplates,
  saveUserTemplate,
} from "@/lib/template-store";
import type { DemoScenario, FieldMapping, ImportedTable, LabelTemplate } from "@/lib/types";
import { validateMappedRecords } from "@/lib/validation";
import { DataImportPanel } from "./data-import-panel";
import { ExportPanel } from "./export-panel";
import { FieldMappingPanel } from "./field-mapping-panel";
import { LabelDesigner } from "./label-designer";
import { MultiLabelPreview } from "./multi-label-preview";

const workflowSteps = [
  { id: "import", label: "Data Import", caption: "CSV / XLSX / 手入力" },
  { id: "mapping", label: "Field Mapping", caption: "列を意味へ対応" },
  { id: "designer", label: "Label Designer", caption: "配置とサイズ" },
  { id: "preview", label: "Preview", caption: "A4複数ページ" },
  { id: "export", label: "PDF / Export", caption: "印刷・一括保存" },
] as const;

type WorkflowStep = (typeof workflowSteps)[number]["id"];

const MANUAL_SAMPLE = `QR内容,表示名,管理番号,補足
https://example.com/items/001,サンプル商品A,ITEM-001,棚 A-01
https://example.com/items/002,サンプル商品B,ITEM-002,棚 A-02
https://example.com/items/003,サンプル商品C,ITEM-003,棚 B-01`;

function getTemplate(templateId: string): LabelTemplate {
  return cloneTemplate(
    BUILT_IN_TEMPLATES.find((template) => template.id === templateId) ?? BUILT_IN_TEMPLATES[0],
  );
}

function stepIndex(step: WorkflowStep): number {
  return workflowSteps.findIndex((candidate) => candidate.id === step);
}

export function QrLabelWorkbench() {
  const initialDemo = DEMOS[0];
  const [step, setStep] = useState<WorkflowStep>("import");
  const [table, setTable] = useState<ImportedTable>(initialDemo.table);
  const [mapping, setMapping] = useState<FieldMapping>(initialDemo.mapping);
  const [template, setTemplate] = useState<LabelTemplate>(() => getTemplate(initialDemo.templateId));
  const [templates, setTemplates] = useState<LabelTemplate[]>(() => BUILT_IN_TEMPLATES.map(cloneTemplate));
  const [activeDemoId, setActiveDemoId] = useState<string | null>(initialDemo.id);
  const [manualText, setManualText] = useState(MANUAL_SAMPLE);
  const [isReading, setIsReading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [templateName, setTemplateName] = useState("マイラベル");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const loadStoredTemplates = () => setTemplates(loadAllTemplates());
    queueMicrotask(loadStoredTemplates);
  }, []);

  useEffect(() => {
    if (!saveModalOpen && !helpOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSaveModalOpen(false);
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen, saveModalOpen]);

  const validation = useMemo(
    () => validateMappedRecords(mapRows(table, mapping), mapping.qrMode),
    [mapping, table],
  );
  const validRecords = useMemo(
    () => validation.records.filter((record) => record.issues.every((issue) => issue.severity !== "error")),
    [validation.records],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? null : current), 3200);
  };

  const loadDemo = (demo: DemoScenario) => {
    setTable({ ...demo.table, headers: [...demo.table.headers], rows: demo.table.rows.map((row) => ({ ...row })) });
    setMapping({ ...demo.mapping });
    setTemplate(getTemplate(demo.templateId));
    setActiveDemoId(demo.id);
    setImportError(null);
    notify(`${demo.name}デモを読み込みました。`);
  };

  const applyTable = (nextTable: ImportedTable) => {
    setTable(nextTable);
    setMapping(inferFieldMapping(nextTable.headers));
    setActiveDemoId(null);
    setImportError(null);
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    setImportError(null);
    try {
      applyTable(await parseBrowserFile(file));
      notify(`${file.name}を読み込みました。`);
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "ファイルを読み込めませんでした。");
    } finally {
      setIsReading(false);
    }
  };

  const parseManual = () => {
    try {
      const parsed = parseCsvText(manualText, { sourceName: "手入力データ.csv" });
      applyTable({ ...parsed, sourceName: "手入力データ", sourceType: "manual" });
      notify("手入力データを読み込みました。");
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "入力内容を解析できませんでした。");
    }
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const custom = createCustomTemplate({ name, baseTemplate: template });
    const users = saveUserTemplate(custom);
    setTemplates([...BUILT_IN_TEMPLATES.map(cloneTemplate), ...users]);
    setTemplate(custom);
    setSaveModalOpen(false);
    notify(`Template「${name}」を保存しました。`);
  };

  const removeTemplate = (templateId: string) => {
    const users = deleteUserTemplate(templateId);
    setTemplates([...BUILT_IN_TEMPLATES.map(cloneTemplate), ...users]);
    if (template.id === templateId) setTemplate(getTemplate(initialDemo.templateId));
    notify("Templateを削除しました。");
  };

  const canOpenStep = (target: WorkflowStep): boolean => {
    const index = stepIndex(target);
    if (index <= 1) return table.rows.length > 0;
    return Boolean(mapping.qrContent && validRecords.length > 0);
  };

  const currentIndex = stepIndex(step);
  const canAdvance = currentIndex < workflowSteps.length - 1 && canOpenStep(workflowSteps[currentIndex + 1].id);
  const summary = mapping.qrContent
    ? `${validRecords.length}件が出力可能 · ${validation.warningCount}件の警告 · ${validation.errorCount}件のエラー`
    : "QR内容に使用する列を選択してください";

  const printPreview = () => {
    setStep("preview");
    window.setTimeout(() => window.print(), 320);
  };

  return (
    <div className="app-shell">
      <div className="topbar-wrap">
        <header className="topbar">
          <button className="brand-lockup" type="button" onClick={() => setStep("import")} style={{ background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
            <Image className="brand-mark" src="/icons/qr-label-mark.svg" alt="" width={42} height={42} priority />
            <span className="brand-copy">
              <span className="brand-kicker">Batch label studio</span>
              <span className="brand-title">QRコード一括生成・ラベル作成ツール</span>
            </span>
          </button>
          <div className="topbar-actions">
            <div className="topbar-meta">
              <span className="privacy-pill"><ShieldCheck size={13} aria-hidden="true" /><span>Local-first</span></span>
              <span className="status-pill"><Database size={13} aria-hidden="true" /> {table.rows.length}件</span>
            </div>
            <button className="button button--secondary" type="button" onClick={() => setHelpOpen(true)}>
              <CircleHelp size={14} aria-hidden="true" /> 使い方
            </button>
          </div>
        </header>
      </div>

      <main className="workspace">
        <nav className="workflow-rail" aria-label="ラベル作成ワークフロー">
          {workflowSteps.map((workflowStep, index) => (
            <button
              className="workflow-step"
              type="button"
              key={workflowStep.id}
              aria-current={step === workflowStep.id ? "step" : undefined}
              disabled={!canOpenStep(workflowStep.id)}
              onClick={() => setStep(workflowStep.id)}
            >
              <span className="workflow-step__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="workflow-step__copy">
                <span className="workflow-step__label">{workflowStep.label}</span>
                <span className="workflow-step__caption">{workflowStep.caption}</span>
              </span>
            </button>
          ))}
        </nav>

        <section className="workspace-panel">
          {step === "import" ? (
            <DataImportPanel
              table={table}
              demos={DEMOS}
              activeDemoId={activeDemoId}
              isReading={isReading}
              importError={importError}
              manualText={manualText}
              onDemoSelect={loadDemo}
              onFileSelect={(file) => void handleFile(file)}
              onManualTextChange={setManualText}
              onParseManual={parseManual}
            />
          ) : null}
          {step === "mapping" ? (
            <FieldMappingPanel table={table} mapping={mapping} validation={validation} onMappingChange={setMapping} />
          ) : null}
          {step === "designer" ? (
            <LabelDesigner
              record={validRecords[0] ?? validation.records[0]}
              template={template}
              templates={templates}
              onTemplateChange={setTemplate}
              onTemplateSelect={setTemplate}
              onSaveTemplate={() => {
                setTemplateName(template.builtIn ? `${template.name} カスタム` : template.name);
                setSaveModalOpen(true);
              }}
            />
          ) : null}
          {step === "preview" ? (
            <MultiLabelPreview records={validRecords} excludedCount={validation.records.length - validRecords.length} template={template} />
          ) : null}
          {step === "export" ? (
            <ExportPanel records={validation.records} template={template} onPrint={printPreview} />
          ) : null}
        </section>

        <div className="bottom-bar">
          <div className="bottom-bar__summary">
            <strong>{workflowSteps[currentIndex].label}</strong>
            <span>{summary}</span>
          </div>
          <div className="button-row">
            <button
              className="button button--ghost"
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setStep(workflowSteps[currentIndex - 1].id)}
            >
              <ArrowLeft size={14} aria-hidden="true" /> 戻る
            </button>
            {currentIndex < workflowSteps.length - 1 ? (
              <button
                className="button button--primary"
                type="button"
                disabled={!canAdvance}
                onClick={() => setStep(workflowSteps[currentIndex + 1].id)}
              >
                {workflowSteps[currentIndex + 1].label}へ <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <button className="button button--secondary" type="button" onClick={() => setStep("import")}>
                新しいデータを読み込む
              </button>
            )}
          </div>
        </div>
      </main>

      {saveModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setSaveModalOpen(false);
        }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="save-template-heading">
            <p className="eyebrow">Template library</p>
            <h2 id="save-template-heading">現在のレイアウトを保存</h2>
            <p>サイズ・配置・文字設定だけを、このブラウザのlocalStorageへ保存します。業務データは保存しません。</p>
            <div className="field">
              <label htmlFor="template-name">Template名</label>
              <input id="template-name" value={templateName} autoFocus maxLength={40} onChange={(event) => setTemplateName(event.target.value)} />
            </div>
            {templates.some((item) => !item.builtIn) ? (
              <div style={{ marginTop: 14 }}>
                <p className="inspector-title">保存済み</p>
                <ul className="element-list">
                  {templates.filter((item) => !item.builtIn).map((item) => (
                    <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button type="button" style={{ flex: 1 }} onClick={() => { setTemplate(cloneTemplate(item)); setSaveModalOpen(false); }}>
                        <span className="element-list__name">{item.name}</span>
                        <span className="mini-pill">{item.size.widthMm} × {item.size.heightMm}</span>
                      </button>
                      <button className="icon-button" type="button" aria-label={`${item.name}を削除`} onClick={() => removeTemplate(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="button-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <button className="button button--ghost" type="button" onClick={() => setSaveModalOpen(false)}>キャンセル</button>
              <button className="button button--primary" type="button" disabled={!templateName.trim()} onClick={saveTemplate}>保存する</button>
            </div>
          </section>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setHelpOpen(false);
        }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="help-heading">
            <p className="eyebrow">Quick guide</p>
            <h2 id="help-heading">5つの工程で完成します</h2>
            <p>Business Data → Mapping → Batch QR → Label Design → Preview → PDF / Printを一つのワークフローで進めます。</p>
            <ul className="privacy-list">
              {workflowSteps.map((item, index) => (
                <li key={item.id}><CheckCircle2 size={14} color="var(--accent-strong)" aria-hidden="true" /><strong>{index + 1}. {item.label}</strong> — {item.caption}</li>
              ))}
            </ul>
            <div className="notice notice--success" style={{ marginTop: 16 }}>
              <ShieldCheck size={15} aria-hidden="true" /> ファイル・QR・PDF処理はブラウザ内で完結します。
            </div>
            <div className="button-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <button className="button button--primary" type="button" autoFocus onClick={() => setHelpOpen(false)}>わかりました</button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 size={15} aria-hidden="true" /> {toast}
        </div>
      ) : null}
    </div>
  );
}
