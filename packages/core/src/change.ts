export interface ChangeDetails<Reason extends string = string> {
  reason: Reason;
  event: Event;
  trigger: Element | undefined;
  cancel(): void;
  readonly isCanceled: boolean;
  allowPropagation(): void;
  readonly isPropagationAllowed: boolean;
}

export function createChangeDetails<Reason extends string>(reason: Reason, event?: Event, trigger?: Element): ChangeDetails<Reason> {
  let canceled = false;
  let propagates = false;
  return {
    reason,
    event: event ?? new Event("emoji-components"),
    trigger,
    cancel: () => void (canceled = true),
    get isCanceled() {
      return canceled;
    },
    allowPropagation: () => void (propagates = true),
    get isPropagationAllowed() {
      return propagates;
    },
  };
}

export interface Controllable<T, D extends ChangeDetails> {
  value(): T;
  set(next: T, details: D): D | undefined;
}

export interface ControllableOptions<T, D extends ChangeDetails> {
  controlled(): T | undefined;
  own(): T;
  onChange(): ((value: T, details: D) => void) | undefined;
  write(value: T): void;
  // A controlled value can keep a local copy until its owner answers
  writeControlled?(value: T): void;
}

// Controlled or own state with Base UI's onChange(value, details): the owner hears first and can cancel()
export function controllable<T, D extends ChangeDetails>({ controlled, own, onChange, write, writeControlled }: ControllableOptions<T, D>): Controllable<T, D> {
  const value = () => {
    const outer = controlled();
    return outer === undefined ? own() : outer;
  };
  return {
    value,
    set(next, details) {
      if (Object.is(next, value())) return undefined;
      onChange()?.(next, details);
      if (details.isCanceled) return details;
      if (controlled() === undefined) write(next);
      else writeControlled?.(next);
      return details;
    },
  };
}
