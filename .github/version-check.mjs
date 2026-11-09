import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const packages = ["core", "data", "react", "twemoji-font"];
const tmp = mkdtempSync(join(tmpdir(), "emoji-picker-version-"));
const json = (file) => JSON.parse(readFileSync(join(tmp, file), "utf8"));
const git = (...args) => execFileSync("git", ["-c", "user.name=ci", "-c", "user.email=ci@localhost", "-c", "commit.gpgsign=false", ...args], { cwd: tmp, stdio: "ignore" });
const changeset = (...args) => execFileSync(join(root, "node_modules/.bin/changeset"), args, { cwd: tmp, stdio: ["ignore", "ignore", "inherit"] });

// The check below holds only while every package versions together; packages pin each other exactly, and changeset version keeps an exact range exact
const FIXED = ["emoji-components", "@emoji-components/*"];
const ours = (dep) => dep === "emoji-components" || dep.startsWith("@emoji-components/");
if (!JSON.parse(readFileSync(join(root, ".changeset/config.json"), "utf8")).fixed.some((group) => FIXED.every((name) => group.includes(name)))) throw new Error(`.changeset/config.json must set "fixed": [${JSON.stringify(FIXED)}]`);

try {
  cpSync(root, tmp, { recursive: true, filter: (src) => !/[/\\](node_modules|\.git|dist|\.claude|\.cache)$/.test(src) });
  symlinkSync(join(root, "node_modules"), join(tmp, "node_modules"));
  // status diffs against the base branch, which a shallow CI checkout lacks
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "--no-verify", "-m", "base");
  changeset("status", "--output", "status.json");
  const pending = json("status.json")
    .releases.map((r) => r.newVersion)
    .filter(Boolean);
  // Right after `changeset version` nothing is pending; the packages must already share one alpha
  const [version, ...others] = new Set(pending.length ? pending : packages.map((name) => json(`packages/${name}/package.json`).version));
  if (others.length || !/-alpha\.\d+$/.test(version)) throw new Error(`expected one alpha, got ${[version, ...others]}`);
  if (pending.length) changeset("version");
  for (const name of packages) {
    const pkg = json(`packages/${name}/package.json`);
    if (pkg.version !== version) throw new Error(`${pkg.name} is ${pkg.version}, expected ${version}`);
    for (const [dep, range] of Object.entries({ ...pkg.dependencies, ...pkg.peerDependencies })) if (ours(dep) && range !== version) throw new Error(`${pkg.name} depends on ${dep}@${range}, expected exactly ${version}`);
  }
  execFileSync(join(root, "node_modules/.bin/tsup"), ["--silent"], { cwd: join(tmp, "packages/core"), stdio: "inherit" });
  const { DEFAULT_DATA_URL } = await import(pathToFileURL(join(tmp, "packages/core/dist/platform.js")).href);
  if (!DEFAULT_DATA_URL.includes(`/@emoji-components/data@${version}/data/en/iamcal.json`)) throw new Error(`core build loads ${DEFAULT_DATA_URL}, expected ${version}`);
  console.log(`changeset version: all packages at ${version}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
