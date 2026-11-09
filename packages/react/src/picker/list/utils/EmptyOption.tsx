"use client";

import type { EmojiPickerListEmptyState } from "../EmojiPickerList";
import type * as React from "react";
import { useEmojiPickerRootContext } from "../../root/EmojiPickerRootContext";
import { useStoreSnapshot } from "../../../provider/EmojiProviderContext";
import { shallowEqual, useStore } from "../../../utils/useStore";

const CONTENTS: React.CSSProperties = { display: "contents" };

const statusOf = (status: string): EmojiPickerListEmptyState["status"] => (status === "error" ? "error" : status === "ready" ? "empty" : "loading");

export function EmptyOption({ render }: { render: (state: EmojiPickerListEmptyState) => React.ReactNode }) {
  const { store, state: picker } = useEmojiPickerRootContext();
  const { query, pending, searchError } = useStore(picker, ({ query, pending, searchError }) => ({ query, pending, searchError }), shallowEqual);
  const status = useStoreSnapshot((s) => s.status());
  if (status === "ready" && pending) return null;
  const state: EmojiPickerListEmptyState = searchError
    ? { status: "error", query, error: searchError, retry: () => void picker.setQuery(query) }
    : { status: statusOf(status), query, error: store.error(), retry: () => void store.load().catch(() => {}) };
  return (
    <div role="option" style={CONTENTS}>
      {render(state)}
    </div>
  );
}
