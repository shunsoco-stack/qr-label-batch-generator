import { beforeEach, describe, expect, it } from "vitest";
import { isElementInsideLabel } from "./label-layout";
import {
  BUILT_IN_TEMPLATES,
  TEMPLATE_SCHEMA_VERSION,
  TEMPLATE_STORAGE_KEY,
  createCustomTemplate,
  deleteUserTemplate,
  getBuiltInTemplates,
  loadAllTemplates,
  loadUserTemplates,
  saveUserTemplate,
  saveUserTemplates,
} from "./template-store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("built-in templates", () => {
  it("provides four complete, printable layouts", () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(4);
    expect(BUILT_IN_TEMPLATES.map((template) => template.id)).toEqual([
      "asset-management",
      "product-shelf",
      "event-checkin",
      "compact-url",
    ]);

    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.builtIn).toBe(true);
      expect(template.elements.map((element) => element.type).sort()).toEqual(
        ["additional", "id", "qr", "title"],
      );
      expect(
        template.elements.every((element) =>
          isElementInsideLabel(element, template.size),
        ),
      ).toBe(true);
    }
  });

  it("returns defensive clones", () => {
    const first = getBuiltInTemplates();
    first[0].name = "変更済み";
    first[0].elements[0].xMm = 999;

    const second = getBuiltInTemplates();
    expect(second[0].name).toBe("備品管理");
    expect(second[0].elements[0].xMm).toBe(3);
  });
});

describe("versioned user template storage", () => {
  it("creates and round-trips a custom-sized template", () => {
    const custom = createCustomTemplate({
      id: "custom-70x42",
      name: "倉庫棚札",
      size: { widthMm: 70, heightMm: 42 },
      print: { marginMm: 7, gapMm: 1.5 },
    });

    const saved = saveUserTemplate(custom);
    expect(saved).toHaveLength(1);
    expect(loadUserTemplates()).toEqual([custom]);
    expect(loadAllTemplates()).toHaveLength(5);

    const envelope = JSON.parse(
      window.localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? "{}",
    );
    expect(envelope.version).toBe(TEMPLATE_SCHEMA_VERSION);
  });

  it("replaces an existing ID and deletes only the selected user template", () => {
    const first = createCustomTemplate({ id: "one", name: "最初" });
    const second = createCustomTemplate({ id: "two", name: "二番目" });
    saveUserTemplates([first, second]);
    saveUserTemplate({ ...first, name: "更新済み" });

    expect(loadUserTemplates().map((template) => template.name)).toEqual([
      "更新済み",
      "二番目",
    ]);
    expect(deleteUserTemplate("one").map((template) => template.id)).toEqual([
      "two",
    ]);
  });

  it("saves a customized built-in under a user namespace", () => {
    const copy = { ...getBuiltInTemplates()[0], builtIn: false };
    const saved = saveUserTemplate(copy);
    expect(saved[0]).toMatchObject({
      id: "user-asset-management",
      builtIn: false,
    });
    expect(BUILT_IN_TEMPLATES[0].builtIn).toBe(true);
  });

  it("recovers safely from corrupt or unsupported storage", () => {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, "{broken");
    expect(loadUserTemplates()).toEqual([]);

    window.localStorage.setItem(
      TEMPLATE_STORAGE_KEY,
      JSON.stringify({ version: 999, templates: [getBuiltInTemplates()[0]] }),
    );
    expect(loadUserTemplates()).toEqual([]);
  });

  it("accepts a legacy array and removes its built-in privilege", () => {
    const legacy = createCustomTemplate({ id: "legacy", name: "旧形式" });
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify([legacy]));
    expect(loadUserTemplates()).toEqual([legacy]);
  });
});
