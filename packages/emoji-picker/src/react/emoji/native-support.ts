import * as React from "react";
import { type EmojiRecord, isNativeSupported, KNOWN_FAILING, nativeProbe, nativeSupport, type NativeSupport, PROBE_BATCH, withoutTone } from "@brianhung/emoji-picker-core";
import { useEmojiContext, useStoreSnapshot } from "../provider/provider";

type Drawable = (record: EmojiRecord, unified: string) => boolean;

const always: Drawable = () => true;

export function useDrawable(root: React.RefObject<HTMLElement | null>): { drawable: Drawable; request: (unifieds: Iterable<string>) => void } {
  const { store, renderer } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  const native = renderer === "native" && status === "ready";
  const [support, setSupport] = React.useState<NativeSupport | null>(null);
  const [version, setVersion] = React.useState(0);
  const pending = React.useRef(new Set<string>());
  const timer = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    if (!native || typeof window === "undefined") return setSupport(null);
    const font = (root.current && getComputedStyle(root.current).getPropertyValue("--emoji-font-family").trim()) || undefined;
    const probe = nativeProbe(font);
    if (!probe) return setSupport(null);
    const samples = new Map<number, string>();
    for (const r of store.records()) if (!r.imageUrl && !samples.has(r.version)) samples.set(r.version, r.unified);
    setSupport(nativeSupport(probe, samples));
  }, [native, store, root]);

  const request = React.useCallback(
    (unifieds: Iterable<string>) => {
      if (!support) return;
      for (const u of unifieds) if (support.probe.result(u) === undefined) pending.current.add(u);
      if (!pending.current.size || timer.current != null) return;
      const flush = () => {
        timer.current = null;
        const batch = [...pending.current].slice(0, PROBE_BATCH);
        batch.forEach((u) => pending.current.delete(u));
        support.probe.prime(batch);
        if (batch.some((u) => support.probe.result(u) === false)) setVersion((v) => v + 1);
        if (pending.current.size) schedule();
      };
      const schedule = () => {
        timer.current = typeof requestIdleCallback === "function" ? requestIdleCallback(flush, { timeout: 500 }) : window.setTimeout(flush);
      };
      schedule();
    },
    [support],
  );
  React.useEffect(
    () => () => {
      if (timer.current == null) return;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(timer.current);
      else clearTimeout(timer.current);
    },
    [],
  );

  const drawable = React.useMemo<Drawable>(() => {
    if (!native) return always;
    return (record, unified) => record.imageUrl != null || (!KNOWN_FAILING.has(withoutTone(record.unified).replace(/-fe0f/g, "")) && isNativeSupported(support, unified, record.version));
  }, [native, support, version]);
  return { drawable, request };
}
