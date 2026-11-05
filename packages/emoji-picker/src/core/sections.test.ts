import { describe, expect, it } from "vitest";
import data from "../../data/en.json";
import { expandDataset, type Dataset } from "./dataset";
import { defaultLabels } from "./labels";
import { categorySections, itemFactory, resultSections } from "./sections";

describe("sections", () => {
  const records = expandDataset(data as unknown as Dataset);
  const get = (u: string) => records.find((r) => r.unified === u || r.tones.includes(u));
  const categories = [
    { id: "suggested", name: "Frequently Used", nav: true },
    { id: "flags", name: "Flags", nav: true },
    { id: "smileys_people", name: "Smileys & People", nav: true },
  ];
  const item = itemFactory(defaultLabels);

  it("follows the picker's category order, with frequents first", () => {
    const out = categorySections({ categories, records, suggested: ["1f44d-1f3fd", "nope"], customGroup: () => undefined, collapsed: () => false, get, withSkinTone: (u) => u, item });
    expect(out.map((s) => s.id)).toEqual(["suggested", "flags", "smileys_people"]);
    expect(out[0]!.items.map((i) => i.unified)).toEqual(["1f44d-1f3fd"]);
    expect(out[0]!.items[0]!.record.unified).toBe("1f44d");
    expect(out[1]!.items.every((i) => i.record.group === "flags")).toBe(true);
  });

  it("skips empty sections, keeps a collapsed one's title, applies the skin tone and the version cap", () => {
    const out = categorySections({
      categories,
      records,
      suggested: [],
      customGroup: () => undefined,
      collapsed: (id) => id === "flags",
      emojiVersion: 12,
      get,
      withSkinTone: (u) => get(u)?.tones[2] ?? u,
      item,
    });
    expect(out.map((s) => [s.id, s.collapsed, s.items.length > 0])).toEqual([
      ["flags", true, false],
      ["smileys_people", false, true],
    ]);
    const items = out[1]!.items;
    expect(items.every((i) => i.record.version <= 12)).toBe(true);
    expect(items.find((i) => i.record.unified === "1f44b")!.unified).toBe("1f44b-1f3fd");
  });

  it("puts custom emoji in their group's section", () => {
    const custom = [
      { ...records[0]!, unified: "parrot", group: "custom" as const, imageUrl: "p.gif", version: 0 },
      { ...records[0]!, unified: "shipit", group: "custom" as const, imageUrl: "s.png", version: 0 },
    ];
    const out = categorySections({
      categories: [
        { id: "custom", name: "Custom", nav: true },
        { id: "custom:team", name: "Team", nav: true },
      ],
      records: [...records, ...custom],
      suggested: [],
      customGroup: (u) => (u === "shipit" ? "team" : undefined),
      collapsed: () => false,
      emojiVersion: 1,
      get,
      withSkinTone: (u) => `${u}!`,
      item,
    });
    expect(out.map((s) => [s.id, s.items.map((i) => i.unified)])).toEqual([
      ["custom", ["parrot"]],
      ["custom:team", ["shipit"]],
    ]);
  });

  it("lays out results as one section, or one per category", () => {
    const hits = ["1f1fa-1f1f8", "1f600", "1f1ef-1f1f5"].map((u) => get(u)!);
    const ranked = resultSections(
      hits,
      "ranked",
      (g) => g,
      (u) => u,
      item,
      "Results",
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.header).toBe(false);
    expect(ranked[0]!.items.map((i) => i.record)).toEqual(hits);
    const grouped = resultSections(
      hits,
      "grouped",
      (g) => g.toUpperCase(),
      (u) => u,
      item,
      "Results",
    );
    expect(grouped.map((s) => [s.name, s.category, s.items.map((i) => hits.indexOf(i.record))])).toEqual([
      ["SMILEYS_PEOPLE", "smileys_people", [1]],
      ["FLAGS", "flags", [0, 2]],
    ]);
    expect(
      resultSections(
        hits,
        "ranked",
        (g) => g,
        (u) => u,
        item,
        "Results",
      )[0]!.items[0],
    ).toBe(ranked[0]!.items[0]);
  });
});
