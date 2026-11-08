import { execFileSync } from "node:child_process";

const python = process.env.PYTHON ?? "python3";
let version = "";
try {
  version = execFileSync(python, ["-c", "import sys; print('%d.%d' % sys.version_info[:2])"], { encoding: "utf8" }).trim();
} catch {}
const [major, minor] = version.split(".").map(Number);
if (!(major > 3 || (major === 3 && minor >= 12))) {
  console.log(`Skipped the Twemoji font build and publint: it needs Python 3.12 or later, and ${python} is ${version || "missing"}. Set PYTHON to a Python 3.12 interpreter to run it.`);
  process.exit(0);
}
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
run("npm", ["run", "build:font"]);
run("npx", ["publint", "packages/twemoji-font"]);
