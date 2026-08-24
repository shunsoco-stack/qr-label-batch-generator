import type {
  FieldMapping,
  ImportedTable,
  LabelRecord,
  QrMode,
} from "./types";

type MappingTarget = Exclude<keyof FieldMapping, "qrMode">;

const HEADER_ALIASES: Record<MappingTarget, readonly string[]> = {
  qrContent: [
    "qr内容",
    "qrcontent",
    "qrcode",
    "url",
    "リンク",
    "link",
    "weburl",
    "テキスト",
    "text",
    "assetid",
    "資産id",
  ],
  title: [
    "表示名",
    "商品名",
    "品名",
    "名称",
    "イベント名",
    "title",
    "displayname",
    "name",
  ],
  managementId: [
    "管理番号",
    "管理id",
    "備品番号",
    "棚番号",
    "会員番号",
    "受付番号",
    "商品番号",
    "assetid",
    "sku",
    "id",
  ],
  additionalText: [
    "補足",
    "備考",
    "説明",
    "任意テキスト",
    "メモ",
    "additionaltext",
    "description",
    "notes",
    "note",
    "memo",
  ],
};

function normalizeHeader(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[\s_\-./\\()[\]{}:：]+/gu, "");
}

function findHeader(
  headers: readonly string[],
  target: MappingTarget,
  excluded: ReadonlySet<string>,
): string {
  const aliases = HEADER_ALIASES[target];
  const candidates = headers.filter((header) => !excluded.has(header));

  for (const alias of aliases) {
    const exact = candidates.find(
      (header) => normalizeHeader(header) === normalizeHeader(alias),
    );
    if (exact) return exact;
  }

  for (const alias of aliases.filter((value) => normalizeHeader(value).length >= 3)) {
    const normalizedAlias = normalizeHeader(alias);
    const partial = candidates.find((header) => {
      const normalized = normalizeHeader(header);
      return normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
    });
    if (partial) return partial;
  }

  return "";
}

function inferQrMode(headers: readonly string[]): QrMode {
  return headers.some((header) => {
    const normalized = normalizeHeader(header);
    return normalized.includes("url") || normalized.includes("リンク");
  })
    ? "url"
    : "text";
}

export function createEmptyMapping(qrMode: QrMode = "url"): FieldMapping {
  return {
    qrContent: "",
    title: "",
    managementId: "",
    additionalText: "",
    qrMode,
  };
}

/** Suggest columns without ever replacing a user's explicit selection. */
export function suggestFieldMapping(
  headers: readonly string[],
  preferredMode?: QrMode,
): FieldMapping {
  const qrMode = preferredMode ?? inferQrMode(headers);
  const used = new Set<string>();

  let qrContent = findHeader(headers, "qrContent", used);
  if (!qrContent && qrMode === "text") {
    qrContent = findHeader(headers, "managementId", used);
  }
  if (qrContent) used.add(qrContent);

  const title = findHeader(headers, "title", used);
  if (title) used.add(title);

  const managementId = findHeader(headers, "managementId", used);
  if (managementId) used.add(managementId);

  const additionalText = findHeader(headers, "additionalText", used);

  return {
    qrContent,
    title,
    managementId,
    additionalText,
    qrMode,
  };
}

function mappedValue(
  row: Readonly<Record<string, string>>,
  column: string,
): string {
  if (!column) return "";
  return (row[column] ?? "").replace(/\r\n?/gu, "\n").trim();
}

export function mapImportedTable(
  table: ImportedTable,
  mapping: FieldMapping,
): LabelRecord[] {
  return table.rows.map((row, index) => ({
    rowNumber: index + 2,
    content: mappedValue(row, mapping.qrContent),
    title: mappedValue(row, mapping.title),
    managementId: mappedValue(row, mapping.managementId),
    additionalText: mappedValue(row, mapping.additionalText),
    issues: [],
  }));
}

export function isMappingComplete(
  table: ImportedTable,
  mapping: FieldMapping,
): boolean {
  return Boolean(
    mapping.qrContent && table.headers.includes(mapping.qrContent),
  );
}

export function mappingUsesUnknownColumns(
  table: ImportedTable,
  mapping: FieldMapping,
): string[] {
  const columns = [
    mapping.qrContent,
    mapping.title,
    mapping.managementId,
    mapping.additionalText,
  ].filter(Boolean);
  return columns.filter((column) => !table.headers.includes(column));
}

export const mapFields = mapImportedTable;
export const inferFieldMapping = suggestFieldMapping;
export const mapRows = mapImportedTable;
