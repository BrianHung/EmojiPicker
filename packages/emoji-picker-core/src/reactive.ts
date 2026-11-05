export type Store<State, Action> = {
  getSnapshot(): State;
  subscribe(listener: () => void): () => void;
  dispatch(action: Action): void;
};

export function createStore<State, Action>(initial: State, reduce: (state: State, action: Action) => State): Store<State, Action> {
  let state = initial;
  const listeners = new Set<() => void>();
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
      listeners.forEach((listener) => listener());
    },
  };
}

const sameArgs = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
const sameFields = <T extends object>(a: T, b: T) => (Object.keys(b) as (keyof T)[]).every((k) => Object.is(a[k], b[k]));

export function memo<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const last = createStore<{ args: A; value: R } | null, A>(null, (prev, args) => (prev && sameArgs(prev.args, args) ? prev : { args, value: fn(...args) }));
  return (...args) => {
    last.dispatch(args);
    return last.getSnapshot()!.value;
  };
}

export function stable<T extends object>(): (next: T) => T {
  const last = createStore<T | null, T>(null, (prev, next) => (prev && sameFields(prev, next) ? prev : next));
  return (next) => {
    last.dispatch(next);
    return last.getSnapshot()!;
  };
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
  (...subscribes: ((listener: () => void) => () => void)[]) =>
  (listener: () => void) => {
    const offs = subscribes.map((subscribe) => subscribe(listener));
    return () => offs.forEach((off) => off());
  };
