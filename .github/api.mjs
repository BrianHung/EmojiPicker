// Public API report (packages/<pkg>/api.md) and its guards, from the built dist and the TypeScript compiler API.
// `node .github/api.mjs` rewrites the reports; it fails when a .d.ts value export is missing at runtime (or the
// reverse), when a consumer's declaration emit hits TS2742, or when a name breaks the naming rules below.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const errors = [];
const fail = (message) => errors.push(message);

const PACKAGES = { core: "packages/core", react: "packages/react" };

// Each JS subpath of a package: its runtime module and its declaration entry
const entries = Object.entries(PACKAGES).flatMap(([pkg, dir]) => {
  const { name, exports } = json(`${dir}/package.json`);
  return Object.entries(exports).flatMap(([key, target]) => (target.types ? [{ pkg, dir, id: key === "." ? name : `${name}/${key.slice(2)}`, js: join(root, dir, target.default), dts: join(root, dir, target.types) }] : []));
});

const program = ts.createProgram(
  entries.map((e) => e.dts),
  { strict: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true },
);
const checker = program.getTypeChecker();

// An alias is type-only when any link of its re-export chain is `export type`
function typeOnly(symbol) {
  for (let s = symbol; s.flags & ts.SymbolFlags.Alias; s = checker.getImmediateAliasedSymbol(s)) {
    const decl = s.declarations?.[0];
    if (decl && (decl.isTypeOnly || decl.parent?.parent?.isTypeOnly)) return true;
  }
  return false;
}
const resolved = (symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
const isValue = (symbol) => !typeOnly(symbol) && Boolean(resolved(symbol).flags & ts.SymbolFlags.Value);
const ours = (decl) => /[/\\]packages[/\\](core|react)[/\\]dist[/\\]/.test(decl.getSourceFile().fileName);
// className, style, render, and children come with every part
const SHARED_PART_PROPS = new Set(["className", "style", "render", "children"]);

for (const entry of entries) {
  const module = checker.getSymbolAtLocation(program.getSourceFile(entry.dts));
  const symbols = checker.getExportsOfModule(module);
  entry.symbols = symbols;
  entry.values = symbols
    .filter(isValue)
    .map((s) => s.name)
    .sort();
  entry.types = symbols
    .filter((s) => !isValue(s))
    .map((s) => s.name)
    .sort();
  entry.props = Object.fromEntries(
    symbols
      .filter((s) => !isValue(s) && /Props$/.test(s.name))
      .map((s) => [
        s.name,
        checker
          .getPropertiesOfType(checker.getDeclaredTypeOfSymbol(resolved(s)))
          .filter((p) => !SHARED_PART_PROPS.has(p.name) && p.declarations?.some(ours))
          .map((p) => p.name)
          .sort(),
      ])
      .filter(([, props]) => props.length),
  );
  const runtime = await import(pathToFileURL(entry.js).href);
  entry.runtime = runtime;
  const keys = Object.keys(runtime).sort();
  const missing = entry.values.filter((n) => !keys.includes(n));
  const undeclared = keys.filter((n) => !entry.values.includes(n));
  if (missing.length) fail(`${entry.id}: the .d.ts exports ${missing.join(", ")} as values, but the module does not (export them type-only)`);
  if (undeclared.length) fail(`${entry.id}: the module exports ${undeclared.join(", ")}, but the .d.ts does not declare them as values`);
}

// A consumer that re-exports every value with declaration: true must emit without TS2742 (an inferred type it cannot name)
{
  const probe = join(root, "api-probe.tsx");
  const source = entries
    .filter((e) => e.pkg === "react")
    .flatMap((e, i) => [
      `import * as m${i} from "${e.id}";`,
      ...e.values.flatMap((v) => [
        `export const v${i}_${v} = m${i}.${v};`,
        ...Object.keys(e.runtime[v] ?? {})
          .filter((k) => /^[A-Z]/.test(k) && typeof e.runtime[v][k] !== "string")
          .map((k) => `export const p${i}_${v}_${k} = m${i}.${v}.${k};`),
      ]),
    ])
    .join("\n");
  const options = { strict: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, declaration: true, emitDeclarationOnly: true, skipLibCheck: true, types: [] };
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  host.getSourceFile = (file, ...rest) => (file === probe ? ts.createSourceFile(file, source, ts.ScriptTarget.Latest) : getSourceFile(file, ...rest));
  host.fileExists = (file) => file === probe || fileExists(file);
  host.readFile = (file) => (file === probe ? source : readFile(file));
  host.writeFile = () => {};
  const consumer = ts.createProgram([probe], options, host);
  const diagnostics = [...consumer.getSemanticDiagnostics(), ...consumer.emit().diagnostics];
  for (const d of diagnostics) fail(`declaration consumer: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}

// Ownership: a flat name belongs to the component folder that defines it
const sourceProgram = ts.createProgram([join(root, "packages/react/src/index.ts")], {
  strict: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  customConditions: ["@emoji-components/source"],
  skipLibCheck: true,
  noEmit: true,
});
const sourceChecker = sourceProgram.getTypeChecker();
const owners = new Map();
for (const file of ["index.ts"]) {
  const module = sourceChecker.getSymbolAtLocation(sourceProgram.getSourceFile(join(root, "packages/react/src", file)));
  for (const s of sourceChecker.getExportsOfModule(module)) {
    const decl = (s.flags & ts.SymbolFlags.Alias ? sourceChecker.getAliasedSymbol(s) : s).declarations?.[0];
    if (decl) owners.set(s.name, relative(root, decl.getSourceFile().fileName).split("\\").join("/"));
  }
}

// Owner prefix per source folder. Library-wide code (internals) is EmojiComponents; provider and suggestions hook names only need to say Emoji.
const OWNERS = [
  [/^packages\/react\/src\/picker\//, "EmojiPicker"],
  [/^packages\/react\/src\/internals\//, "EmojiComponents"],
  [/^packages\/react\/src\/emoji\//, "Emoji"],
];
const LIBRARY = /^packages\/react\/src\/(provider|use-emoji-suggestions)\//;
// Justified exceptions
const NAME_ALLOWLIST = new Set([
  // React's CategoryOption narrows core's CategoryOption to React icons and keeps its name
  "CategoryOption",
]);
const pascal = (name) =>
  name
    .replace(/^use/, "")
    .replace(/^Use/, "")
    .replace(/^[a-z]/, (c) => c.toUpperCase());

for (const [name, file] of owners) {
  if (NAME_ALLOWLIST.has(name) || file.startsWith("packages/core/")) continue;
  const owner = OWNERS.find(([re]) => re.test(file))?.[1];
  if (owner && !pascal(name).startsWith(owner)) fail(`${name} (${file}) must start with ${owner}, its owner's name`);
  if (!owner && LIBRARY.test(file) && !/Emoji/.test(name)) fail(`${name} (${file}) must name Emoji`);
  if (!owner && !LIBRARY.test(file)) fail(`${name} (${file}) has no owner folder in .github/api.mjs`);
}

// Core's factories return stores named after them (createEmojiStore returns EmojiStore); createEmojiGrid returns a grid, not a store
for (const s of entries.filter((e) => e.pkg === "core").flatMap((e) => e.symbols)) {
  if (!/^createEmoji/.test(s.name) || s.name === "createEmojiGrid") continue;
  const returned = checker.getReturnTypeOfSignature(checker.getTypeOfSymbol(resolved(s)).getCallSignatures()[0]);
  const name = (returned.aliasSymbol ?? returned.getSymbol())?.name;
  const store = `${s.name.slice(6).replace(/Store$/, "")}Store`;
  if (name !== store) fail(`${s.name} returns ${name}; name it ${store}`);
}

// The DOM contract: data attributes and CSS variables from the *DataAttributes / *CssVariables namespaces
const react = entries.filter((e) => e.pkg === "react");
const constants = (suffix) =>
  Object.fromEntries(
    react
      .flatMap((e) => Object.entries(e.runtime))
      .filter(([name]) => name.endsWith(suffix))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
const attributes = constants("DataAttributes");
const variables = constants("CssVariables");

// A part's slot is its component and part names in kebab case, as shadcn's `popover-trigger`; a Root's slot is its component's
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const slotOf = (namespace) => kebab(namespace.replace(/DataAttributes$/, "")).replace(/-root$/, "");
const { SLOTS } = await import(pathToFileURL(join(root, "packages/react/dist/internals/slots.js")).href);
// rollup-plugin-dts writes a namespace member as `declare const X_slot: typeof slot`; the JSDoc is on `slot`
function constant(symbol) {
  const decl = resolved(symbol).declarations[0];
  return decl.type && ts.isTypeQueryNode(decl.type) ? resolved(checker.getSymbolAtLocation(decl.type.exprName)).declarations[0] : decl;
}
const documentedSlots = {};
for (const entry of react) {
  const module = checker.getSymbolAtLocation(program.getSourceFile(entry.dts));
  for (const s of checker.getExportsOfModule(module).filter((s) => s.name.endsWith("DataAttributes"))) {
    const slot = checker.getExportsOfModule(resolved(s)).find((m) => m.name === "slot");
    const value =
      slot &&
      ts
        .getJSDocType(constant(slot))
        ?.getText()
        .match(/'([^']+)'/)?.[1];
    if (value) documentedSlots[s.name] = value;
  }
}
for (const [namespace, slot] of Object.entries(documentedSlots)) if (slot !== slotOf(namespace)) fail(`${namespace} documents data-slot="${slot}"; its name makes it "${slotOf(namespace)}"`);
for (const slot of Object.values(SLOTS)) if (!Object.values(documentedSlots).includes(slot)) fail(`data-slot="${slot}" renders, but no part documents it`);

for (const [namespace, values] of Object.entries(attributes)) for (const v of Object.values(values)) if (!/^data-[a-z]+(-[a-z]+)*$/.test(v)) fail(`${namespace}: ${v} is not a kebab-case data attribute`);

// Base UI's positioner variables keep Base UI's names
const BASE_UI_VARIABLES = new Set(["--anchor-width", "--anchor-height", "--available-width", "--available-height", "--transform-origin"]);
const variablePrefix = (namespace) => `--${kebab(OWNERS.map(([, p]) => p).find((p) => namespace.startsWith(p)))}-`;
for (const [namespace, values] of Object.entries(variables))
  for (const v of Object.values(values)) if (!BASE_UI_VARIABLES.has(v) && !v.startsWith(variablePrefix(namespace))) fail(`${namespace}: ${v} must start with ${variablePrefix(namespace)}`);

// Stylesheets: what each defines and what it reads from the page
const STYLES = ["tokens.css", "theme.css", "shadcn.css"];
const styles = Object.fromEntries(
  STYLES.map((file) => {
    const css = read(`packages/react/src/styles/${file}`);
    const defines = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))];
    const reads = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))].filter((v) => !defines.includes(v));
    return [file, { defines, reads }];
  }),
);
for (const v of styles["tokens.css"].defines) if (!/^--emoji-(picker-[a-z-]+|font-family)$/.test(v)) fail(`tokens.css defines ${v}; tokens are --emoji-picker-* or Emoji's --emoji-font-family`);
for (const v of styles["theme.css"].defines) if (!/^--(color|radius|shadow|font)-emoji-picker(-[a-z-]+)?$/.test(v)) fail(`theme.css defines ${v}; Tailwind theme keys are --{color,radius,shadow,font}-emoji-picker*`);
// tokens.css falls back only to Tailwind's theme variables
for (const v of styles["tokens.css"].reads) if (!["--font-sans", "--shadow-lg"].includes(v) && !styles["tokens.css"].defines.includes(v)) fail(`tokens.css reads ${v}, which neither this package nor Tailwind defines`);

// Storage keys and the default change event type
const coreSource = readdirSync(join(root, "packages/core/src"), { recursive: true, encoding: "utf8" })
  .filter((f) => /(?<!\.test)\.ts$/.test(f))
  .map((f) => read(`packages/core/src/${f}`))
  .join("\n");
const storage = [...coreSource.matchAll(/persisted\("([^"]+)"\)/g)].map((m) => m[1]);
const events = [...coreSource.matchAll(/new Event\("([^"]+)"\)/g)].map((m) => m[1]);
for (const key of storage) if (!/^emoji-components:[a-z]+(-[a-z]+)*$/.test(key)) fail(`localStorage key ${key} must be emoji-components:<kebab-case>`);
for (const type of events) if (type !== "emoji-components") fail(`change events default to new Event("emoji-components"), not "${type}"`);
for (const dir of readdirSync(join(root, "packages")))
  for (const script of ["preinstall", "install", "postinstall", "prepare"]) if (json(`packages/${dir}/package.json`).scripts?.[script]) fail(`packages/${dir} runs "${script}", which installs run; build in prepack or prepublishOnly`);

// shadcn registry items: shadcn writes a file without a target by its type (resolveFileTargetDirectory in shadcn's resolve-file-path.ts)
const DIRS = { "registry:ui": "components/ui", "registry:lib": "lib", "registry:hook": "hooks", "registry:component": "components", "registry:block": "components" };
// The names a file exports, with whether each is a type
const exportedNames = (file) => {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest);
  return source.statements.flatMap((s) => {
    if (ts.isExportDeclaration(s) && s.exportClause && ts.isNamedExports(s.exportClause)) return s.exportClause.elements.map((e) => ({ name: e.name.text, type: s.isTypeOnly || e.isTypeOnly }));
    if (!s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return [];
    if (ts.isVariableStatement(s)) return s.declarationList.declarations.map((d) => ({ name: d.name.getText(source), type: false }));
    return s.name ? [{ name: s.name.text, type: ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s) }] : [];
  });
};
const registry = json("apps/demo/registry.json").items.map((item) => ({
  name: item.name,
  files: item.files.map((f) => {
    const target = f.target ?? `${DIRS[f.type]}/${basename(f.path)}`;
    // shadcn/tailwind.css redefines data-selected as [data-selected="true"], and the parts set it as a present, empty attribute
    if (read(`apps/demo/${f.path}`).includes("data-selected:")) fail(`registry ${item.name}: ${f.path} styles data-selected:, which shadcn/ui's variant never matches; use the element's aria state`);
    return { target, exports: exportedNames(`apps/demo/${f.path}`) };
  }),
}));
for (const item of registry) {
  if (!/^emoji-[a-z]+(-[a-z]+)*$/.test(item.name)) fail(`registry item ${item.name} must be emoji-<kebab-case>`);
  for (const { target, exports } of item.files) {
    const file = basename(target).replace(/\.tsx?$/, "");
    if (target.startsWith("hooks/") ? !/^use-emoji-[a-z-]+$/.test(file) : !/^emoji-[a-z-]+$/.test(file)) fail(`registry ${item.name}: ${target} must be named ${target.startsWith("hooks/") ? "use-emoji-*" : "emoji-*"}`);
    const values = exports.filter((e) => !e.type).map((e) => e.name);
    for (const name of values) if (/^[A-Z]/.test(name) && !name.startsWith("Emoji")) fail(`registry ${item.name}: ${target} exports ${name}; components start with Emoji`);
    if (target.startsWith("hooks/")) for (const name of values) if (!name.startsWith("use")) fail(`registry ${item.name}: ${target} exports ${name}; hook files export hooks`);
  }
}

// The reports
const list = (names) => (names.length ? names.map((n) => `\`${n}\``).join(", ") : "none");
const table = (rows) => rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
function report(pkg) {
  const out = [`<!-- Generated by \`npm run api\` (.github/api.mjs). Do not edit. -->`, "", `# ${json(`${PACKAGES[pkg]}/package.json`).name} public API`, ""];
  for (const e of entries.filter((e) => e.pkg === pkg)) {
    out.push(`## \`${e.id}\``, "", `Values: ${list(e.values)}`, "", `Types: ${list(e.types)}`, "");
    const props = Object.entries(e.props);
    if (props.length) out.push("| Props | Own props |", "|---|---|", table(props.map(([n, p]) => [`\`${n}\``, list(p)])), "");
  }
  if (pkg === "core") out.push("## Storage", "", `localStorage keys: ${list(storage)}`, "", `Default change event type: ${list(events)}`, "");
  if (pkg === "react") {
    out.push("## data-slot", "", "| Attributes | data-slot |", "|---|---|", table(Object.entries(documentedSlots).map(([n, s]) => [`\`${n}\``, `\`${s}\``])), "");
    out.push("## Data attributes", "", "| Namespace | Attributes |", "|---|---|", table(Object.entries(attributes).map(([n, v]) => [`\`${n}\``, list(Object.values(v))])), "");
    out.push("## CSS variables", "", "| Namespace | Variables |", "|---|---|", table(Object.entries(variables).map(([n, v]) => [`\`${n}\``, list(Object.values(v))])), "");
    out.push("## Stylesheets", "", "| File | Defines | Reads |", "|---|---|---|", table(STYLES.map((f) => [`\`${f}\``, list(styles[f].defines), list(styles[f].reads)])), "");
    out.push("## Registry", "", "| Item | File | Exports |", "|---|---|---|", table(registry.flatMap((i) => i.files.map((f) => [`\`${i.name}\``, `\`${f.target}\``, list(f.exports.map((e) => e.name))]))), "");
  }
  return `${out.join("\n").trim()}\n`;
}
for (const [pkg, dir] of Object.entries(PACKAGES)) writeFileSync(join(root, dir, "api.md"), report(pkg));

if (errors.length) {
  console.error(errors.map((e) => `api: ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  `api: ${entries.length} entries match their declarations; reports in ${Object.values(PACKAGES)
    .map((d) => `${d}/api.md`)
    .join(", ")}`,
);
