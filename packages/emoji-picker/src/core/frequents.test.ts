import { afterEach, describe, expect, it, vi } from "vitest";
import { createFrequencyStore, memoryStorage } from "./frequents";

describe("frequency store", () => {
  afterEach(() => vi.useRealTimers());

  it("ranks by decayed count, filling with defaults", () => {
    vi.useFakeTimers({ now: 0 });
    const store = createFrequencyStore({ storage: memoryStorage(), defaults: ["a", "b", "c"], halfLifeDays: 1 });
    expect(store.top(2)).toEqual(["a", "b"]);
    store.record("old");
    store.record("old");
    store.record("old");
    vi.setSystemTime(3 * 864e5);
    store.record("new");
    expect(store.top(3)).toEqual(["new", "old", "a"]);
  });

  it("returns stable snapshots per n until something changes", () => {
    const store = createFrequencyStore({ storage: memoryStorage() });
    const five = store.top(5);
    expect(store.top(16)).not.toBe(five);
    expect(store.top(5)).toBe(five);
    store.record("1f525");
    expect(store.top(5)).not.toBe(five);
  });

  it("persists through its storage", () => {
    const storage = memoryStorage();
    createFrequencyStore({ storage }).record("1f525");
    expect(createFrequencyStore({ storage }).top(1)).toEqual(["1f525"]);
  });
});
