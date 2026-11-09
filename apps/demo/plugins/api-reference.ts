import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { Plugin } from "vite";

// Each part's data attribute and CSS variable tables, read from its *DataAttributes.ts and *CssVars.ts, as Base UI's docs read theirs
const SRC = fileURLToPath(new URL("../../../packages/react/src/", import.meta.url));

type Entry = { value: string; description: string; type?: string; default?: string };
type Module = Map<string, Entry>;
export type PartReference = { attributes: string[][]; variables: string[][] };

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

const code = (text: string) => (text.includes("`") ? text : `\`${text}\``);

// Keyed by part, such as EmojiPickerRoot or EmojiSuggestionsPositioner
export function apiReference(): Record<string, PartReference> {
  const cache = new Map<string, Module>();
  const parts: Record<string, PartReference> = {};
  const files = readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .map((f) => f.split("\\").join("/"))
    .filter((f) => /(DataAttributes|CssVars)\.ts$/.test(f) && !/(Common|Interaction)\w*DataAttributes/.test(f))
    .sort();
  for (const file of files) {
    const [, part, kind] = file.match(/(\w+?)(DataAttributes|CssVars)\.ts$/)!;
    const entry = (parts[part!] ??= { attributes: [], variables: [] });
    for (const e of readModule(join(SRC, file), cache).values()) {
      if (kind === "CssVars") entry.variables.push([e.value, e.default ? code(e.default) : "—", e.description]);
      else entry.attributes.push([e.value, e.type ?? "—", e.description]);
    }
  }
  return parts;
}

const ID = "virtual:api-reference";

export function apiReferencePlugin(): Plugin {
  return {
    name: "api-reference",
    resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
    load(id) {
      if (id !== `\0${ID}`) return;
      for (const f of readdirSync(SRC, { recursive: true, encoding: "utf8" })) if (/(DataAttributes|CssVars)\.ts$/.test(f)) this.addWatchFile(join(SRC, f));
      return `export default ${JSON.stringify(apiReference())};`;
    },
  };
}
