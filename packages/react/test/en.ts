import { buildDataset, findEmojibase } from "@emoji-components/core/build";

export const en = buildDataset({ locale: "en", load: findEmojibase()!.load }).dataset;
