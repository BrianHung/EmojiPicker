import { buildDataset, findEmojibase } from "@brianhung/emoji-picker-core/build";

export const en = buildDataset({ locale: "en", load: findEmojibase()!.load }).dataset;
