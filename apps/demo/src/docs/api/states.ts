import type { EmptyProps, LoadErrorProps, LoadingProps } from "@brianhung/emoji-picker";
import { rowsOfParts } from "./rows";

export const states = rowsOfParts<{ Empty: EmptyProps; LoadError: LoadErrorProps; Loading: LoadingProps }>()([
  { name: "Empty › children", type: "ReactNode | ({ search }) => ReactNode", default: "labels.noResults", description: "Shown when a search has no results." },
  { name: "LoadError › children", type: "ReactNode | ({ error, retry }) => ReactNode", default: "a message and a retry button" },
  { name: "Loading › children", type: "ReactNode", default: "labels.loading" },
]);
