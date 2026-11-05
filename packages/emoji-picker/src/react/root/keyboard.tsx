import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { actionFor, isTextEditingKey, resolveKeymap, type KeyboardAction, type Keymap } from "./keymap";

export type PickerKeyboardEvent<T extends Element = Element> = React.KeyboardEvent<T> & {
  preventEmojiPickerHandler: () => void;
  readonly emojiPickerHandlerPrevented: boolean;
};
export type PickerKeyboardEventHandler<T extends Element = Element> = (event: PickerKeyboardEvent<T>) => void;

type RegionResult = "handled" | "pass" | "native";
type RegionHandler = (action: KeyboardAction | null, event: PickerKeyboardEvent) => RegionResult;

type Registry<T> = Map<Element, React.MutableRefObject<T | undefined>>;

type KeyboardContextValue = {
  keymap: Keymap;
  handlers: Registry<PickerKeyboardEventHandler>;
  regions: Registry<RegionHandler>;
  skinTone: React.MutableRefObject<(() => void) | null>;
};

const KeyboardContext = React.createContext<KeyboardContextValue | null>(null);

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

export function useUserKeyDown(handler: PickerKeyboardEventHandler | undefined): React.RefCallback<Element> {
  return useRegistered(React.useContext(KeyboardContext)?.handlers ?? null, handler);
}

export function useKeyRegion(handler: RegionHandler): React.RefCallback<Element> {
  return useRegistered(React.useContext(KeyboardContext)?.regions ?? null, handler);
}

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

function withCurrentTarget(event: React.SyntheticEvent, el: Element, fn: () => void) {
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

const NATIVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Enter", " "]);

type KeyboardProviderProps = {
  keymap?: Partial<Record<KeyboardAction, readonly string[]>>;
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  close: () => boolean;
  focusSearch: () => boolean;
  variations: (target: Element) => boolean;
  ownsKeys: (target: Element) => boolean;
  children: (props: { ref: React.Ref<HTMLElement>; onKeyDownCapture: React.KeyboardEventHandler<HTMLElement> }) => React.ReactNode;
};

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
      // Untrusted events are React Aria's own re-dispatches (Autocomplete forwards keys to the collection)
      if (!rootEl || !native.isTrusted || native.isComposing || native.keyCode === 229 || !(target instanceof Element)) return;
      const { keymap, close, focusSearch, variations, ownsKeys } = latest.current;
      const event = augment(reactEvent);
      const path = ancestors(target, rootEl);

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
      const typing = isTextField(target) && isTextEditingKey(event) && !((event.key === "Home" || event.key === "End") && target.value === "");

      if (!typing) {
        for (const el of path) {
          const result = regions.get(el)?.current?.(action, event);
          if (result === "handled") return handled();
          if (result === "native") return event.stopPropagation();
        }
      }

      if (action === "close" && close()) return handled();
      if (!typing && action === "focus-search" && !isTextField(target) && focusSearch()) return handled();
      if (!typing && action === "toggle-skin-tone" && skinTone.current) {
        skinTone.current();
        return handled();
      }

      if (NATIVE_KEYS.has(event.key) && !(event.key === " " && typing) && !ownsKeys(target)) event.stopPropagation();
    },
    [handlers, regions],
  );

  return <KeyboardContext.Provider value={value}>{children({ ref: mergeRefs<HTMLElement>(root, rootHandlerRef), onKeyDownCapture })}</KeyboardContext.Provider>;
}

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
  return React.useMemo(() => mergeRefs(element, region) as React.RefCallback<Element>, [region]);
}
