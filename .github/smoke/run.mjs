import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
run("npm", ["pack", "-w", "@brianhung/emoji-picker-core", "-w", "@brianhung/emoji-picker-react", "--pack-destination", tmp, "--silent"]);
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
const vite = app("vite", ["react", "react-dom", "vite", "@floating-ui/react"]);
run("npx", ["vite", "build", "--sourcemap", "--logLevel", "error"], vite);
run("node", ["check.mjs"], vite);

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
run("npx", ["tsc", "-p", "."], shadcn);
run("npx", ["vite", "build", "--logLevel", "error"], shadcn);

console.log(`smoke passed in ${tmp}`);
