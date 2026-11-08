import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import data from "emojibase-data/en/data.json" with { type: "json" };
import pkg from "../package.json" with { type: "json" };

const root = fileURLToPath(new URL("..", import.meta.url));
const cache = path.join(root, ".cache");
const build = path.join(cache, "build");
const out = path.join(root, "dist");
const version = pkg.config.twemoji;
const svgs = path.join(cache, `twemoji-${version}`);
// nanoemoji's ninja rules don't quote the interpreter path
const venv = /\s/.test(cache) ? path.join(os.tmpdir(), "twemoji-font-venv") : path.join(cache, "venv");
const bin = path.join(venv, "bin");
const TARGET_BYTES = 200_000;

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });

async function fetchSvgs() {
  if (fs.existsSync(svgs)) return;
  const res = await fetch(`https://codeload.github.com/jdecked/twemoji/tar.gz/refs/tags/v${version}`);
  if (!res.ok) throw new Error(`twemoji v${version}: ${res.status}`);
  const tarball = path.join(cache, `twemoji-${version}.tgz`);
  fs.mkdirSync(svgs, { recursive: true });
  fs.writeFileSync(tarball, Buffer.from(await res.arrayBuffer()));
  run("tar", ["-xzf", tarball, "-C", svgs, "--strip-components=3", `twemoji-${version}/assets/svg`]);
  fs.rmSync(tarball);
}

// nanoemoji stretches a non-square viewBox to the advance; the image renderer letterboxes it
function squareViewBoxes() {
  for (const file of fs.readdirSync(svgs)) {
    const svg = fs.readFileSync(path.join(svgs, file), "utf8");
    const [x, y, w, h] =
      svg
        .match(/viewBox="([^"]+)"/)?.[1]
        ?.split(/[\s,]+/)
        .map(Number) ?? [];
    if (x === undefined || y === undefined || !w || !h || w === h) continue;
    const size = Math.max(w, h);
    fs.writeFileSync(path.join(svgs, file), svg.replace(/viewBox="[^"]+"/, `viewBox="${+(x - (size - w) / 2).toFixed(3)} ${+(y - (size - h) / 2).toFixed(3)} ${size} ${size}"`));
  }
}

function ensureVenv() {
  const requirements = fs.readFileSync(path.join(root, "requirements.txt"));
  const stamp = path.join(venv, ".requirements");
  const hash = createHash("sha256").update(requirements).digest("hex");
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === hash) return;
  fs.rmSync(venv, { recursive: true, force: true });
  run(process.env.PYTHON ?? "python3", ["-m", "venv", venv]);
  run(path.join(bin, "pip"), ["install", "--quiet", "--disable-pip-version-check", "-r", "requirements.txt"]);
  fs.writeFileSync(stamp, hash);
}

const config = `family = "Twemoji"
output_file = "Twemoji.ttf"
color_format = "glyf_colr_0"
upem = 1024
width = 1024
ascender = 832
descender = -192
version_major = ${version.split(".")[0]}
version_minor = ${version.split(".")[1]}

[axis.wght]
name = "Weight"
default = 400

[master.regular]
style_name = "Regular"

[master.regular.position]
wght = 400
`;

type Subset = { file: string; range: string; glyphs: number };

const python = path.join(bin, "python");
const orderFile = path.join(build, "order.json");
const ttf = path.join(out, "Twemoji.ttf");

await fetchSvgs();
squareViewBoxes();
ensureVenv();
fs.mkdirSync(build, { recursive: true });
const files = fs
  .readdirSync(svgs)
  .filter((f) => f.endsWith(".svg"))
  .sort()
  .map((f) => path.join(svgs, f));
const order = [...data].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)).map((e) => [e.group ?? null, [e.emoji, ...(e.skins ?? []).map((s) => s.emoji)]]);
fs.writeFileSync(orderFile, JSON.stringify(order));
const check = () => console.log(run(python, ["scripts/check.py", ttf, path.join(out, "twemoji-0.woff2"), orderFile, version, svgs]).trim());
if (process.argv.includes("--check")) {
  check();
  process.exit();
}

fs.writeFileSync(path.join(build, "twemoji.toml"), config);
run(path.join(bin, "nanoemoji"), ["--build_dir", build, path.join(build, "twemoji.toml"), ...files]);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
const subsets: Subset[] = JSON.parse(run(python, ["scripts/subset.py", path.join(build, "Twemoji.ttf"), orderFile, out, String(TARGET_BYTES), version]));

const face = ({ file, range }: Subset) => `@font-face {
  font-family: "Twemoji";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("./${file}") format("woff2");
  unicode-range: ${range};
}
`;
// browsers try overlapping faces last-declared first, so the first screen's subset goes last
fs.writeFileSync(path.join(out, "twemoji.css"), `/* Twemoji ${version} (https://github.com/jdecked/twemoji), © Twitter, Inc and other contributors, CC-BY 4.0 */\n${subsets.map(face).reverse().join("")}`);

const kb = (file: string) => (fs.statSync(path.join(out, file)).size / 1024).toFixed(1);
for (const s of subsets) console.log(`${s.file}  ${s.glyphs} glyphs  ${kb(s.file)} kB`);
const total = subsets.reduce((sum, s) => sum + fs.statSync(path.join(out, s.file)).size, 0);
console.log(`Twemoji ${version}: ${files.length} SVGs, ${subsets.length} subsets, ${(total / 1024).toFixed(1)} kB in ${path.relative(process.cwd(), out)}`);
console.log(`Twemoji.ttf  ${kb("Twemoji.ttf")} kB`);
check();
