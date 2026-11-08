import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The site serves public/r; emoji-components ships r/ for jsDelivr. Both pin this release of the packages,
// and the package's items depend on each other at this release on jsDelivr.
const demo = fileURLToPath(new URL("..", import.meta.url));
const root = join(demo, "../..");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const versions = Object.fromEntries(["core", "data", "react", "twemoji-font"].map((dir) => json(join(root, "packages", dir, "package.json"))).map((p) => [p.name, p.version]));
const SITE = "https://emoji.brianhung.me/r/";

const OUTPUTS = {
  [join(demo, "public/r")]: SITE,
  [join(root, "packages/react/r")]: `https://cdn.jsdelivr.net/npm/emoji-components@${versions["emoji-components"]}/r/`,
};

const tmp = mkdtempSync(join(tmpdir(), "emoji-registry-"));
try {
  execFileSync(join(root, "node_modules/.bin/shadcn"), ["build", "registry.json", "--output", tmp], { cwd: demo, stdio: "inherit" });
  for (const [out, base] of Object.entries(OUTPUTS)) {
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const item = (i) => ({
      ...i,
      ...(i.dependencies && {
        dependencies: i.dependencies.map((dep) => {
          if (!(dep in versions)) {
            if (/^(emoji-components|@emoji-components\/)/.test(dep)) throw new Error(`registry.json: list ${dep} without a version`);
            return dep;
          }
          return `${dep}@${versions[dep]}`;
        }),
      }),
      ...(i.registryDependencies && { registryDependencies: i.registryDependencies.map((dep) => dep.replace(SITE, base)) }),
    });
    for (const file of readdirSync(tmp)) {
      const data = json(join(tmp, file));
      writeFileSync(join(out, file), JSON.stringify(file === "registry.json" ? { ...data, items: data.items.map(item) } : item(data), null, 2));
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
