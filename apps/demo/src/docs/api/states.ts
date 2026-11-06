import type { EmptyState } from "@brianhung/emoji-picker-react";
import { rowsOf } from "./rows";

export const states = rowsOf<EmptyState>()([
  { name: "status", type: '"loading" | "error" | "empty"', description: "empty means the data loaded and nothing matches." },
  { name: "query", type: "string" },
  { name: "error", type: "Error | null", description: "Why loading failed." },
  { name: "retry", type: "() => void", description: "Loads the data again." },
]);
