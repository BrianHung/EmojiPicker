// Empty, Loading and LoadError: composed next to the List, rendered by it as its
// empty state (React Aria's renderEmptyState); on their own where there's no List.
import * as React from "react";
import { usePicker } from "./context";
import { useEmojiStore, useStoreSnapshot } from "../provider/provider";
import { renderElement, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { signal, useSignal, type Signal } from "./context";

type Kind = "empty" | "loading" | "error";
type Slots = Partial<Record<Kind, React.ReactElement>>;
type Registry = { slots: Signal<Slots>; lists: Signal<number> };

export const EmptyStateContext = React.createContext<Registry | null>(null);

export function useEmptyStateSlots(): Registry {
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

export type EmptyState = { search: string };
export type EmptyProps = PartElementProps<EmptyState, HTMLDivElement, "role">;

/** Shown when a search finds nothing. */
export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(function Empty({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Empty");
  const element = renderElement("div", { ...props, ref, role: "status", "data-slot": SLOTS.empty, children: children ?? picker.labels.noResults }, { search: picker.query });
  return useSlot("empty", element, picker.searching && !picker.pending && !picker.results.length);
});

export type LoadingProps = PartElementProps<object, HTMLDivElement, "role">;

/** Shown while the dataset loads. */
export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(function Loading({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Loading");
  const status = useStoreSnapshot((s) => s.status());
  const element = renderElement("div", { ...props, ref, role: "status", "data-slot": SLOTS.loading, children: children ?? picker.labels.loading }, {});
  return useSlot("loading", element, status === "idle" || status === "loading");
});

export type LoadErrorState = { error: Error; retry: () => void };
export type LoadErrorProps = PartElementProps<LoadErrorState, HTMLDivElement, "role">;

/** Shown when the dataset fails to load, with a retry. */
export const LoadError = React.forwardRef<HTMLDivElement, LoadErrorProps>(function LoadError({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.LoadError");
  const store = useEmojiStore();
  const status = useStoreSnapshot((s) => s.status());
  const retry = () => void store.load().catch(() => {});
  const error = store.error() ?? new Error(picker.labels.loadingError);
  const fallback = (
    <>
      <p>{picker.labels.loadingError}</p>
      <button type="button" onClick={retry}>
        {picker.labels.retryLoading}
      </button>
    </>
  );
  const element = renderElement("div", { ...props, ref, role: "alert", "data-slot": SLOTS.loadError, children: children ?? fallback }, { error, retry });

  return useSlot("error", element, status === "error");
});
