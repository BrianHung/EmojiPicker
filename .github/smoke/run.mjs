import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const fixtures = fileURLToPath(new URL(".", import.meta.url));
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
const install = (cwd, deps) => run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", "--loglevel=error", ...deps], cwd);

const tmp = mkdtempSync(join(tmpdir(), "emoji-picker-smoke-"));
run("npm", ["run", "build", "-w", "@emoji-components/core"]);
run("npm", ["run", "build", "-w", "emoji-components"]);
run("npm", ["pack", "-w", "@emoji-components/core", "-w", "emoji-components", "-w", "@emoji-components/data", "--pack-destination", tmp, "--silent"]);
// The font builds with Python when packed, so only a font built beforehand is tested
const font = existsSync(join(root, "packages/twemoji-font/dist/twemoji.css"));
if (font) run("npm", ["pack", "-w", "@emoji-components/twemoji-font", "--ignore-scripts", "--pack-destination", tmp, "--silent"]);
else console.log("Skipped the Twemoji font package: run `npm run build:font` first to include it.");
const tarballs = readdirSync(tmp)
  .filter((f) => f.endsWith(".tgz"))
  .map((f) => join(tmp, f));

// The registry items emoji-components ships for jsDelivr are the site's, pinned to this release
const { version } = JSON.parse(readFileSync(join(root, "packages/react/package.json"), "utf8"));
run("tar", ["-xzf", tarballs.find((t) => /[/\\]emoji-components-\d/.test(t)), "-C", tmp, "package/r"]);
const packed = join(tmp, "package/r");
const site = join(root, "apps/demo/public/r");
assert.deepEqual(readdirSync(packed).sort(), readdirSync(site).sort(), "emoji-components r/ and the site's r/ list different items");
for (const file of readdirSync(site)) {
  const item = JSON.parse(readFileSync(join(site, file), "utf8").replaceAll("https://emoji.brianhung.me/r/", `https://cdn.jsdelivr.net/npm/emoji-components@${version}/r/`));
  assert.deepEqual(JSON.parse(readFileSync(join(packed, file), "utf8")), item, `emoji-components r/${file} differs from the site's`);
  for (const dep of [item, ...(item.items ?? [])].flatMap((i) => i.dependencies ?? [])) if (/^(emoji-components|@emoji-components\/)/.test(dep)) assert.ok(dep.endsWith(`@${version}`), `r/${file} depends on ${dep}, not ${version}`);
}

function app(name, deps) {
  const dir = join(tmp, name);
  cpSync(join(fixtures, name), dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `smoke-${name}`, private: true, type: "module" }));
  install(dir, [...tarballs, ...deps]);
  return dir;
}

// Importing only the picker must leave Floating UI out of the bundle
const vite = app("vite", ["react", "react-dom", "vite"]);
if (font) appendFileSync(join(vite, "main.js"), 'import "@emoji-components/twemoji-font/twemoji.css";\n');
run("npx", ["vite", "build", "--sourcemap", "--logLevel", "error"], vite);
run("node", ["check.mjs", ...(font ? ["--font"] : [])], vite);
run("node", ["-e", 'require("@emoji-components/core"); require("emoji-components");'], vite);

const react18 = app("react18", ["react@18", "react-dom@18", "@types/react@18", "@types/react-dom@18", "typescript", "vite"]);
run("npx", ["tsc", "-p", "."], react18);
run("npx", ["vite", "build", "--logLevel", "error"], react18);
run("npx", ["vite", "build", "--ssr", "src/app.tsx", "--outDir", "ssr", "--logLevel", "error"], react18);
run("node", ["ssr.mjs"], react18);

const next = app("next", ["next@16", "react@19", "react-dom@19", "typescript", "@types/react", "@types/node"]);
run("npx", ["next", "build"], next);

// The packages are preinstalled from the tarballs. Without a version range, shadcn skips installed
// dependencies, so it only fetches its `utils` item.
const shadcn = app("shadcn", ["react", "react-dom", "@types/react", "@types/react-dom", "typescript", "vite", "tailwindcss", "@tailwindcss/vite", "shadcn@4"]);
const item = JSON.parse(readFileSync(join(packed, "emoji-picker.json"), "utf8"));
item.dependencies = item.dependencies.map((dep) => dep.replace(/^(emoji-components|@emoji-components\/[^@]+)@.+$/, "$1"));
writeFileSync(join(tmp, "emoji-picker.json"), JSON.stringify(item));
run("npx", ["shadcn", "add", join(tmp, "emoji-picker.json"), "--yes", "--overwrite", "--silent"], shadcn);
// shadcn's css block has no top-level @font-face, so the item nests it in :root and shadcn hoists it into the layer
if (!/@font-face\s*\{\s*font-family: "Emoji Picker Apple"/.test(readFileSync(join(shadcn, "src/index.css"), "utf8"))) throw new Error("shadcn add did not write the Apple emoji @font-face");
run("npx", ["tsc", "-p", "."], shadcn);
run("npx", ["vite", "build", "--logLevel", "error"], shadcn);

rmSync(tmp, { recursive: true, force: true });
console.log("smoke passed");
