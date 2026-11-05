import * as React from "react";
import { usePicker } from "./context";
import { useEmojiStore, useStoreSnapshot } from "../provider/provider";
import { renderElement, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { cell, useStore, type Cell } from "../utils/store";

type Kind = "empty" | "loading" | "error";
type Slots = Partial<Record<Kind, React.ReactElement>>;
type Registry = { slots: Cell<Slots>; lists: Cell<number> };

export const EmptyStateContext = React.createContext<Registry | null>(null);

export function useEmptyStateSlots(): Registry {
  const [state] = React.useState(() => ({ slots: cell<Slots>({}), lists: cell(0) }));
  return state;
}

export function useEmptyState(): React.ReactNode {
  const ctx = React.useContext(EmptyStateContext);
  const slots = useStore(ctx?.slots ?? NO_SLOTS);
  const picker = usePicker();
  const status = useStoreSnapshot((s) => s.status());
  React.useLayoutEffect(() => {
    if (!ctx) return;
    ctx.lists.dispatch(ctx.lists.getSnapshot() + 1);
    return () => ctx.lists.dispatch(ctx.lists.getSnapshot() - 1);
  }, [ctx]);
  if (status === "error") return slots.error ?? null;
  if (status !== "ready") return slots.loading ?? null;
  if (picker.searching && !picker.pending && !picker.results.length) return slots.empty ?? null;
  return null;
}
const NO_SLOTS = cell<Slots>({});

function useSlot(kind: Kind, element: React.ReactElement, visible: boolean): React.ReactElement | null {
  const ctx = React.useContext(EmptyStateContext);
  const lists = useStore(ctx?.lists ?? NO_LISTS);
  React.useLayoutEffect(() => {
    if (!ctx) return;
    ctx.slots.dispatch({ ...ctx.slots.getSnapshot(), [kind]: element });
  });
  React.useLayoutEffect(
    () => () => {
      if (!ctx) return;
      const { [kind]: _, ...rest } = ctx.slots.getSnapshot();
      ctx.slots.dispatch(rest);
    },
    [ctx, kind],
  );
  return lists > 0 || !visible ? null : element;
}
const NO_LISTS = cell(0);

export type EmptyState = { search: string };
export type EmptyProps = PartElementProps<EmptyState, HTMLDivElement, "role">;

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(function Empty({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Empty");
  const element = renderElement("div", { ...props, ref, role: "status", "data-slot": SLOTS.empty, children: children ?? picker.labels.noResults }, { search: picker.query });
  return useSlot("empty", element, picker.searching && !picker.pending && !picker.results.length);
});

export type LoadingProps = PartElementProps<object, HTMLDivElement, "role">;

export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(function Loading({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Loading");
  const status = useStoreSnapshot((s) => s.status());
  const element = renderElement("div", { ...props, ref, role: "status", "data-slot": SLOTS.loading, children: children ?? picker.labels.loading }, {});
  return useSlot("loading", element, status === "idle" || status === "loading");
});

export type LoadErrorState = { error: Error; retry: () => void };
export type LoadErrorProps = PartElementProps<LoadErrorState, HTMLDivElement, "role">;

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
