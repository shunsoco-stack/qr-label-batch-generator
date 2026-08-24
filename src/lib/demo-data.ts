import type { DemoScenario } from "./types";

const ASSET_DEMO: DemoScenario = {
  id: "asset",
  name: "備品ラベル",
  description: "社内備品の管理番号・設置場所をQR付きラベルにします。",
  templateId: "asset-management",
  mapping: {
    qrContent: "QR内容",
    title: "備品名",
    managementId: "管理番号",
    additionalText: "補足",
    qrMode: "text",
  },
  table: {
    headers: ["QR内容", "備品名", "管理番号", "補足"],
    rows: [
      { QR内容: "ASSET-PC-001", 備品名: "MacBook Pro 14", 管理番号: "PC-001", 補足: "開発部 / 3F" },
      { QR内容: "ASSET-PC-002", 備品名: "ThinkPad X1", 管理番号: "PC-002", 補足: "営業部 / 5F" },
      { QR内容: "ASSET-MON-014", 備品名: "27インチモニター", 管理番号: "MON-014", 補足: "会議室 A" },
      { QR内容: "ASSET-TAB-006", 備品名: "iPad Air", 管理番号: "TAB-006", 補足: "受付カウンター" },
      { QR内容: "ASSET-CAM-003", 備品名: "Webカメラ", 管理番号: "CAM-003", 補足: "オンライン会議用" },
      { QR内容: "ASSET-PRO-002", 備品名: "プロジェクター", 管理番号: "PRO-002", 補足: "大会議室" },
      ...Array.from({ length: 18 }, (_, index) => {
        const number = index + 7;
        const types = ["ノートPC", "モニター", "スマートフォン", "ヘッドセット", "ドッキングステーション", "モバイルルーター"];
        const locations = ["開発部 / 3F", "営業部 / 5F", "総務部 / 2F", "会議室 B", "サポート / 4F", "貸出保管庫"];
        return {
          QR内容: `ASSET-DEMO-${String(number).padStart(3, "0")}`,
          備品名: types[index % types.length],
          管理番号: `EQ-${String(number).padStart(3, "0")}`,
          補足: locations[index % locations.length],
        };
      }),
    ],
    sourceName: "備品管理デモ",
    sourceType: "manual",
  },
};

const PRODUCT_DEMO: DemoScenario = {
  id: "product",
  name: "商品ラベル",
  description: "商品ページURLとSKU、価格情報を棚札としてまとめます。",
  templateId: "product-shelf",
  mapping: {
    qrContent: "商品URL",
    title: "商品名",
    managementId: "SKU",
    additionalText: "補足",
    qrMode: "url",
  },
  table: {
    headers: ["商品URL", "商品名", "SKU", "補足"],
    rows: [
      { 商品URL: "https://example.com/products/coffee-01", 商品名: "オリジナルブレンド", SKU: "CF-001", 補足: "¥980 / 200g" },
      { 商品URL: "https://example.com/products/tea-02", 商品名: "アールグレイ", SKU: "TE-002", 補足: "¥780 / 20包" },
      { 商品URL: "https://example.com/products/mug-03", 商品名: "ロゴマグ", SKU: "MG-003", 補足: "¥1,650 / 白" },
      { 商品URL: "https://example.com/products/bottle-04", 商品名: "保温ボトル", SKU: "BT-004", 補足: "¥2,980 / 350ml" },
      { 商品URL: "https://example.com/products/bag-05", 商品名: "コットントート", SKU: "BG-005", 補足: "¥1,280 / 生成り" },
      { 商品URL: "https://example.com/products/gift-06", 商品名: "ギフトセット", SKU: "GF-006", 補足: "¥3,500 / 包装込み" },
      ...Array.from({ length: 18 }, (_, index) => {
        const number = index + 7;
        const products = ["ドリップバッグ", "ティーポット", "スプーンセット", "保存缶", "コースター", "メッセージカード"];
        const prices = ["¥1,200", "¥2,400", "¥880", "¥1,480", "¥650", "¥300"];
        return {
          商品URL: `https://example.com/products/demo-${String(number).padStart(2, "0")}`,
          商品名: products[index % products.length],
          SKU: `DM-${String(number).padStart(3, "0")}`,
          補足: `${prices[index % prices.length]} / 店頭在庫`,
        };
      }),
    ],
    sourceName: "商品ラベルデモ",
    sourceType: "manual",
  },
};

const EVENT_DEMO: DemoScenario = {
  id: "event",
  name: "イベント受付",
  description: "来場者ごとの受付URL・受付番号・チケット種別をカード化します。",
  templateId: "event-checkin",
  mapping: {
    qrContent: "受付URL",
    title: "参加者名",
    managementId: "受付番号",
    additionalText: "チケット",
    qrMode: "url",
  },
  table: {
    headers: ["受付URL", "参加者名", "受付番号", "チケット"],
    rows: [
      { 受付URL: "https://example.com/checkin/EVT-2401", 参加者名: "佐藤 美咲", 受付番号: "EVT-2401", チケット: "一般 / 午前" },
      { 受付URL: "https://example.com/checkin/EVT-2402", 参加者名: "鈴木 健太", 受付番号: "EVT-2402", チケット: "一般 / 午前" },
      { 受付URL: "https://example.com/checkin/EVT-2403", 参加者名: "高橋 彩", 受付番号: "EVT-2403", チケット: "VIP / 終日" },
      { 受付URL: "https://example.com/checkin/EVT-2404", 参加者名: "田中 翔", 受付番号: "EVT-2404", チケット: "出展者" },
      { 受付URL: "https://example.com/checkin/EVT-2405", 参加者名: "伊藤 葵", 受付番号: "EVT-2405", チケット: "一般 / 午後" },
      { 受付URL: "https://example.com/checkin/EVT-2406", 参加者名: "渡辺 直樹", 受付番号: "EVT-2406", チケット: "スタッフ" },
      ...Array.from({ length: 18 }, (_, index) => {
        const number = index + 7;
        const familyNames = ["山本", "中村", "小林", "加藤", "吉田", "山田"];
        const givenNames = ["陽菜", "悠真", "結衣", "大翔", "美月", "蓮"];
        const tickets = ["一般 / 午前", "一般 / 午後", "VIP / 終日", "出展者", "スタッフ", "招待"];
        return {
          受付URL: `https://example.com/checkin/EVT-${2400 + number}`,
          参加者名: `${familyNames[index % familyNames.length]} ${givenNames[index % givenNames.length]}`,
          受付番号: `EVT-${2400 + number}`,
          チケット: tickets[index % tickets.length],
        };
      }),
    ],
    sourceName: "イベント受付デモ",
    sourceType: "manual",
  },
};

export const DEMOS: readonly DemoScenario[] = [
  ASSET_DEMO,
  PRODUCT_DEMO,
  EVENT_DEMO,
];

function cloneDemo(demo: DemoScenario): DemoScenario {
  return {
    ...demo,
    mapping: { ...demo.mapping },
    table: {
      ...demo.table,
      headers: [...demo.table.headers],
      rows: demo.table.rows.map((row) => ({ ...row })),
    },
  };
}

export function getDemoScenarios(): DemoScenario[] {
  return DEMOS.map(cloneDemo);
}

export function getDemoScenario(id: DemoScenario["id"]): DemoScenario | undefined {
  const demo = DEMOS.find((candidate) => candidate.id === id);
  return demo ? cloneDemo(demo) : undefined;
}
