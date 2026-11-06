import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

type Source<S> = { subscribe(listener: () => void): () => void; getSnapshot(): S; getServerSnapshot?: () => S };

const identity = <T>(value: T) => value;

export function useStore<S>(store: Source<S>): S;
export function useStore<S, T>(store: Source<S>, select: (snapshot: S) => T, isEqual?: (a: T, b: T) => boolean): T;
export function useStore<S, T>(store: Source<S>, select: (snapshot: S) => T = identity as (snapshot: S) => T, isEqual?: (a: T, b: T) => boolean): T {
  return useSyncExternalStoreWithSelector(store.subscribe, store.getSnapshot, store.getServerSnapshot ?? store.getSnapshot, select, isEqual);
}

export { shallowEqual } from "@brianhung/emoji-picker-core/internal";
