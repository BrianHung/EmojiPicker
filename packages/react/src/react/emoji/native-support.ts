"use client";

import * as React from "react";
import type { EmojiRecord } from "@brianhung/emoji-picker-core";
import { onNativeSupportChange, PROBE_BATCH } from "@brianhung/emoji-picker-core/internal";
import { drawsNatively, isNativeSupported, nativeProbe, nativeSupport, type NativeSupport } from "@brianhung/emoji-picker-core/native";
import { useEmojiContext, useStoreSnapshot } from "../provider/provider";
import { useLayoutEffect } from "../utils/utils";

type Drawable = (record: EmojiRecord, unified: string) => boolean;

const always: Drawable = () => true;

export function useDrawable(root: React.RefObject<HTMLElement | null>): { drawable: Drawable; request: (unifieds: Iterable<string>) => void } {
  const { store, renderer, image } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  const native = renderer === "native" && status === "ready";
  const records = useStoreSnapshot((s) => s.records());
  const [support, setSupport] = React.useState<NativeSupport | null>(null);
  const [version, setVersion] = React.useState(0);
  const pending = React.useRef(new Set<string>());
  const timer = React.useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!native || typeof window === "undefined") return setSupport(null);
    const font = (root.current && getComputedStyle(root.current).getPropertyValue("--emoji-font-family").trim()) || undefined;
    const samples = new Map<number, string>();
    for (const r of records) if (!r.imageUrl && !samples.has(r.version)) samples.set(r.version, r.unified);
    let current: NativeSupport | null = null;
    const update = () => {
      const probe = nativeProbe(font);
      if (current && current.probe === probe) return;
      current = probe && nativeSupport(probe, samples);
      setSupport(current);
    };
    update();
    return onNativeSupportChange(update);
  }, [native, records, root]);

  const request = React.useCallback(
    (unifieds: Iterable<string>) => {
      if (!support) return;
      for (const u of unifieds) if (support.probe.result(u) === undefined) pending.current.add(u);
      if (!pending.current.size || timer.current != null) return;
      const flush = () => {
        timer.current = null;
        const batch = [...pending.current].slice(0, PROBE_BATCH);
        batch.forEach((u) => pending.current.delete(u));
        const verdict = (u: string) => isNativeSupported(support, u, store.get(u)?.version ?? 0);
        const predicted = batch.map(verdict);
        support.probe.prime(batch);
        if (batch.some((u, i) => verdict(u) !== predicted[i])) setVersion((v) => v + 1);
        if (pending.current.size) schedule();
      };
      const schedule = () => {
        timer.current = typeof requestIdleCallback === "function" ? requestIdleCallback(flush, { timeout: 500 }) : window.setTimeout(flush);
      };
      schedule();
    },
    [support, store],
  );
  React.useEffect(
    () => () => {
      if (timer.current == null) return;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(timer.current);
      else clearTimeout(timer.current);
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: the probe's results are mutable; version counts the batches that changed a verdict
  const drawable = React.useMemo<Drawable>(() => {
    if (!native) return always;
    return (record, unified) => record.imageUrl != null || image(unified) !== undefined || drawsNatively(support, record, unified);
  }, [native, support, version, image]);
  return { drawable, request };
}
