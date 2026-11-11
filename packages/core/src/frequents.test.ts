import { afterEach, describe, expect, it, vi } from "vitest";
import { createFrequencyStore } from "./frequents";

const DAY = 864e5;

describe("frequency store", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("ranks by count decayed over time, filling with defaults", () => {
    vi.useFakeTimers({ now: 0 });
    const store = createFrequencyStore();
    expect(store.top(2)).toEqual(["1f44d", "2764-fe0f"]);
    ["old", "old", "old"].forEach(store.pick);
    vi.setSystemTime(42 * DAY);
    store.pick("new");
    expect(store.top(3)).toEqual(["new", "old", "1f44d"]);
    expect(store.entries().old).toEqual({ count: 3, lastUsed: 0 });
  });

  it("returns stable snapshots per n until something changes", () => {
    const store = createFrequencyStore();
    const five = store.top(5);
    expect(store.top(5)).toBe(five);
    store.pick("1f525");
    expect(store.top(5)).not.toBe(five);
  });

  it("reports picks, removals and clears; controlled entries stay with their owner, and cancel() keeps them", () => {
    const onFrequentsChange = vi.fn();
    const frequents = { "1f525": { count: 2, lastUsed: Date.now() } };
    const store = createFrequencyStore({ frequents, onFrequentsChange });
    store.pick("1f44d");
    expect(onFrequentsChange).toHaveBeenLastCalledWith(expect.objectContaining({ "1f44d": expect.objectContaining({ count: 1 }) }), expect.objectContaining({ reason: "pick", emoji: "1f44d" }));
    store.remove("1f525");
    expect(onFrequentsChange).toHaveBeenLastCalledWith({}, expect.objectContaining({ reason: "remove", emoji: "1f525" }));
    store.clear();
    expect(onFrequentsChange).toHaveBeenLastCalledWith({}, expect.objectContaining({ reason: "clear" }));
    expect(store.entries()).toBe(frequents);
    const canceled = createFrequencyStore({ onFrequentsChange: (_, details) => details.cancel() });
    const before = canceled.entries();
    canceled.pick("1f44d");
    expect(canceled.entries()).toBe(before);
  });

  it("persists to localStorage, and a deferred store reads it on the first subscribe", () => {
    const items = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) } });
    createFrequencyStore().pick("1f525");
    expect(createFrequencyStore().top(1)).toEqual(["1f525"]);
    const deferred = createFrequencyStore({ deferStorage: true });
    expect(deferred.top(1)).toEqual(["1f44d"]);
    deferred.subscribe(() => {});
    expect(deferred.top(1)).toEqual(["1f525"]);
  });

  it("admits a newly picked emoji into a full frequents list", () => {
    const now = Date.now();
    const full = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`1f${(0x600 + i).toString(16)}`, { count: 3, lastUsed: now }]));
    const store = createFrequencyStore({ defaultFrequents: full });
    store.pick("1f44d");
    store.pick("1f44d");
    expect(Object.keys(store.entries())).toContain("1f44d");
  });
});
