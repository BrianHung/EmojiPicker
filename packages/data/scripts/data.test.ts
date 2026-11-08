import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createEmojiStore, type Dataset } from "@brianhung/emoji-picker-core";
import type { Dataset as Published } from "../dataset.cjs";

const root = fileURLToPath(new URL("../data/", import.meta.url));
const files = fs.existsSync(root) ? fs.readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".json")) : [];

describe("datasets", () => {
  it("are typed as core's Dataset", () => {
    expectTypeOf<Published>().toEqualTypeOf<Dataset>();
  });

  it("cover every locale with iamcal and cldr shortcodes", () => {
    const locales = new Set(files.map((f) => path.dirname(f)));
    expect(locales.size).toBeGreaterThan(25);
    for (const locale of locales) for (const set of ["iamcal", "cldr"]) expect(files).toContain(path.join(locale, `${set}.json`));
  });

  it.each(files)("%s loads", (file) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8")) as Dataset;
    expect(data).toMatchObject({ format: 1, locale: path.dirname(file) });
    expect(data.groups).toHaveLength(8);
    expect(data.emojis.some((e) => e[3].length > 0)).toBe(true);
    const store = createEmojiStore({ data });
    expect(store.status()).toBe("ready");
    expect(store.records().length).toBeGreaterThan(1800);
  });
});
