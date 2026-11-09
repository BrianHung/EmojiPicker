import { afterEach, describe, expect, it, vi } from "vitest";
import { createStore, fetchJson, memo } from "./reactive";

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

describe("fetchJson", () => {
  afterEach(() => void vi.unstubAllGlobals());

  it("aborts with the caller's signal, and a caller that shared the request fetches again", async () => {
    const fetch = vi.fn((_: string, { signal }: RequestInit) =>
      signal?.aborted
        ? Promise.reject(new DOMException("aborted", "AbortError"))
        : new Promise<Response>((resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
            setTimeout(() => resolve(Response.json({ ok: 1 })));
          }),
    );
    vi.stubGlobal("fetch", fetch);
    const first = new AbortController();
    const aborted = fetchJson("/data.json", "data", first.signal);
    const shared = fetchJson("/data.json", "data", new AbortController().signal);
    first.abort();
    await expect(aborted).rejects.toThrow("aborted");
    await expect(shared).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);
    await fetchJson("/data.json", "data");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
