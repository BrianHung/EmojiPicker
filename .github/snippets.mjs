import { execSync } from "node:child_process";
import { globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Code blocks that are whole files, compiled with the demo's tsconfig so `@/components/ui/*` resolves to the registry
const DIR = "apps/demo/.snippets";
const sources = globSync(["README.md", "packages/*/README.md", "apps/demo/src/pages/**/page.mdx"]);

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR);
const files = [];
for (const source of sources) {
  const text = readFileSync(source, "utf8");
  for (const block of text.matchAll(/^```(tsx?)(.*)\n([\s\S]*?)^```$/gm)) {
    const [, lang, meta, code] = block;
    if (meta.includes("excerpt") || !/^(import|export) /m.test(code)) continue;
    const line = text.slice(0, block.index).split("\n").length;
    const file = `${source.replaceAll("/", "_")}_${line}.${lang}`;
    writeFileSync(`${DIR}/${file}`, code);
    files.push(file);
  }
}
writeFileSync(`${DIR}/tsconfig.json`, JSON.stringify({ extends: "../tsconfig.json", files }));
console.log(`${files.length} snippets from ${sources.length} files`);
try {
  execSync(`npx tsc -p ${DIR}`, { stdio: "inherit" });
} catch {
  process.exitCode = 1;
}
rmSync(DIR, { recursive: true, force: true });
