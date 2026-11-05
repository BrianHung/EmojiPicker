export function memo<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; value: R } | null = null;
  return (...args) => {
    if (last && args.every((a, i) => Object.is(a, last!.args[i]))) return last.value;
    return (last = { args, value: fn(...args) }).value;
  };
}

export function same<T extends object>(prev: T | null, next: T): T {
  return prev && (Object.keys(next) as (keyof T)[]).every((k) => Object.is(prev[k], next[k])) ? prev : next;
}

export function emitter(connect: (emit: () => void) => () => void) {
  const listeners = new Set<() => void>();
  let disconnect: (() => void) | null = null;
  const emit = () => listeners.forEach((l) => l());
  return {
    emit,
    subscribe(listener: () => void) {
      if (!listeners.size) disconnect = connect(emit);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) disconnect?.();
      };
    },
  };
}
