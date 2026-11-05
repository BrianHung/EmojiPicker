import type { PropRow } from "@/components/site/docs";

export const states: PropRow[] = [
  { name: "Empty › children", type: "ReactNode | ({ search }) => ReactNode", description: "Shown when a search has no results." },
  { name: "LoadError › children", type: "ReactNode | ({ error, retry }) => ReactNode" },
  { name: "Loading › children", type: "ReactNode" },
];
