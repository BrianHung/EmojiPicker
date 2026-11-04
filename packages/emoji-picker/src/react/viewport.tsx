// Empty, Loading and LoadError: composed next to the List, rendered by it as its
// empty state (React Aria's renderEmptyState); on their own where there's no List.
import * as React from "react";
import { usePicker } from "./context";
import { useEmojiStore, useStoreSnapshot } from "./provider";
import { SLOTS } from "./slots";
import { signal, useSignal, type Signal } from "./context";

type Kind = "empty" | "loading" | "error";
type Slots = Partial<Record<Kind, React.ReactElement>>;
type EmptyState = { slots: Signal<Slots>; lists: Signal<number> };

export const EmptyStateContext = React.createContext<EmptyState | null>(null);

export function useEmptyStateSlots(): EmptyState {
  const [state] = React.useState(() => ({ slots: signal<Slots>({}), lists: signal(0) }));
  return state;
}

/** The List's empty state: whichever registered part applies now. */
export function useEmptyState(): React.ReactNode {
  const ctx = React.useContext(EmptyStateContext);
  const slots = useSignal(ctx?.slots ?? NO_SLOTS);
  const picker = usePicker();
  const status = useStoreSnapshot((s) => s.status());
  React.useLayoutEffect(() => {
    if (!ctx) return;
    ctx.lists.set(ctx.lists.get() + 1);
    return () => ctx.lists.set(ctx.lists.get() - 1);
  }, [ctx]);
  if (status === "error") return slots.error ?? null;
  if (status !== "ready") return slots.loading ?? null;
  if (picker.searching && !picker.pending && !picker.results.length) return slots.empty ?? null;
  return null;
}
const NO_SLOTS = signal<Slots>({});

/** Registers `element` as the List's empty state of this kind; renders it in place when there's no List. */
function useSlot(kind: Kind, element: React.ReactElement, visible: boolean): React.ReactElement | null {
  const ctx = React.useContext(EmptyStateContext);
  const lists = useSignal(ctx?.lists ?? NO_LISTS);
  React.useLayoutEffect(() => {
    if (!ctx) return;
    ctx.slots.set({ ...ctx.slots.get(), [kind]: element });
  });
  React.useLayoutEffect(
    () => () => {
      if (!ctx) return;
      const { [kind]: _, ...rest } = ctx.slots.get();
      ctx.slots.set(rest);
    },
    [ctx, kind],
  );
  return lists > 0 || !visible ? null : element;
}
const NO_LISTS = signal(0);

export type EmptyProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "role"> & {
  children?: React.ReactNode | ((state: { search: string }) => React.ReactNode);
};

/** Shown when a search finds nothing. */
export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(function Empty({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Empty");
  const element = (
    <div {...props} ref={ref} role="status" data-slot={SLOTS.empty}>
      {typeof children === "function" ? children({ search: picker.query }) : (children ?? picker.labels.noResults)}
    </div>
  );
  return useSlot("empty", element, picker.searching && !picker.pending && !picker.results.length);
});

export type LoadingProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role">;

/** Shown while the dataset loads. */
export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(function Loading({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Loading");
  const status = useStoreSnapshot((s) => s.status());
  const element = (
    <div {...props} ref={ref} role="status" data-slot={SLOTS.loading}>
      {children ?? picker.labels.loading}
    </div>
  );
  return useSlot("loading", element, status === "idle" || status === "loading");
});

export type LoadErrorProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "role"> & {
  children?: React.ReactNode | ((state: { error: Error; retry: () => void }) => React.ReactNode);
};

/** Shown when the dataset fails to load, with a retry. */
export const LoadError = React.forwardRef<HTMLDivElement, LoadErrorProps>(function LoadError({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.LoadError");
  const store = useEmojiStore();
  const status = useStoreSnapshot((s) => s.status());
  const retry = () => void store.load().catch(() => {});
  const error = store.error() ?? new Error(picker.labels.loadingError);
  const element = (
    <div {...props} ref={ref} role="alert" data-slot={SLOTS.loadError}>
      {typeof children === "function" ? (
        children({ error, retry })
      ) : (
        (children ?? (
          <>
            <p>{picker.labels.loadingError}</p>
            <button type="button" onClick={retry}>
              {picker.labels.retryLoading}
            </button>
          </>
        ))
      )}
    </div>
  );
  return useSlot("error", element, status === "error");
});
