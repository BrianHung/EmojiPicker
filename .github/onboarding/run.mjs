import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const MAX_STEPS = 3;
const SITE = "https://emoji.brianhung.me";
const PORT = 5771;
const fromNpm = process.argv.includes("--from-npm");
const dryRun = process.argv.includes("--dry-run");

const root = fileURLToPath(new URL("../..", import.meta.url));
const env = { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1", ...(fromNpm && { npm_config_prefer_online: "true" }) };
const run = (cmd, args, cwd = root, stdio = "inherit") => execFileSync(cmd, args, { cwd, stdio, env, encoding: "utf8" });
const sh = (cwd, command) => run("sh", ["-c", command], cwd);

const docs = fromNpm ? await (await fetch(`${SITE}/docs.md`)).text() : run("npx", ["tsx", "--eval", 'import("./plugins/markdown-docs.ts").then((m) => process.stdout.write(m.ROUTES["docs.md"].render()))'], join(root, "apps/demo"), "pipe");

const section = (md, heading) => {
  const start = md.indexOf(`\n${heading}\n`);
  if (start < 0) throw new Error(`docs.md has no "${heading}"`);
  const level = heading.split(" ")[0];
  const end = md.slice(start + heading.length + 2).search(new RegExp(`\\n#{1,${level.length}} `));
  return md.slice(start, end < 0 ? undefined : start + heading.length + 2 + end);
};
const FENCE = "```";
const code = (md, lang) => {
  const block = md.match(new RegExp(`${FENCE}${lang}[^\\n]*\\n([\\s\\S]*?)\\n${FENCE}`));
  if (!block) throw new Error(`no ${lang} block in:\n${md.slice(0, 200)}`);
  return block[1];
};
const module = (snippet, where) => {
  if (!/^import /m.test(snippet) || !/^export default /m.test(snippet)) throw new Error(`${where}: the snippet is not a file to paste (no import or no default export):\n${snippet}`);
  return snippet;
};

const installation = section(docs, "## Installation");
const cli = section(installation, "### Command");
const manual = section(installation, "### Manual");
const install = code(manual, "bash");
const add = code(cli, "bash");
const usage = module(code(section(docs, "## Usage"), "tsx"), "Usage");
const cardUsage = module(code(cli, "tsx"), "Installation › Command");

const paths = [
  { name: "vite", scaffold: "npm create vite@latest app -- --template react-ts", steps: [install, ["src/App.tsx", usage], "npm run dev"], dev: true },
  { name: "next", scaffold: "npx create-next-app@latest app --yes --use-npm --disable-git", steps: [install, ["app/page.tsx", usage], "npm run dev"] },
  { name: "shadcn", scaffold: "npx shadcn@latest init -t vite -n app -b base -p nova --no-monorepo", steps: [add, ["src/App.tsx", cardUsage], "npm run dev"], dev: true },
];

for (const p of paths) {
  console.log(`\n${p.name}: ${p.steps.length} steps (max ${MAX_STEPS}) after \`${p.scaffold}\``);
  p.steps.forEach((s, i) => console.log(`  ${i + 1}. ${typeof s === "string" ? s : `write ${s[0]} (${s[1].split("\n").length} lines from docs.md)`}`));
  if (p.steps.length > MAX_STEPS) throw new Error(`${p.name} takes ${p.steps.length} steps; the docs claim ${MAX_STEPS}`);
}
console.log(`\nsource: ${fromNpm ? "npm and the registry on jsDelivr" : "packed tarballs and the local registry"}`);
if (dryRun) process.exit(0);

const tmp = mkdtempSync(join(tmpdir(), "emoji-picker-onboarding-"));
const tarballs = {};
const routed = [];
let registry;
if (!fromNpm) {
  run("npm", ["run", "build", "-w", "@emoji-components/core", "-w", "emoji-components"]);
  run("npm", ["pack", "-w", "@emoji-components/core", "-w", "emoji-components", "-w", "@emoji-components/data", "--pack-destination", tmp, "--silent"]);
  for (const f of readdirSync(tmp).filter((f) => f.endsWith(".tgz"))) {
    const scoped = f.match(/^emoji-components-([a-z-]+?)-\d/)?.[1];
    tarballs[scoped ? `@emoji-components/${scoped}` : "emoji-components"] = join(tmp, f);
  }
  mkdirSync(join(tmp, "data"));
  run("tar", ["-xzf", tarballs["@emoji-components/data"], "-C", join(tmp, "data")]);
  // The registry items from the packed package, with their packages pointing at the tarballs
  const items = join(tmp, "registry");
  mkdirSync(items);
  run("tar", ["-xzf", tarballs["emoji-components"], "-C", items, "--strip-components", "2", "package/r"]);
  for (const file of readdirSync(items)) {
    const item = JSON.parse(readFileSync(join(items, file), "utf8"));
    const ours = (item.dependencies ?? []).map((d) => d.replace(/@[^@/]+$/, "")).filter((d) => tarballs[d]);
    if (!ours.length) continue;
    item.dependencies = [...item.dependencies.filter((d) => !tarballs[d.replace(/@[^@/]+$/, "")]), ...new Set([...ours, "@emoji-components/core"])].map((d) => (tarballs[d] ? `${d}@file:${tarballs[d]}` : d));
    writeFileSync(join(items, file), JSON.stringify(item));
  }
  registry = await serve(items, `node -e 'require("node:http").createServer((q, s) => q.url === "/" ? s.end() : require("node:fs").readFile("." + q.url, (e, b) => (e ? ((s.statusCode = 404), s.end()) : s.end(b)))).listen(${PORT})'`, PORT);
}
const REGISTRY = /https:\/\/(?:cdn\.jsdelivr\.net\/npm\/emoji-components@[^/]+|emoji\.brianhung\.me)\/r\//g;
const local = (command) => (fromNpm ? command : command.replace(REGISTRY, `http://localhost:${PORT}/`).replace(/(?<![\w@/-])emoji-components(?![\w/@-])/, `${tarballs["emoji-components"]} ${tarballs["@emoji-components/core"]}`));

async function serve(cwd, command, port) {
  const child = spawn("sh", ["-c", `exec ${command}`], { cwd, env: { ...env, PORT: String(port) }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 240; i++) {
    if (child.exitCode !== null) throw new Error(`${command} exited:\n${log}`);
    if (
      await fetch(`http://localhost:${port}/`).then(
        (r) => r.ok,
        () => false,
      )
    )
      return () => process.kill(-child.pid);
    await new Promise((r) => setTimeout(r, 250));
  }
  process.kill(-child.pid);
  throw new Error(`${command} did not serve on ${port}:\n${log}`);
}

const logged = async (page, logs, n) => {
  for (let i = 0; i < 50 && logs.length <= n; i++) await page.waitForTimeout(100);
  if (logs.length <= n) throw new Error("onSelect logged nothing");
};

// The list's emoji cells: its loading and empty states are an unnamed role="option" too, as in React Aria's ListBox
const CELLS = '[role="listbox"] [role="option"][aria-label]';

const settled = async (page, locator) => {
  for (let last = -1, count = await locator.count(); ; last = count, count = await locator.count()) {
    if (count === last) return count;
    await page.waitForTimeout(250);
  }
};

const browser = await chromium.launch();
async function check(url, effect) {
  const page = await browser.newPage();
  const problems = [];
  const logs = [];
  if (!fromNpm)
    await page.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@emoji-components\/data@[^/]+\/(.+)$/, (route) => {
      routed.push(route.request().url());
      return route.fulfill({ path: join(tmp, "data/package", new URL(route.request().url()).pathname.replace(/^.*?\/data@[^/]+\//, "")) });
    });
  page.on("console", (m) => (m.type() === "error" ? problems.push(m.text()) : m.type() === "log" && logs.push(m.text())));
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("requestfailed", (r) => problems.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`${r.url()} ${r.status()}`));
  await page.goto(url);
  const options = page.locator(CELLS);
  await options
    .first()
    .waitFor({ timeout: 15000 })
    .catch((e) => {
      throw new Error(`${e.message}\n${problems.join("\n")}`);
    });
  const all = await settled(page, options);
  if (all > 1000) throw new Error(`${url}: ${all} cells rendered, so the list is not virtualized: the Viewport has no height`);
  await page.getByRole("searchbox").fill("smile");
  await page.waitForFunction(
    ([n, cells]) => {
      const count = document.querySelectorAll(cells).length;
      return count > 0 && count < n;
    },
    [all, CELLS],
  );
  const found = await options.count();
  const before = logs.length;
  const clicked = await options.first().getAttribute("aria-label");
  await options.first().click();
  if (effect) await logged(page, logs, before);
  const picked = logs.slice(before);
  const selected = effect ? null : await page.locator('[role="option"][aria-selected="true"], [role="option"][data-highlighted]').count();
  await page.reload();
  await options.first().waitFor();
  await settled(page, options);
  await page.getByRole("searchbox").focus();
  await page.keyboard.press("ArrowDown");
  const keyed = logs.length;
  await page.keyboard.press("Enter");
  if (effect) await logged(page, logs, keyed);
  await page.close();
  if (problems.length) throw new Error(`${url}: ${problems.join("\n")}`);
  return `${all} cells, "smile" → ${found}, click "${clicked}" → ${effect ? `console.log ${JSON.stringify(picked)}` : `no observable effect in the snippet; ${selected} highlighted`}, ArrowDown+Enter → ${effect ? `console.log ${JSON.stringify(logs.slice(keyed))}` : "picked"}`;
}

const results = [];
let port = PORT + 1;
try {
  for (const p of paths) {
    const dir = join(tmp, p.name);
    mkdirSync(dir);
    console.log(`\n> ${p.scaffold}`);
    sh(dir, p.scaffold);
    const app = join(dir, "app");
    for (const s of p.steps.slice(0, -1)) {
      if (typeof s !== "string") writeFileSync(join(app, s[0]), `${s[1]}\n`);
      else {
        console.log(`> ${local(s)}`);
        sh(app, local(s));
      }
    }
    const effect = /console\.log\(/.test(p.steps[1][1]);
    sh(app, "npm run build");
    const start = p.name === "next" ? `npx next start -p ${port}` : `npx vite preview --strictPort --port ${port}`;
    for (const [mode, command] of [["build", start], ...(p.dev ? [["dev", `npx vite --strictPort --port ${port + 1}`]] : [])]) {
      const at = mode === "dev" ? port + 1 : port;
      const stop = await serve(app, command, at);
      try {
        results.push(`${p.name} ${mode}: ${await check(`http://localhost:${at}/`, effect)}`);
        console.log(`\n${results.at(-1)}`);
      } finally {
        stop();
      }
    }
    port += 2;
  }
} finally {
  await browser.close();
  registry?.();
}
console.log(`\n${results.join("\n")}`);
if (!fromNpm) console.log(`routed ${routed.length} jsDelivr data requests to the packed data package: ${[...new Set(routed.map((u) => new URL(u).pathname))].join(", ")}`);
rmSync(tmp, { recursive: true, force: true });
console.log(`onboarding passed in ${Math.round(performance.now() / 1000)}s`);
