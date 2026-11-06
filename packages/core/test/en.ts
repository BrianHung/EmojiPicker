import { buildDataset, findEmojibase } from "../scripts/build-data";

export const en = buildDataset({ locale: "en", load: findEmojibase()!.load }).dataset;
