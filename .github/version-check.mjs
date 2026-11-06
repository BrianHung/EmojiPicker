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

try {
  cpSync(root, tmp, { recursive: true, filter: (src) => !/[/\\](node_modules|\.git|dist|\.claude|\.cache)$/.test(src) });
  symlinkSync(join(root, "node_modules"), join(tmp, "node_modules"));
  // status diffs against the base branch, which a shallow CI checkout lacks
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "--no-verify", "-m", "base");
  changeset("status", "--output", "status.json");
  const [version, ...others] = new Set(
    json("status.json")
      .releases.map((r) => r.newVersion)
      .filter(Boolean),
  );
  if (others.length || !/-alpha\.\d+$/.test(version)) throw new Error(`expected one next alpha, got ${[version, ...others]}`);
  changeset("version");
  for (const name of packages) {
    const pkg = json(`packages/${name}/package.json`);
    if (pkg.version !== version) throw new Error(`${pkg.name} is ${pkg.version}, expected ${version}`);
    for (const [dep, range] of Object.entries({ ...pkg.dependencies, ...pkg.peerDependencies })) if (dep.startsWith("@brianhung/") && range !== `^${version}`) throw new Error(`${pkg.name} depends on ${dep}@${range}, expected ^${version}`);
  }
  execFileSync(join(root, "node_modules/.bin/tsup"), ["--silent"], { cwd: join(tmp, "packages/core"), stdio: "inherit" });
  const { DEFAULT_DATA_URL } = await import(pathToFileURL(join(tmp, "packages/core/dist/platform.js")).href);
  if (!DEFAULT_DATA_URL.includes(`/emoji-picker-core@${version}/`)) throw new Error(`core build loads ${DEFAULT_DATA_URL}, expected ${version}`);
  console.log(`changeset version: all packages at ${version}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
