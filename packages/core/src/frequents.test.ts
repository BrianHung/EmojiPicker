import { afterEach, describe, expect, it, vi } from "vitest";
import { createFrequencyStore, memoryStorageAdapter, mergeFrequents, type EmojiStorage } from "./frequents";

const DAY = 864e5;

describe("frequency store", () => {
  afterEach(() => vi.useRealTimers());

  it("ranks by count decayed over time, filling with defaults", () => {
    vi.useFakeTimers({ now: 0 });
    const store = createFrequencyStore({ storage: null });
    expect(store.top(2)).toEqual(["2764-fe0f", "1f44d"]);
    ["old", "old", "old"].forEach(store.record);
    vi.setSystemTime(42 * DAY);
    store.record("new");
    expect(store.top(3)).toEqual(["new", "old", "2764-fe0f"]);
    expect(store.entries().old).toEqual({ count: 3, lastUsed: 0 });
  });

  it("takes its half-life and size", () => {
    vi.useFakeTimers({ now: 0 });
    const store = createFrequencyStore({ storage: null, tuning: { halfLifeDays: 1, max: 2 } });
    ["old", "old", "old", "mid"].forEach(store.record);
    vi.setSystemTime(3 * DAY);
    store.record("new");
    expect(Object.keys(store.entries())).toEqual(["new", "old"]);
  });

  it("returns stable snapshots per n until something changes", () => {
    const store = createFrequencyStore({ storage: null });
    const five = store.top(5);
    expect(store.top(5)).toBe(five);
    store.record("1f525");
    expect(store.top(5)).not.toBe(five);
  });

  it("reports picks, removals and clears; controlled entries stay with their owner, and cancel() keeps them", () => {
    const onFrequentsChange = vi.fn();
    const frequents = { "1f525": { count: 2, lastUsed: Date.now() } };
    const store = createFrequencyStore({ frequents, onFrequentsChange, storage: null });
    store.record("1f44d");
    expect(onFrequentsChange).toHaveBeenLastCalledWith(expect.objectContaining({ "1f44d": expect.objectContaining({ count: 1 }) }), expect.objectContaining({ reason: "pick", emoji: "1f44d" }));
    store.remove("1f525");
    expect(onFrequentsChange).toHaveBeenLastCalledWith({}, expect.objectContaining({ reason: "remove", emoji: "1f525" }));
    store.clear();
    expect(onFrequentsChange).toHaveBeenLastCalledWith({}, expect.objectContaining({ reason: "clear" }));
    expect(store.entries()).toBe(frequents);
    const canceled = createFrequencyStore({ onFrequentsChange: (_, details) => details.cancel(), storage: null });
    canceled.record("1f44d");
    expect(canceled.entries()).toEqual({});
  });

  it("persists through its storage and picks up writes from elsewhere while subscribed", () => {
    const memory = memoryStorageAdapter();
    const listeners = new Set<() => void>();
    const storage: EmojiStorage = { ...memory, subscribe: (l) => (listeners.add(l), () => listeners.delete(l)) };
    createFrequencyStore({ storage }).record("1f525");
    const store = createFrequencyStore({ storage });
    expect(store.top(1)).toEqual(["1f525"]);
    const off = store.subscribe(() => {});
    memory.write(JSON.stringify({ "1f680": { count: 5, lastUsed: Date.now() } }));
    listeners.forEach((l) => l());
    expect(store.top(1)).toEqual(["1f680"]);
    off();
    expect(listeners.size).toBe(0);
  });

  it("merges entries, decaying both to the later use", () => {
    expect(mergeFrequents({ a: { count: 2, lastUsed: 0 } }, { a: { count: 1, lastUsed: 14 * DAY }, b: { count: 1, lastUsed: 0 } })).toEqual({ a: { count: 2, lastUsed: 14 * DAY }, b: { count: 1, lastUsed: 0 } });
  });
});
