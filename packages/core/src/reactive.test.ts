import { describe, expect, it } from "vitest";
import { createStore, memo } from "./reactive";

describe("createStore", () => {
  it("notifies only when the reducer returns a new state", () => {
    const store = createStore({ n: 0 }, (state, by: number) => (by ? { n: state.n + by } : state));
    const seen: number[] = [];
    const off = store.subscribe(() => seen.push(store.getSnapshot().n));
    store.dispatch(2);
    store.dispatch(0);
    off();
    store.dispatch(1);
    expect(seen).toEqual([2]);
    expect(store.getSnapshot()).toEqual({ n: 3 });
  });

  it("memoizes on the last arguments", () => {
    const calls: number[] = [];
    const double = memo((n: number) => (calls.push(n), { n: n * 2 }));
    expect(double(2)).toBe(double(2));
    expect(double(3)).toEqual({ n: 6 });
    expect(calls).toEqual([2, 3]);
  });
});
