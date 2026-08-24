import type {
  LabelElement,
  LabelPrintSettings,
  LabelSize,
  LabelTemplate,
} from "./types";

export const TEMPLATE_SCHEMA_VERSION = 1;
export const TEMPLATE_STORAGE_KEY = "qr-label-batch-generator.templates.v1";

const ASSET_TEMPLATE: LabelTemplate = {
  id: "asset-management",
  name: "備品管理",
  builtIn: true,
  size: { widthMm: 60, heightMm: 40 },
  print: { marginMm: 10, gapMm: 2 },
  elements: [
    {
      id: "asset-qr",
      type: "qr",
      xMm: 3,
      yMm: 3,
      widthMm: 30,
      heightMm: 30,
      fontSizePt: 10,
      align: "center",
      visible: true,
    },
    {
      id: "asset-title",
      type: "title",
      xMm: 35,
      yMm: 4,
      widthMm: 22,
      heightMm: 8,
      fontSizePt: 11,
      align: "left",
      visible: true,
    },
    {
      id: "asset-id",
      type: "id",
      xMm: 35,
      yMm: 14,
      widthMm: 22,
      heightMm: 6,
      fontSizePt: 8,
      align: "left",
      visible: true,
    },
    {
      id: "asset-additional",
      type: "additional",
      xMm: 35,
      yMm: 22,
      widthMm: 22,
      heightMm: 12,
      fontSizePt: 7,
      align: "left",
      visible: true,
    },
  ],
};

const PRODUCT_TEMPLATE: LabelTemplate = {
  id: "product-shelf",
  name: "商品ラベル",
  builtIn: true,
  size: { widthMm: 70, heightMm: 36 },
  print: { marginMm: 10, gapMm: 2 },
  elements: [
    {
      id: "product-qr",
      type: "qr",
      xMm: 2.5,
      yMm: 2.5,
      widthMm: 31,
      heightMm: 31,
      fontSizePt: 10,
      align: "center",
      visible: true,
    },
    {
      id: "product-title",
      type: "title",
      xMm: 36,
      yMm: 3,
      widthMm: 31,
      heightMm: 8,
      fontSizePt: 12,
      align: "left",
      visible: true,
    },
    {
      id: "product-id",
      type: "id",
      xMm: 36,
      yMm: 13,
      widthMm: 31,
      heightMm: 6,
      fontSizePt: 8,
      align: "left",
      visible: true,
    },
    {
      id: "product-additional",
      type: "additional",
      xMm: 36,
      yMm: 21,
      widthMm: 31,
      heightMm: 12,
      fontSizePt: 8,
      align: "left",
      visible: true,
    },
  ],
};

const EVENT_TEMPLATE: LabelTemplate = {
  id: "event-checkin",
  name: "イベント受付",
  builtIn: true,
  size: { widthMm: 86, heightMm: 54 },
  print: { marginMm: 10, gapMm: 2 },
  elements: [
    {
      id: "event-qr",
      type: "qr",
      xMm: 4,
      yMm: 5,
      widthMm: 44,
      heightMm: 44,
      fontSizePt: 10,
      align: "center",
      visible: true,
    },
    {
      id: "event-title",
      type: "title",
      xMm: 52,
      yMm: 6,
      widthMm: 30,
      heightMm: 12,
      fontSizePt: 13,
      align: "center",
      visible: true,
    },
    {
      id: "event-id",
      type: "id",
      xMm: 52,
      yMm: 21,
      widthMm: 30,
      heightMm: 7,
      fontSizePt: 9,
      align: "center",
      visible: true,
    },
    {
      id: "event-additional",
      type: "additional",
      xMm: 52,
      yMm: 31,
      widthMm: 30,
      heightMm: 17,
      fontSizePt: 8,
      align: "center",
      visible: true,
    },
  ],
};

const URL_TEMPLATE: LabelTemplate = {
  id: "compact-url",
  name: "URL配布",
  builtIn: true,
  size: { widthMm: 50, heightMm: 30 },
  print: { marginMm: 8, gapMm: 2 },
  elements: [
    {
      id: "url-qr",
      type: "qr",
      xMm: 2,
      yMm: 2,
      widthMm: 26,
      heightMm: 26,
      fontSizePt: 10,
      align: "center",
      visible: true,
    },
    {
      id: "url-title",
      type: "title",
      xMm: 30,
      yMm: 3,
      widthMm: 18,
      heightMm: 8,
      fontSizePt: 9,
      align: "left",
      visible: true,
    },
    {
      id: "url-id",
      type: "id",
      xMm: 30,
      yMm: 13,
      widthMm: 18,
      heightMm: 5,
      fontSizePt: 7,
      align: "left",
      visible: true,
    },
    {
      id: "url-additional",
      type: "additional",
      xMm: 30,
      yMm: 20,
      widthMm: 18,
      heightMm: 7,
      fontSizePt: 6,
      align: "left",
      visible: true,
    },
  ],
};

export const BUILT_IN_TEMPLATES: readonly LabelTemplate[] = [
  ASSET_TEMPLATE,
  PRODUCT_TEMPLATE,
  EVENT_TEMPLATE,
  URL_TEMPLATE,
];

interface TemplateEnvelope {
  version: number;
  templates: LabelTemplate[];
}

export interface CreateCustomTemplateOptions {
  id?: string;
  name?: string;
  size?: LabelSize;
  print?: LabelPrintSettings;
  elements?: LabelElement[];
  baseTemplate?: LabelTemplate;
}

function cloneElement(element: LabelElement): LabelElement {
  return { ...element };
}

export function cloneTemplate(template: LabelTemplate): LabelTemplate {
  return {
    ...template,
    size: { ...template.size },
    print: { ...template.print },
    elements: template.elements.map(cloneElement),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isElement(value: unknown): value is LabelElement {
  if (!value || typeof value !== "object") return false;
  const element = value as Partial<LabelElement>;
  return (
    typeof element.id === "string" &&
    ["qr", "title", "id", "additional"].includes(element.type ?? "") &&
    isFiniteNumber(element.xMm) &&
    isFiniteNumber(element.yMm) &&
    isFiniteNumber(element.widthMm) &&
    isFiniteNumber(element.heightMm) &&
    isFiniteNumber(element.fontSizePt) &&
    ["left", "center", "right"].includes(element.align ?? "") &&
    typeof element.visible === "boolean"
  );
}

export function isLabelTemplate(value: unknown): value is LabelTemplate {
  if (!value || typeof value !== "object") return false;
  const template = value as Partial<LabelTemplate>;
  return (
    typeof template.id === "string" &&
    template.id.length > 0 &&
    typeof template.name === "string" &&
    template.name.length > 0 &&
    typeof template.builtIn === "boolean" &&
    Boolean(template.size) &&
    isFiniteNumber(template.size?.widthMm) &&
    template.size.widthMm > 0 &&
    isFiniteNumber(template.size?.heightMm) &&
    template.size.heightMm > 0 &&
    Boolean(template.print) &&
    isFiniteNumber(template.print?.marginMm) &&
    template.print.marginMm >= 0 &&
    isFiniteNumber(template.print?.gapMm) &&
    template.print.gapMm >= 0 &&
    Array.isArray(template.elements) &&
    template.elements.every(isElement)
  );
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseStoredTemplates(raw: string | null): LabelTemplate[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const candidates = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          (parsed as Partial<TemplateEnvelope>).version === TEMPLATE_SCHEMA_VERSION &&
          Array.isArray((parsed as Partial<TemplateEnvelope>).templates)
        ? (parsed as TemplateEnvelope).templates
        : [];
    return candidates
      .filter(isLabelTemplate)
      .map((template) => ({ ...cloneTemplate(template), builtIn: false }));
  } catch {
    return [];
  }
}

export function getBuiltInTemplates(): LabelTemplate[] {
  return BUILT_IN_TEMPLATES.map(cloneTemplate);
}

export function loadUserTemplates(storage?: Storage): LabelTemplate[] {
  const target = resolveStorage(storage);
  if (!target) return [];
  return parseStoredTemplates(target.getItem(TEMPLATE_STORAGE_KEY));
}

export function saveUserTemplates(
  templates: readonly LabelTemplate[],
  storage?: Storage,
): LabelTemplate[] {
  const safeTemplates = templates
    .filter(isLabelTemplate)
    .map((template) => ({ ...cloneTemplate(template), builtIn: false }));
  const target = resolveStorage(storage);
  if (target) {
    const envelope: TemplateEnvelope = {
      version: TEMPLATE_SCHEMA_VERSION,
      templates: safeTemplates,
    };
    target.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(envelope));
  }
  return safeTemplates.map(cloneTemplate);
}

export function saveUserTemplate(
  template: LabelTemplate,
  storage?: Storage,
): LabelTemplate[] {
  if (!isLabelTemplate(template)) {
    throw new TypeError("保存できないテンプレート形式です。");
  }

  const builtInIds = new Set(BUILT_IN_TEMPLATES.map((item) => item.id));
  const normalized = {
    ...cloneTemplate(template),
    id: builtInIds.has(template.id) ? `user-${template.id}` : template.id,
    builtIn: false,
  };
  const existing = loadUserTemplates(storage);
  const index = existing.findIndex((item) => item.id === normalized.id);
  if (index >= 0) existing[index] = normalized;
  else existing.push(normalized);
  return saveUserTemplates(existing, storage);
}

export function deleteUserTemplate(
  templateId: string,
  storage?: Storage,
): LabelTemplate[] {
  return saveUserTemplates(
    loadUserTemplates(storage).filter((template) => template.id !== templateId),
    storage,
  );
}

export function loadAllTemplates(storage?: Storage): LabelTemplate[] {
  return [...getBuiltInTemplates(), ...loadUserTemplates(storage)];
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCustomTemplate(
  options: CreateCustomTemplateOptions = {},
): LabelTemplate {
  const base = cloneTemplate(options.baseTemplate ?? ASSET_TEMPLATE);
  return {
    ...base,
    id: options.id ?? createId(),
    name: options.name ?? "カスタムテンプレート",
    builtIn: false,
    size: { ...(options.size ?? base.size) },
    print: { ...(options.print ?? base.print) },
    elements: (options.elements ?? base.elements).map(cloneElement),
  };
}
