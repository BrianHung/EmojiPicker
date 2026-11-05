export type ChangeDetails<Reason extends string = string> = {
  reason: Reason;
  event?: Event;
  cancel(): void;
  readonly isCanceled: boolean;
};

export function createChangeDetails<Reason extends string>(reason: Reason, event?: Event): ChangeDetails<Reason> {
  let canceled = false;
  return {
    reason,
    event,
    cancel: () => void (canceled = true),
    get isCanceled() {
      return canceled;
    },
  };
}
