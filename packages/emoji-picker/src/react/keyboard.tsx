// Internal: one keyboard dispatcher per picker, at Root, in React's capture phase
// (before React Aria's handlers on the parts). For every keydown inside the picker:
//   1. user `onKeyDown` handlers on the parts (innermost first, as bubbling would);
//      any can call `event.preventEmojiPickerHandler()` to stop here,
//   2. Shift+Space opens the skin-tone variations of the emoji the key is on, if it has them,
//   3. the key's action (from the keymap) goes to the innermost region that takes it
//      (skin tone, search field, list, reactions),
//   4. picker-wide actions: close (clear the query, end the highlight, close the
//      popover), focus-search, toggle-skin-tone,
//   5. a navigation key left over (unbound by the keymap) is kept from React Aria.
// A key the picker handles, or keeps from React Aria, stops at Root, as React Aria's
// own handled keys do, so an Escape it used doesn't also close a dialog around it.
import * as React from "react";
import { actionFor, isTextEditingKey, resolveKeymap, type KeyboardAction, type Keymap } from "./keymap";

/** A picker part's keydown event. Its handler runs before the picker's own. */
export type PickerKeyboardEvent<T extends Element = Element> = React.KeyboardEvent<T> & {
  /** Skip the picker's handling of this key (and React Aria's). Like Base UI's `preventBaseUIHandler`. */
  preventEmojiPickerHandler: () => void;
  /** Whether a handler called `preventEmojiPickerHandler()`. */
  readonly emojiPickerHandlerPrevented: boolean;
};
export type PickerKeyboardEventHandler<T extends Element = Element> = (event: PickerKeyboardEvent<T>) => void;

/** What a region did with a key. "pass" lets an outer region try; "native" leaves it to the browser alone (a caret move). */
export type RegionResult = "handled" | "pass" | "native";
/** A region's action handler. `action` is null for keys with no binding. */
export type RegionHandler = (action: KeyboardAction | null, event: PickerKeyboardEvent) => RegionResult;

type Registry<T> = Map<Element, React.MutableRefObject<T | undefined>>;

type KeyboardContextValue = {
  keymap: Keymap;
  handlers: Registry<PickerKeyboardEventHandler>;
  regions: Registry<RegionHandler>;
  skinTone: React.MutableRefObject<(() => void) | null>;
};

const KeyboardContext = React.createContext<KeyboardContextValue | null>(null);
export const useKeymap = () => React.useContext(KeyboardContext)?.keymap ?? resolveKeymap();

/** Keeps the latest value in a ref, registered under the element the returned ref callback receives. */
function useRegistered<T>(registry: Registry<T> | null, value: T | undefined): React.RefCallback<Element> {
  const ref = React.useRef(value);
  ref.current = value;
  const element = React.useRef<Element | null>(null);
  return React.useCallback(
    (el: Element | null) => {
      if (element.current && registry?.get(element.current) === ref) registry.delete(element.current);
      element.current = el;
      if (el && registry) registry.set(el, ref);
    },
    [registry],
  );
}

/** Registers a part's user `onKeyDown` (not spread on the DOM), so the Root dispatcher calls it first. Attach the returned ref. */
export function useUserKeyDown(handler: PickerKeyboardEventHandler | undefined): React.RefCallback<Element> {
  return useRegistered(React.useContext(KeyboardContext)?.handlers ?? null, handler);
}

/** Registers a region: the element whose descendants' keys `handler` interprets. */
export function useKeyRegion(handler: RegionHandler): React.RefCallback<Element> {
  return useRegistered(React.useContext(KeyboardContext)?.regions ?? null, handler);
}

/** Lets SkinTone take the "toggle-skin-tone" action. */
export function useSkinToneToggle(toggle: () => void) {
  const ctx = React.useContext(KeyboardContext);
  const latest = React.useRef(toggle);
  latest.current = toggle;
  React.useEffect(() => {
    if (!ctx) return;
    const fn = () => latest.current();
    ctx.skinTone.current = fn;
    return () => {
      if (ctx.skinTone.current === fn) ctx.skinTone.current = null;
    };
  }, [ctx]);
}

/** Merges refs into one callback. */
export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(value);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

export function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "reset"].includes(el.type));
}

function augment(event: React.KeyboardEvent): PickerKeyboardEvent {
  let prevented = false;
  const e = event as PickerKeyboardEvent;
  e.preventEmojiPickerHandler = () => void (prevented = true);
  Object.defineProperty(e, "emojiPickerHandlerPrevented", { configurable: true, get: () => prevented });
  return e;
}

/** Calls `fn` with `event.currentTarget` set to `el`, as React does per listener. */
export function withCurrentTarget(event: React.SyntheticEvent, el: Element, fn: () => void) {
  const e = event as unknown as { currentTarget: EventTarget | null };
  const previous = e.currentTarget;
  e.currentTarget = el;
  try {
    fn();
  } finally {
    e.currentTarget = previous;
  }
}

function ancestors(from: Element, root: Element): Element[] {
  const out: Element[] = [];
  for (let el: Element | null = from; el; el = el.parentElement) {
    out.push(el);
    if (el === root) break;
  }
  return out;
}

/**
 * Keys React Aria's collections, tabs and fields act on by themselves. Not Escape: with nothing
 * to clear or close it goes on to the page (a sheet or dialog around the picker closes).
 */
const NATIVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Enter", " "]);

export type KeyboardProviderProps = {
  keymap?: Partial<Record<KeyboardAction, readonly string[]>>;
  /** Root's own onKeyDown: runs after the parts' handlers, before the picker's. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  /** Picker-wide Escape: clear the query or the highlight, else close the popover. True when it did something. */
  close: () => boolean;
  focusSearch: () => boolean;
  /** Shift+Space: the skin-tone variations of the emoji at `target` (a cell, or the field's highlight). True when they open. */
  variations: (target: Element) => boolean;
  /** Elements whose native keys stay with React Aria when no action claims them (tabs, toolbars). */
  ownsKeys: (target: Element) => boolean;
  children: (props: { ref: React.RefCallback<HTMLElement>; onKeyDownCapture: React.KeyboardEventHandler<HTMLElement> }) => React.ReactNode;
};

/** Provides registration to the parts and returns the Root element's props. */
export function KeyboardProvider({ keymap: overrides, onKeyDown, close, focusSearch, variations, ownsKeys, children }: KeyboardProviderProps) {
  const keymap = React.useMemo(() => resolveKeymap(overrides), [overrides]);
  const handlers = React.useRef<Registry<PickerKeyboardEventHandler>>(new Map()).current;
  const regions = React.useRef<Registry<RegionHandler>>(new Map()).current;
  const skinTone = React.useRef<(() => void) | null>(null);
  const value = React.useMemo<KeyboardContextValue>(() => ({ keymap, handlers, regions, skinTone }), [keymap, handlers, regions]);
  const rootHandlerRef = useRegistered(handlers, onKeyDown as PickerKeyboardEventHandler | undefined);
  const root = React.useRef<HTMLElement | null>(null);
  const latest = React.useRef({ keymap, close, focusSearch, variations, ownsKeys });
  latest.current = { keymap, close, focusSearch, variations, ownsKeys };

  const onKeyDownCapture = React.useCallback(
    (reactEvent: React.KeyboardEvent<HTMLElement>) => {
      const native = reactEvent.nativeEvent;
      const rootEl = root.current;
      const target = reactEvent.target as Element;
      // Untrusted events are React Aria's own re-dispatches (Autocomplete forwards keys to the collection).
      if (!rootEl || !native.isTrusted || native.isComposing || native.keyCode === 229 || !(target instanceof Element)) return;
      const { keymap, close, focusSearch, variations, ownsKeys } = latest.current;
      const event = augment(reactEvent);
      const path = ancestors(target, rootEl);

      // 1. The parts' own handlers, innermost first.
      for (const el of path) {
        const handler = handlers.get(el)?.current;
        if (handler) withCurrentTarget(event, el, () => handler(event));
        if (event.isPropagationStopped()) break;
      }
      if (event.emojiPickerHandlerPrevented) return event.stopPropagation();
      if (event.defaultPrevented) return;

      const handled = () => {
        event.preventDefault();
        event.stopPropagation();
      };
      if (event.key === " " && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && variations(target)) return handled();

      const action = actionFor(event, keymap);
      // Home and End edit the query, except in an empty field: there they go to the first and last emoji.
      const typing = isTextField(target) && isTextEditingKey(event) && !((event.key === "Home" || event.key === "End") && target.value === "");

      // 2. Regions, innermost first.
      if (!typing) {
        for (const el of path) {
          const result = regions.get(el)?.current?.(action, event);
          if (result === "handled") return handled();
          if (result === "native") return event.stopPropagation();
        }
      }

      // 3. Picker-wide actions.
      if (action === "close" && close()) return handled();
      if (!typing && action === "focus-search" && !isTextField(target) && focusSearch()) return handled();
      if (!typing && action === "toggle-skin-tone" && skinTone.current) {
        skinTone.current();
        return handled();
      }

      // 4. A navigation key no action claimed: React Aria's parts would act on it.
      if (NATIVE_KEYS.has(event.key) && !(event.key === " " && typing) && !ownsKeys(target)) event.stopPropagation();
    },
    [handlers, regions],
  );

  return (
    <KeyboardContext.Provider value={value}>
      {children({ ref: mergeRefs(root, rootHandlerRef as React.RefCallback<HTMLElement>), onKeyDownCapture })}
    </KeyboardContext.Provider>
  );
}

/** First/last for a row of buttons (reactions): Home and End focus its ends. */
export function useEdgeKeys(selector: string): React.RefCallback<Element> {
  const element = React.useRef<Element | null>(null);
  const region = useKeyRegion((action) => {
    if (action !== "first" && action !== "last") return "pass";
    const items = [...(element.current?.querySelectorAll<HTMLElement>(selector) ?? [])].filter((el) => !el.hidden && el.getAttribute("aria-hidden") !== "true");
    const item = action === "first" ? items[0] : items[items.length - 1];
    if (!item) return "pass";
    item.focus();
    return "handled";
  });
  return React.useMemo(() => mergeRefs(element, region), [region]);
}
