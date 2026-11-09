import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { en } from "../test/en";
import type { Dataset } from "../src/dataset";

it("writes a localized dataset, with iamcal shortcodes before CLDR's", () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "emoji-data-")), "ja.json");
  execFileSync(process.execPath, ["--import", "tsx", path.join(__dirname, "cli.ts"), "build-data", "ja", "--out", out], { stdio: "pipe" });
  const ja = JSON.parse(fs.readFileSync(out, "utf8")) as Dataset;
  expect(ja).toMatchObject({ format: 1, locale: "ja", emojibase: en.emojibase });
  expect(ja.groups).toHaveLength(en.groups.length);
  expect(ja.groups[1]).toBe("動物と自然");
  expect(ja.emojis).toHaveLength(en.emojis.length);
  const thumbs = ja.emojis.find((e) => e[0] === "1f44d")!;
  expect(thumbs[1]).toBe("サムズアップ");
  expect(thumbs[3]).toEqual(["+1", "thumbsup", "samuzuappu"]);
  fs.rmSync(path.dirname(out), { recursive: true });
});
