import type { PropRow } from "@/components/site/docs";

type Name<P> = Extract<keyof P, string>;
type PartName<M> = { [K in Name<M>]: `${K} › ${Name<M[K]>}` }[Name<M>];

export const rowsOf =
  <P>() =>
  (rows: readonly (PropRow & { name: Name<P> })[]): PropRow[] => [...rows];

export const rowsOfParts =
  <M>() =>
  (rows: readonly (PropRow & { name: PartName<M> })[]): PropRow[] => [...rows];

export const inPart = (part: string, rows: readonly PropRow[]): PropRow[] => rows.map((r) => ({ ...r, name: `${part} › ${r.name}` }));
