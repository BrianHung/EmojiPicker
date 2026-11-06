import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const fixtures = fileURLToPath(new URL(".", import.meta.url));
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
const install = (cwd, deps) => run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", "--loglevel=error", ...deps], cwd);

const tmp = mkdtempSync(join(tmpdir(), "emoji-picker-smoke-"));
run("npm", ["run", "build", "-w", "@brianhung/emoji-picker-core"]);
run("npm", ["run", "build", "-w", "@brianhung/emoji-picker-react"]);
run("npm", ["pack", "-w", "@brianhung/emoji-picker-core", "-w", "@brianhung/emoji-picker-react", "-w", "@brianhung/emoji-picker-data", "--pack-destination", tmp, "--silent"]);
// The font builds with Python when packed, so only a font built beforehand is tested
const font = existsSync(join(root, "packages/twemoji-font/dist/twemoji.css"));
if (font) run("npm", ["pack", "-w", "@brianhung/emoji-picker-twemoji-font", "--ignore-scripts", "--pack-destination", tmp, "--silent"]);
else console.log("Skipped the Twemoji font package: run `npm run build:font` first to include it.");
const tarballs = readdirSync(tmp)
  .filter((f) => f.endsWith(".tgz"))
  .map((f) => join(tmp, f));

function app(name, deps) {
  const dir = join(tmp, name);
  cpSync(join(fixtures, name), dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `smoke-${name}`, private: true, type: "module" }));
  install(dir, [...tarballs, ...deps]);
  return dir;
}

// Importing only the picker must leave Floating UI out of the bundle
const vite = app("vite", ["react", "react-dom", "vite"]);
if (font) appendFileSync(join(vite, "main.js"), 'import "@brianhung/emoji-picker-twemoji-font/twemoji.css";\n');
run("npx", ["vite", "build", "--sourcemap", "--logLevel", "error"], vite);
run("node", ["check.mjs", ...(font ? ["--font"] : [])], vite);
run("node", ["-e", 'require("@brianhung/emoji-picker-core"); require("@brianhung/emoji-picker-react");'], vite);

const react18 = app("react18", ["react@18", "react-dom@18", "@types/react@18", "@types/react-dom@18", "typescript", "vite"]);
run("npx", ["tsc", "-p", "."], react18);
run("npx", ["vite", "build", "--logLevel", "error"], react18);
run("npx", ["vite", "build", "--ssr", "src/app.tsx", "--outDir", "ssr", "--logLevel", "error"], react18);
run("node", ["ssr.mjs"], react18);

const next = app("next", ["next@16", "react@19", "react-dom@19", "typescript", "@types/react", "@types/node"]);
run("npx", ["next", "build"], next);

// The packages are preinstalled from the tarballs. Without a version range, shadcn skips installed
// dependencies, so it only fetches its `utils` item.
run("npm", ["run", "build:registry", "-w", "demo"]);
const shadcn = app("shadcn", ["react", "react-dom", "@types/react", "@types/react-dom", "typescript", "vite", "tailwindcss", "@tailwindcss/vite", "shadcn@4"]);
const item = JSON.parse(readFileSync(join(root, "apps/demo/public/r/emoji-picker.json"), "utf8"));
item.dependencies = item.dependencies.map((dep) => dep.replace(/^(@brianhung\/[^@]+)@.+$/, "$1"));
writeFileSync(join(tmp, "emoji-picker.json"), JSON.stringify(item));
run("npx", ["shadcn", "add", join(tmp, "emoji-picker.json"), "--yes", "--overwrite", "--silent"], shadcn);
// shadcn's css block has no top-level @font-face, so the item nests it in :root and shadcn hoists it into the layer
if (!/@font-face\s*\{\s*font-family: "Emoji Picker Apple"/.test(readFileSync(join(shadcn, "src/index.css"), "utf8"))) throw new Error("shadcn add did not write the Apple emoji @font-face");
run("npx", ["tsc", "-p", "."], shadcn);
run("npx", ["vite", "build", "--logLevel", "error"], shadcn);

console.log(`smoke passed in ${tmp}`);
