import { execSync } from "node:child_process";

const output = execSync(`npm run build -w ${process.argv[2]} 2>&1`, { encoding: "utf8" });
process.stdout.write(output);
if (/still references private shared type exports/.test(output)) throw new Error("a public declaration names a type no entry exports (TS2742 for consumers); export it type-only from that entry");
