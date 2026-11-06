import data from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";

// The data's .d.cts types it from the built package, which a source checkout doesn't have
export const en = data as unknown as Dataset;
