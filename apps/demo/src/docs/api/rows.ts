import type { PropRow } from "@/components/site/docs";

type Name<P> = Extract<keyof P, string>;
type PartName<M> = { [K in Name<M>]: `${K} › ${Name<M[K]>}` }[Name<M>];

/** A props table for `P`: a row naming a prop `P` doesn't have fails the typecheck. */
export const rowsOf =
  <P>() =>
  (rows: readonly (PropRow & { name: Name<P> })[]): PropRow[] => [...rows];

/** A table across parts, rows named "Part › prop": `rowsOfParts<{ Trigger: TriggerProps }>()`. */
export const rowsOfParts =
  <M>() =>
  (rows: readonly (PropRow & { name: PartName<M> })[]): PropRow[] => [...rows];
