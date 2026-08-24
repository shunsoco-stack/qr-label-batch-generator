"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  EyeOff,
  Grid3X3,
  Maximize2,
  Minus,
  Move,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Type,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  clampElementToLabel,
  LABEL_SIZE_PRESETS,
} from "@/lib/label-layout";
import { cloneTemplate } from "@/lib/template-store";
import type { LabelElement, LabelElementType, LabelRecord, LabelTemplate } from "@/lib/types";
import { QrCodeView } from "./qr-code-view";

interface LabelDesignerProps {
  record: LabelRecord;
  template: LabelTemplate;
  templates: readonly LabelTemplate[];
  onTemplateChange: (template: LabelTemplate) => void;
  onTemplateSelect: (template: LabelTemplate) => void;
  onSaveTemplate: () => void;
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const elementNames: Record<LabelElementType, string> = {
  qr: "QR",
  title: "Title",
  id: "ID",
  additional: "Additional Text",
};

function snap(value: number, enabled: boolean): number {
  return enabled ? Math.round(value * 2) / 2 : Math.round(value * 10) / 10;
}

function elementValue(element: LabelElement, record: LabelRecord): string {
  if (element.type === "title") return record.title || "表示名";
  if (element.type === "id") return record.managementId || "ID-0001";
  if (element.type === "additional") return record.additionalText || "補足テキスト";
  return record.content;
}

export function LabelDesigner({
  record,
  template,
  templates,
  onTemplateChange,
  onTemplateSelect,
  onSaveTemplate,
}: LabelDesignerProps) {
  const [selectedId, setSelectedId] = useState(template.elements.find((element) => element.visible)?.id ?? "");
  const [gridEnabled, setGridEnabled] = useState(true);
  const [zoom, setZoom] = useState(6.5);
  const dragRef = useRef<DragState | null>(null);
  const maxLabelWidthMm = Math.min(200, A4_WIDTH_MM - template.print.marginMm * 2);
  const maxLabelHeightMm = Math.min(280, A4_HEIGHT_MM - template.print.marginMm * 2);

  const selected = useMemo(
    () => template.elements.find((element) => element.id === selectedId) ?? template.elements[0],
    [selectedId, template.elements],
  );

  const changeElement = (id: string, update: (element: LabelElement) => LabelElement) => {
    onTemplateChange({
      ...template,
      builtIn: false,
      elements: template.elements.map((element) =>
        element.id === id ? clampElementToLabel(update(element), template.size) : element,
      ),
    });
  };

  const beginDrag = (
    event: PointerEvent<HTMLElement>,
    element: LabelElement,
    mode: DragState["mode"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(element.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: element.id,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.xMm,
      startY: element.yMm,
      startWidth: element.widthMm,
      startHeight: element.heightMm,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = (event.clientX - drag.startClientX) / zoom;
    const dy = (event.clientY - drag.startClientY) / zoom;

    changeElement(drag.id, (element) => {
      if (drag.mode === "move") {
        return {
          ...element,
          xMm: snap(drag.startX + dx, gridEnabled),
          yMm: snap(drag.startY + dy, gridEnabled),
        };
      }

      if (element.type === "qr") {
        const side = snap(Math.max(8, drag.startWidth + Math.max(dx, dy)), gridEnabled);
        return { ...element, widthMm: side, heightMm: side };
      }

      return {
        ...element,
        widthMm: snap(Math.max(5, drag.startWidth + dx), gridEnabled),
        heightMm: snap(Math.max(3, drag.startHeight + dy), gridEnabled),
      };
    });
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleElementKeyDown = (event: KeyboardEvent<HTMLDivElement>, element: LabelElement) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 2 : 0.5;
    const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;

    changeElement(element.id, (current) => {
      if (event.altKey) {
        if (current.type === "qr") {
          const side = Math.max(8, current.widthMm + (dx || dy));
          return { ...current, widthMm: side, heightMm: side };
        }
        return {
          ...current,
          widthMm: Math.max(5, current.widthMm + dx),
          heightMm: Math.max(3, current.heightMm + dy),
        };
      }
      return { ...current, xMm: current.xMm + dx, yMm: current.yMm + dy };
    });
  };

  const changeSize = (widthMm: number, heightMm: number) => {
    const nextSize = {
      widthMm: Math.max(20, Math.min(maxLabelWidthMm, widthMm || 20)),
      heightMm: Math.max(15, Math.min(maxLabelHeightMm, heightMm || 15)),
    };
    const scaleX = nextSize.widthMm / template.size.widthMm;
    const scaleY = nextSize.heightMm / template.size.heightMm;
    onTemplateChange({
      ...template,
      builtIn: false,
      size: nextSize,
      elements: template.elements.map((element) => {
        const scaled = {
          ...element,
          xMm: element.xMm * scaleX,
          yMm: element.yMm * scaleY,
          widthMm: element.widthMm * (element.type === "qr" ? Math.min(scaleX, scaleY) : scaleX),
          heightMm: element.heightMm * (element.type === "qr" ? Math.min(scaleX, scaleY) : scaleY),
        };
        return clampElementToLabel(scaled, nextSize);
      }),
    });
  };

  const resetTemplate = () => {
    const original = templates.find((candidate) => candidate.id === template.id) ?? templates[0];
    if (original) onTemplateSelect(cloneTemplate(original));
  };

  return (
    <div className="workspace-content" data-screen="label-designer">
      <header className="page-heading">
        <div>
          <p className="eyebrow">03 · Label Designer</p>
          <h1>必要な要素だけを、正確にレイアウト。</h1>
          <p className="page-heading__description">
            QR・Title・ID・Additional Textを直接移動／サイズ変更できます。精密操作は数値入力とキーボードにも対応します。
          </p>
        </div>
        <div className="section-actions">
          <button className="button button--secondary" type="button" onClick={resetTemplate}>
            <RotateCcw size={14} aria-hidden="true" /> リセット
          </button>
          <button className="button button--primary" type="button" onClick={onSaveTemplate}>
            <Save size={14} aria-hidden="true" /> Template保存
          </button>
        </div>
      </header>

      <div className="designer-layout">
        <aside className="designer-sidebar" aria-label="テンプレートと要素">
          <section>
            <p className="inspector-title">Template</p>
            <div className="template-grid" style={{ gridTemplateColumns: "1fr", gap: 7 }}>
              {templates.map((candidate) => (
                <button
                  className="template-card"
                  style={{ padding: 11 }}
                  type="button"
                  key={candidate.id}
                  aria-pressed={candidate.id === template.id}
                  onClick={() => onTemplateSelect(cloneTemplate(candidate))}
                >
                  <div className="template-card__top">
                    <strong style={{ fontSize: 11 }}>{candidate.name}</strong>
                    <span className="mini-pill">{candidate.size.widthMm} × {candidate.size.heightMm}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="inspector-group">
            <p className="inspector-title">Layers</p>
            <ul className="element-list">
              {template.elements.map((element) => (
                <li className="layer-row" key={element.id}>
                  <button
                    className="layer-select"
                    type="button"
                    aria-pressed={selected?.id === element.id}
                    onClick={() => setSelectedId(element.id)}
                  >
                    <span className="element-list__name">
                      {element.type === "qr" ? <QrCode size={14} aria-hidden="true" /> : <Type size={14} aria-hidden="true" />}
                      {elementNames[element.type]}
                    </span>
                  </button>
                  <button
                    className="visibility-button"
                    type="button"
                    aria-label={`${elementNames[element.type]}を${element.visible ? "非表示" : "表示"}`}
                    onClick={() => changeElement(element.id, (current) => ({ ...current, visible: !current.visible }))}
                  >
                    {element.visible ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section
          className="designer-stage"
          aria-label="ラベル編集キャンバス"
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="designer-stage__toolbar">
            <span className="mini-pill"><Move size={12} aria-hidden="true" /> 0.5 mm grid</span>
            <div className="designer-zoom">
              <button className="icon-button" type="button" onClick={() => setZoom((value) => Math.max(4, value - 0.5))} aria-label="縮小">
                <Minus size={14} />
              </button>
              <span>{Math.round((zoom / 6.5) * 100)}%</span>
              <button className="icon-button" type="button" onClick={() => setZoom((value) => Math.min(9, value + 0.5))} aria-label="拡大">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div
            className="label-canvas"
            data-grid={gridEnabled}
            style={{
              width: template.size.widthMm * zoom,
              height: template.size.heightMm * zoom,
              "--grid-px": `${zoom * 0.5}px`,
            } as React.CSSProperties}
            onPointerDown={() => setSelectedId("")}
          >
            {template.elements.filter((element) => element.visible).map((element) => {
              const fontSize = element.fontSizePt * 0.3528 * zoom;
              return (
                <div
                  className="label-element"
                  key={element.id}
                  data-selected={selected?.id === element.id}
                  tabIndex={0}
                  role="group"
                  aria-label={`${elementNames[element.type]}。矢印キーで移動、Altと矢印キーでサイズ変更`}
                  style={{
                    left: element.xMm * zoom,
                    top: element.yMm * zoom,
                    width: element.widthMm * zoom,
                    height: element.heightMm * zoom,
                    justifyContent: element.align === "left" ? "flex-start" : element.align === "right" ? "flex-end" : "center",
                    textAlign: element.align,
                  }}
                  onPointerDown={(event) => beginDrag(event, element, "move")}
                  onKeyDown={(event) => handleElementKeyDown(event, element)}
                  onFocus={() => setSelectedId(element.id)}
                >
                  {element.type === "qr" ? (
                    <QrCodeView className="label-element__qr" value={record.content || "SAMPLE"} />
                  ) : (
                    <span
                      className={`label-element__content label-element__content--${element.type}`}
                      style={{ fontSize }}
                    >
                      {elementValue(element, record)}
                    </span>
                  )}
                  {selected?.id === element.id ? (
                    <span
                      className="resize-handle"
                      role="button"
                      aria-label={`${elementNames[element.type]}をサイズ変更`}
                      tabIndex={-1}
                      onPointerDown={(event) => beginDrag(event, element, "resize")}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="designer-inspector" aria-label="ラベル設定">
          <section className="inspector-group">
            <p className="inspector-title">Label size</p>
            <div className="field">
              <label htmlFor="size-preset">代表サイズ</label>
              <select
                id="size-preset"
                value={LABEL_SIZE_PRESETS.find((preset) => preset.widthMm === template.size.widthMm && preset.heightMm === template.size.heightMm)?.id ?? "custom"}
                onChange={(event) => {
                  const preset = LABEL_SIZE_PRESETS.find((candidate) => candidate.id === event.target.value);
                  if (preset) changeSize(preset.widthMm, preset.heightMm);
                }}
              >
                {LABEL_SIZE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                <option value="custom">カスタム</option>
              </select>
            </div>
            <div className="compact-fields" style={{ marginTop: 8 }}>
              <div className="compact-field">
                <label htmlFor="label-width">幅 mm</label>
                <input id="label-width" type="number" min="20" max={maxLabelWidthMm} step="0.5" value={template.size.widthMm} onChange={(event) => changeSize(Number(event.target.value), template.size.heightMm)} />
              </div>
              <div className="compact-field">
                <label htmlFor="label-height">高さ mm</label>
                <input id="label-height" type="number" min="15" max={maxLabelHeightMm} step="0.5" value={template.size.heightMm} onChange={(event) => changeSize(template.size.widthMm, Number(event.target.value))} />
              </div>
            </div>
            <p className="help-text">現在の用紙余白では最大 {maxLabelWidthMm} × {maxLabelHeightMm} mm</p>
          </section>

          {selected ? (
            <section className="inspector-group">
              <p className="inspector-title">{elementNames[selected.type]}</p>
              <div className="compact-fields">
                {(["xMm", "yMm", "widthMm", "heightMm"] as const).map((key) => (
                  <div className="compact-field" key={key}>
                    <label htmlFor={`element-${key}`}>{key === "xMm" ? "X" : key === "yMm" ? "Y" : key === "widthMm" ? "幅" : "高さ"} mm</label>
                    <input
                      id={`element-${key}`}
                      type="number"
                      step="0.5"
                      value={Math.round(selected[key] * 10) / 10}
                      onChange={(event) => changeElement(selected.id, (element) => ({ ...element, [key]: Number(event.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              {selected.type !== "qr" ? (
                <>
                  <div className="compact-field" style={{ marginTop: 8 }}>
                    <label htmlFor="font-size">文字サイズ pt</label>
                    <input id="font-size" type="number" min="5" max="36" step="0.5" value={selected.fontSizePt} onChange={(event) => changeElement(selected.id, (element) => ({ ...element, fontSizePt: Number(event.target.value) }))} />
                  </div>
                  <div className="segmented-control" role="group" aria-label="文字揃え" style={{ marginTop: 8, width: "100%" }}>
                    {(["left", "center", "right"] as const).map((align) => {
                      const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                      return (
                        <button type="button" key={align} aria-pressed={selected.align === align} onClick={() => changeElement(selected.id, (element) => ({ ...element, align }))}>
                          <Icon size={13} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          <section className="inspector-group">
            <p className="inspector-title">Canvas</p>
            <div className="toggle-row">
              <span><Grid3X3 size={13} aria-hidden="true" /> 0.5mm Grid</span>
              <label className="switch">
                <input type="checkbox" aria-label="0.5mmグリッドを表示" checked={gridEnabled} onChange={(event) => setGridEnabled(event.target.checked)} />
                <span aria-hidden="true" />
              </label>
            </div>
            <div className="notice" style={{ marginTop: 8 }}>
              <Maximize2 size={14} aria-hidden="true" />
              QRは読み取り精度を守るため正方形を維持します。
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
