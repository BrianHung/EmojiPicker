"use client";

import type * as React from "react";
import { usePicker } from "../root/context";
import { useStoreSnapshot } from "../provider/provider";
import { shallowEqual, useStore } from "../utils/store";

export type EmptyState = { status: "loading" | "error" | "empty"; query: string; error: Error | null; retry: () => void };

const CONTENTS: React.CSSProperties = { display: "contents" };

const statusOf = (status: string): EmptyState["status"] => (status === "error" ? "error" : status === "ready" ? "empty" : "loading");

export function EmptyOption({ render }: { render: (state: EmptyState) => React.ReactNode }) {
  const { store, state: picker } = usePicker();
  const { query, pending } = useStore(picker, ({ query, pending }) => ({ query, pending }), shallowEqual);
  const status = useStoreSnapshot((s) => s.status());
  if (status === "ready" && pending) return null;
  const state: EmptyState = { status: statusOf(status), query, error: store.error(), retry: () => void store.load().catch(() => {}) };
  return (
    <div role="option" style={CONTENTS}>
      {render(state)}
    </div>
  );
}
