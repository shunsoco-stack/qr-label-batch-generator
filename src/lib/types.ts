export type SourceType = "manual" | "csv" | "xlsx";

export type QrMode = "url" | "text";

export interface ImportedTable {
  headers: string[];
  rows: Record<string, string>[];
  sourceName: string;
  sourceType: SourceType;
  sheetName?: string;
}

export interface FieldMapping {
  qrContent: string;
  title: string;
  managementId: string;
  additionalText: string;
  qrMode: QrMode;
}

export type ValidationSeverity = "error" | "warning";

export type ValidationField =
  | "content"
  | "title"
  | "managementId"
  | "additionalText";

export type ValidationIssueCode =
  | "empty-qr-content"
  | "invalid-url"
  | "unsupported-url-protocol"
  | "qr-content-too-long"
  | "title-too-long"
  | "management-id-too-long"
  | "additional-text-too-long"
  | "duplicate-qr-content";

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  message: string;
  field?: ValidationField;
  relatedRows?: number[];
}

export interface LabelRecord {
  rowNumber: number;
  content: string;
  title: string;
  managementId: string;
  additionalText: string;
  issues: ValidationIssue[];
}

export type LabelElementType = "qr" | "title" | "id" | "additional";

export type LabelTextAlign = "left" | "center" | "right";

export interface LabelElement {
  id: string;
  type: LabelElementType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSizePt: number;
  align: LabelTextAlign;
  visible: boolean;
}

export interface LabelSize {
  widthMm: number;
  heightMm: number;
}

export interface LabelPrintSettings {
  marginMm: number;
  gapMm: number;
}

export interface LabelTemplate {
  id: string;
  name: string;
  builtIn: boolean;
  size: LabelSize;
  elements: LabelElement[];
  print: LabelPrintSettings;
}

export interface DuplicateGroup {
  content: string;
  rowNumbers: number[];
}

export interface ValidationResult {
  records: LabelRecord[];
  duplicateGroups: DuplicateGroup[];
  errorCount: number;
  warningCount: number;
  validCount: number;
}

export interface LabelPlacement {
  recordIndex: number;
  pageIndex: number;
  indexOnPage: number;
  row: number;
  column: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface SheetLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  columns: number;
  rows: number;
  labelsPerPage: number;
  pageCount: number;
  placements: LabelPlacement[];
}

export interface DemoScenario {
  id: "asset" | "product" | "event";
  name: string;
  description: string;
  table: ImportedTable;
  mapping: FieldMapping;
  templateId: string;
}
