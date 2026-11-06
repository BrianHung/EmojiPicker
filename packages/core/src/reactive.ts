export type Listener = () => void;
export type Subscribe = (listener: Listener) => () => void;

export interface Store<State, Action> {
  getSnapshot(): State;
  subscribe: Subscribe;
  dispatch(action: Action): void;
}

export function createStore<State, Action>(initial: State, reduce: (state: State, action: Action) => State): Store<State, Action> {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    dispatch(action) {
      const next = reduce(state, action);
      if (Object.is(next, state)) return;
      state = next;
      for (const listener of listeners) listener();
    },
  };
}

export const shallowEqual = <T extends object>(a: T, b: T, eq: (x: T[keyof T], y: T[keyof T]) => boolean = Object.is): boolean => {
  const keys = Object.keys(b) as (keyof T)[];
  return keys.length === Object.keys(a).length && keys.every((k) => eq(a[k], b[k]));
};

// The patch's fields merged in, or the same object when none of them changes
export const patch = <T extends object>(state: T, fields: Partial<T>): T => ((Object.keys(fields) as (keyof T)[]).every((k) => Object.is(state[k], fields[k])) ? state : { ...state, ...fields });

const sameArgs = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export function memo<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; value: R } | undefined;
  return (...args) => {
    if (!last || !sameArgs(last.args, args)) last = { args, value: fn(...args) };
    return last.value;
  };
}

// The previous object while every field is the same, so snapshots keep their identity
export function stable<T extends object>(): (next: T) => T {
  let last: T | undefined;
  return (next) => (last = last && shallowEqual(last, next) ? last : next);
}

type Cache<K, V> = { get(key: K): V | undefined; set(key: K, value: V): unknown };

export function cached<K, V>(cache: Cache<K, V>, key: K, create: () => V): V {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = create();
  cache.set(key, value);
  return value;
}

export const subscribeAll =
  (...subscribes: Subscribe[]): Subscribe =>
  (listener) => {
    const offs = subscribes.map((subscribe) => subscribe(listener));
    return () => {
      for (const off of offs) off();
    };
  };

export const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

const byUrl = new Map<string, Promise<unknown>>();

// One request per URL; a failure is forgotten so a retry fetches again
export function fetchJson<T>(url: string, label: string): Promise<T> {
  return cached(byUrl, url, () => {
    const pending = fetch(url, { priority: "low" }).then((response) => {
      if (!response.ok) throw new Error(`${label}: ${response.status} ${response.statusText}`);
      return response.json();
    });
    pending.catch(() => byUrl.delete(url));
    return pending;
  }) as Promise<T>;
}
