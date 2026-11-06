import data from "../data/en.json";
import type { Dataset } from "../src/dataset";

// JSON imports widen `format: 1` to number
export const en = data as unknown as Dataset;
