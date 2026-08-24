"use client";

import type { CSSProperties } from "react";
import type { LabelElement, LabelRecord, LabelTemplate } from "@/lib/types";
import { QrCodeView } from "./qr-code-view";

interface LabelSheetItemProps {
  record: LabelRecord;
  template: LabelTemplate;
  className?: string;
  style?: CSSProperties;
}

function valueForElement(element: LabelElement, record: LabelRecord): string {
  if (element.type === "title") return record.title || "—";
  if (element.type === "id") return record.managementId || "—";
  if (element.type === "additional") return record.additionalText || "";
  return record.content;
}

export function LabelSheetItem({
  record,
  template,
  className = "a4-label",
  style,
}: LabelSheetItemProps) {
  return (
    <div className={className} style={style}>
      {template.elements.filter((element) => element.visible).map((element) => {
        const fontSizeCqw = (element.fontSizePt * 0.3528 * 100) / template.size.widthMm;
        const elementStyle: CSSProperties = {
          left: `${(element.xMm / template.size.widthMm) * 100}%`,
          top: `${(element.yMm / template.size.heightMm) * 100}%`,
          width: `${(element.widthMm / template.size.widthMm) * 100}%`,
          height: `${(element.heightMm / template.size.heightMm) * 100}%`,
          justifyContent: element.align === "left" ? "flex-start" : element.align === "right" ? "flex-end" : "center",
          textAlign: element.align,
        };
        return (
          <div className="a4-label__element" style={elementStyle} key={element.id}>
            {element.type === "qr" ? (
              <QrCodeView className="label-element__qr" value={record.content || "INVALID"} />
            ) : (
              <span
                className={`a4-label__text label-element__content--${element.type}`}
                style={{ fontSize: `${fontSizeCqw}cqw` }}
              >
                {valueForElement(element, record)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
