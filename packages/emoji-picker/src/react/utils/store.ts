import { createStore, type Store } from "@brianhung/emoji-picker-core";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

type Source<S> = { subscribe(listener: () => void): () => void; getSnapshot(): S; getServerSnapshot?: () => S };

const identity = <T>(value: T) => value;

export function useStore<S>(store: Source<S>): S;
export function useStore<S, T>(store: Source<S>, select: (snapshot: S) => T, isEqual?: (a: T, b: T) => boolean): T;
export function useStore<S, T>(store: Source<S>, select: (snapshot: S) => T = identity as (snapshot: S) => T, isEqual?: (a: T, b: T) => boolean): T {
  return useSyncExternalStoreWithSelector(store.subscribe, store.getSnapshot, store.getServerSnapshot ?? store.getSnapshot, select, isEqual);
}

export const shallowEqual = <T extends object>(a: T, b: T) => {
  const keys = Object.keys(b) as (keyof T)[];
  return keys.length === Object.keys(a).length && keys.every((k) => Object.is(a[k], b[k]));
};

export type Cell<T> = Store<T, T>;

export const cell = <T>(initial: T): Cell<T> => createStore<T, T>(initial, (_, next) => next);
