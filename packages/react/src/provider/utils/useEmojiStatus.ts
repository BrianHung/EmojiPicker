"use client";

import * as React from "react";
import type { EmojiStoreStatus } from "@brianhung/emoji-picker-core";
import { useEmojiContext, useStoreSnapshot } from "../EmojiProviderContext";

export function useEmojiStatus(): EmojiStoreStatus {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  React.useEffect(() => {
    if (status === "idle") store.load().catch(() => {});
  }, [status, store]);
  return status;
}
