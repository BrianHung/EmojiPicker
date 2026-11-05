import { readdirSync, readFileSync } from "node:fs";

const sources = readdirSync("dist/assets")
  .filter((f) => f.endsWith(".js.map"))
  .flatMap((f) => JSON.parse(readFileSync(`dist/assets/${f}`, "utf8")).sources);
const picker = sources.filter((s) => s.includes("@brianhung/emoji-picker/"));
const floating = sources.filter((s) => s.includes("@floating-ui"));
console.log(`${sources.length} modules, ${picker.length} from the picker, ${floating.length} from Floating UI`);
if (!picker.length || floating.length) process.exit(1);
