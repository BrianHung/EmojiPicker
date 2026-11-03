// Internal: one keyboard dispatcher per picker, at Root. For every keydown inside
// the picker, in this order:
//   1. user `onKeyDown` handlers on the parts (innermost first, as bubbling would);
//      any of them can call `event.preventEmojiPickerHandler()` to stop here,
//   2. the key's action (from the keymap) goes to the innermost region that takes it
//      (horizontal list, search field, skin tone, reactions, tab bar, vertical list),
//   3. picker-wide actions: close, focus-search, toggle-skin-tone,
//   4. otherwise the engine (emoji-picker-react) gets the key.
//
// It runs in React's capture phase on Root, which is before the engine's own
// listener (bubble, on the same root element). Keys handled here, and keys the
// user unbound, are hidden from the engine; nothing stops propagation, so apps can
// still see them (and check `defaultPrevented`).
import * as React from "react";
import { ENGINE_KEYS, actionFor, engineActionOf, isTextEditingKey, matchesChord, resolveKeymap, type KeyboardAction, type Keymap } from "./keymap";

/** A picker part's keydown event. Its handler runs before the picker's own. */
export type PickerKeyboardEvent<T extends Element = Element> = React.KeyboardEvent<T> & {
  /** Skip the picker's handling of this key (and the engine's); the event still propagates. Like Base UI's `preventBaseUIHandler`. */
  preventEmojiPickerHandler: () => void;
  /** Whether a handler called `preventEmojiPickerHandler()`. */
  readonly emojiPickerHandlerPrevented: boolean;
};
export type PickerKeyboardEventHandler<T extends Element = Element> = (event: PickerKeyboardEvent<T>) => void;

/**
 * What a region did with a key. "pass" lets an outer region (or the engine) try;
 * "native" keeps it from the engine and leaves it to the browser (a caret move).
 */
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

// --- Engine boundary ------------------------------------------------------------

/** Events this module dispatched itself (a remapped key, re-sent as the engine's own). */
const resent = new WeakSet<Event>();

/**
 * Hides one keydown from the engine. Its listener skips events that are part of an
 * IME composition, so the event reports `isComposing` until it leaves the picker's
 * root, then reads normally again for everyone above.
 */
function hideFromEngine(event: KeyboardEvent, root: Element) {
  if (Object.prototype.hasOwnProperty.call(event, "isComposing")) return;
  Object.defineProperty(event, "isComposing", { configurable: true, get: () => true });
  const parent = root.parentNode;
  // Only this event: a key re-sent while handling it passes the parent first.
  const restore = (e: Event) => {
    if (e !== event) return;
    delete (event as { isComposing?: boolean }).isComposing;
    parent?.removeEventListener("keydown", restore);
  };
  if (!parent) return restore(event);
  parent.addEventListener("keydown", restore);
  // If something stops it before the parent, clean up after this dispatch anyway.
  setTimeout(() => restore(event), 0);
}

/** Sends `key` to the engine as if pressed on `target` (a remapped binding). */
export function resendKey(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true, ...init });
  resent.add(event);
  target.dispatchEvent(event);
}

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
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

export type KeyboardProviderProps = {
  keymap?: Partial<Record<KeyboardAction, readonly string[]>>;
  /** Root's own onKeyDown: runs after the parts' handlers, before the picker's. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  /** Close the surrounding popover, if any. Returns false when there's none. */
  close: () => boolean;
  children: (props: { ref: React.RefCallback<HTMLElement>; onKeyDownCapture: React.KeyboardEventHandler<HTMLElement> }) => React.ReactNode;
};

/** Provides registration to the parts and returns the Root element's props. */
export function KeyboardProvider({ keymap: overrides, onKeyDown, close, children }: KeyboardProviderProps) {
  const keymap = React.useMemo(() => resolveKeymap(overrides), [overrides]);
  const handlers = React.useRef<Registry<PickerKeyboardEventHandler>>(new Map()).current;
  const regions = React.useRef<Registry<RegionHandler>>(new Map()).current;
  const skinTone = React.useRef<(() => void) | null>(null);
  const value = React.useMemo<KeyboardContextValue>(() => ({ keymap, handlers, regions, skinTone }), [keymap, handlers, regions]);
  const rootHandlerRef = useRegistered(handlers, onKeyDown as PickerKeyboardEventHandler | undefined);
  const root = React.useRef<HTMLElement | null>(null);
  const latest = React.useRef({ keymap, close });
  latest.current = { keymap, close };

  const onKeyDownCapture = React.useCallback(
    (reactEvent: React.KeyboardEvent<HTMLElement>) => {
      const native = reactEvent.nativeEvent;
      const rootEl = root.current;
      const target = reactEvent.target as Element;
      if (!rootEl || resent.has(native) || native.isComposing || native.keyCode === 229 || !(target instanceof Element)) return;
      const { keymap, close } = latest.current;
      const event = augment(reactEvent);
      const path = ancestors(target, rootEl);

      // 1. The parts' own handlers, innermost first.
      for (const el of path) {
        const handler = handlers.get(el)?.current;
        if (handler) withCurrentTarget(event, el, () => handler(event));
        if (event.isPropagationStopped()) break;
      }
      const action = actionFor(event, keymap);
      if (event.emojiPickerHandlerPrevented) {
        // Selecting a focused cell is the button's own click: keep that from happening too.
        if (action === "select" && target instanceof HTMLButtonElement) event.preventDefault();
        return hideFromEngine(native, rootEl);
      }
      if (event.defaultPrevented) return;

      const typing = isTextField(target) && isTextEditingKey(event);
      const handled = () => {
        event.preventDefault();
        hideFromEngine(native, rootEl);
      };

      // 2. Regions, innermost first.
      if (!typing) {
        for (const el of path) {
          const region = regions.get(el)?.current;
          const result = region?.(action, event);
          if (result === "handled") return handled();
          if (result === "native") return hideFromEngine(native, rootEl);
        }
      }

      // 3. Picker-wide actions.
      if (action === "close" && close()) return handled();
      if (!typing && action === "focus-search" && !isTextField(target)) {
        const input = rootEl.querySelector<HTMLElement>('[data-slot="search-input"], [data-epr-part="search-input"]');
        if (input) {
          input.focus();
          return handled();
        }
      }
      if (!typing && action === "toggle-skin-tone" && skinTone.current) {
        skinTone.current();
        return handled();
      }

      // 4. The engine. Its own key for this action goes through untouched; another
      //    binding is re-sent as that key; an engine key the user unbound is hidden.
      const engineAction = engineActionOf(event);
      if (action && action === engineAction) return;
      const engineKey = action ? ENGINE_KEYS[action] : undefined;
      if (engineKey && !typing) {
        handled();
        if (action === "select" && target instanceof HTMLButtonElement) target.click();
        else resendKey(target, engineKey);
        return;
      }
      if (engineAction && !keymap[engineAction].some((chord) => matchesChord(event, chord))) {
        hideFromEngine(native, rootEl);
        // Enter on a button would still click it.
        if (engineAction === "select" && target instanceof HTMLButtonElement) event.preventDefault();
      }
    },
    [handlers, regions],
  );

  return (
    <KeyboardContext.Provider value={value}>
      {children({ ref: mergeRefs(root, rootHandlerRef as React.RefCallback<HTMLElement>), onKeyDownCapture })}
    </KeyboardContext.Provider>
  );
}

/** First/last for a row of buttons (reactions, category tabs): Home and End focus its ends. */
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
