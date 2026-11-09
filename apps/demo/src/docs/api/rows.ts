import type { PropRow } from "@/components/site/docs";

type Name<P> = Extract<keyof P, string>;

export const rowsOf =
  <P>() =>
  (rows: readonly (PropRow & { name: Name<P> })[]): PropRow[] => [...rows];

export const className = (state: string, description?: string) => ({ name: "className" as const, type: `string | (state: ${state}) => string | undefined`, ...(description ? { description } : {}) });
