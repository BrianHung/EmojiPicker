import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { Plugin } from "vite";

// The data attribute and CSS variable tables, read from each part's *DataAttributes.ts and *CssVars.ts, as Base UI's docs read theirs
const SRC = fileURLToPath(new URL("../../../packages/react/src/", import.meta.url));

type Entry = { value: string; description: string; type?: string; default?: string };
type Module = Map<string, Entry>;

const SECTIONS: Record<string, { kind: "DataAttributes" | "CssVars"; parts: string[] }> = {
  rootAttributes: { kind: "DataAttributes", parts: ["picker/root/EmojiPickerRoot"] },
  rootVariables: { kind: "CssVars", parts: ["picker/root/EmojiPickerRoot"] },
  searchAttributes: {
    kind: "DataAttributes",
    parts: ["picker/search/EmojiPickerSearch", "picker/search-field/EmojiPickerSearchField", "picker/search-input/EmojiPickerSearchInput", "picker/search-clear/EmojiPickerSearchClear", "picker/search-status/EmojiPickerSearchStatus"],
  },
  categoryNavAttributes: { kind: "DataAttributes", parts: ["picker/category-nav/EmojiPickerCategoryNav", "picker/category-nav-tab/EmojiPickerCategoryNavTab"] },
  listAttributes: {
    kind: "DataAttributes",
    parts: [
      "picker/viewport/EmojiPickerViewport",
      "picker/list/EmojiPickerList",
      "picker/list-section/EmojiPickerListSection",
      "picker/list-section-title/EmojiPickerListSectionTitle",
      "picker/list-section-actions/EmojiPickerListSectionActions",
      "picker/list-cell/EmojiPickerListCell",
      "picker/list-variations/EmojiPickerListVariations",
      "picker/list-variations-option/EmojiPickerListVariationsOption",
    ],
  },
  listVariables: { kind: "CssVars", parts: ["picker/list/EmojiPickerList"] },
  skinToneAttributes: {
    kind: "DataAttributes",
    parts: ["picker/skin-tone/EmojiPickerSkinTone", "picker/skin-tone-trigger/EmojiPickerSkinToneTrigger", "picker/skin-tone-options/EmojiPickerSkinToneOptions", "picker/skin-tone-option/EmojiPickerSkinToneOption"],
  },
  skinToneVariables: { kind: "CssVars", parts: ["picker/skin-tone/EmojiPickerSkinTone"] },
  previewAttributes: { kind: "DataAttributes", parts: ["picker/preview/EmojiPickerPreview"] },
  reactionsAttributes: { kind: "DataAttributes", parts: ["picker/reactions/EmojiPickerReactions", "picker/reactions-item/EmojiPickerReactionsItem", "picker/reactions-expand/EmojiPickerReactionsExpand", "picker/panel/EmojiPickerPanel"] },
  popoverTriggerAttributes: { kind: "DataAttributes", parts: ["popover/trigger/EmojiPopoverTrigger"] },
  popoverPositionerAttributes: { kind: "DataAttributes", parts: ["popover/positioner/EmojiPopoverPositioner", "suggestions/positioner/EmojiSuggestionsPositioner"] },
  popoverPositionerVariables: { kind: "CssVars", parts: ["popover/positioner/EmojiPopoverPositioner", "suggestions/positioner/EmojiSuggestionsPositioner"] },
  popoverPopupAttributes: { kind: "DataAttributes", parts: ["popover/popup/EmojiPopoverPopup", "suggestions/popup/EmojiSuggestionsPopup"] },
  emojiAttributes: { kind: "DataAttributes", parts: ["emoji/Emoji"] },
};

const tagText = (tag: ts.JSDocTag) => (ts.getTextOfJSDocComment(tag.comment) ?? "").trim();

function readModule(file: string, cache: Map<string, Module>): Module {
  const cached = cache.get(file);
  if (cached) return cached;
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const namespaces = new Map<string, string>();
  const entries: Module = new Map();
  const target = (spec: string) => resolve(dirname(file), `${spec}.ts`);
  cache.set(file, entries);
  for (const node of source.statements) {
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings) && ts.isStringLiteral(node.moduleSpecifier))
      namespaces.set(node.importClause.namedBindings.name.text, target(node.moduleSpecifier.text));
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = readModule(target(node.moduleSpecifier.text), cache);
      const names = node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements.map((e) => [e.name.text, (e.propertyName ?? e.name).text] as const) : [...from.keys()].map((k) => [k, k] as const);
      for (const [name, original] of names) entries.set(name, from.get(original)!);
    } else if (ts.isVariableStatement(node)) {
      const doc = ts.getJSDocCommentsAndTags(node).find(ts.isJSDoc);
      const tags = doc?.tags ?? [];
      // @type {…} parses as a type expression: its text is the type
      const type = tags.find((t) => t.tagName.text === "type") as ts.JSDocTypeTag | undefined;
      for (const decl of node.declarationList.declarations) {
        const init = decl.initializer;
        const value = !init
          ? undefined
          : ts.isStringLiteral(init)
            ? init.text
            : ts.isPropertyAccessExpression(init) && ts.isIdentifier(init.expression)
              ? readModule(namespaces.get(init.expression.text)!, cache).get(init.name.text)?.value
              : undefined;
        if (!ts.isIdentifier(decl.name) || value === undefined) throw new Error(`${relative(SRC, file)}: ${decl.getText()} is not a documented constant`);
        entries.set(decl.name.text, {
          value,
          description: (ts.getTextOfJSDocComment(doc?.comment) ?? "").replace(/\s+/g, " ").trim(),
          type: type?.typeExpression?.type.getText(),
          default: tags.find((t) => t.tagName.text === "default") && tagText(tags.find((t) => t.tagName.text === "default")!),
        });
      }
    }
  }
  return entries;
}

// EmojiPickerSearchField → SearchField; EmojiPopoverPositioner → EmojiPopover.Positioner
const partName = (path: string) => {
  const name = path.split("/").pop()!;
  const match = name.match(/^(EmojiPicker|EmojiPopover|EmojiSuggestions)(.+)$/);
  if (!match) return name;
  return match[1] === "EmojiPicker" ? match[2]! : `${match[1]}.${match[2]}`;
};

export function apiReference(): Record<string, string[][]> {
  const cache = new Map<string, Module>();
  const files = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((f) => /(DataAttributes|CssVars)\.ts$/.test(f) && !/(Common|Interaction)\w*DataAttributes/.test(f));
  const documented = new Set(Object.values(SECTIONS).flatMap(({ kind, parts }) => parts.map((p) => `${p}${kind}.ts`)));
  const missing = files.filter((f) => !documented.has(f.split("\\").join("/")));
  if (missing.length) throw new Error(`api-reference: no docs section for ${missing.join(", ")}`);
  return Object.fromEntries(
    Object.entries(SECTIONS).map(([key, { kind, parts }]) => {
      const rows = new Map<string, { entry: Entry; parts: string[] }>();
      for (const part of parts)
        for (const entry of readModule(join(SRC, `${part}${kind}.ts`), cache).values()) {
          const id = JSON.stringify([entry.value, entry.type, entry.description, entry.default]);
          const row = rows.get(id) ?? rows.set(id, { entry, parts: [] }).get(id)!;
          row.parts.push(partName(part));
        }
      const label = (row: { parts: string[]; entry: Entry }) => (parts.length > 1 && row.parts.length < parts.length ? `${row.parts.join(", ")}: ${row.entry.description}` : row.entry.description);
      return [key, [...rows.values()].map((row) => (kind === "CssVars" ? [row.entry.value, row.entry.default ?? "—", label(row)] : [row.entry.value, row.entry.type ?? "—", label(row)]))];
    }),
  );
}

const ID = "virtual:api-reference";

export function apiReferencePlugin(): Plugin {
  return {
    name: "api-reference",
    resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
    load(id) {
      if (id !== `\0${ID}`) return;
      for (const f of readdirSync(SRC, { recursive: true, encoding: "utf8" })) if (/(DataAttributes|CssVars)\.ts$/.test(f)) this.addWatchFile(join(SRC, f));
      return Object.entries(apiReference())
        .map(([key, rows]) => `export const ${key} = ${JSON.stringify(rows)};`)
        .join("\n");
    },
  };
}
