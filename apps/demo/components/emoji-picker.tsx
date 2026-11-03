// The demo uses the shadcn registry item itself (registry/emoji-picker.tsx), through the
// same `@/lib/utils` and `@brianhung/emoji-picker` imports an installed copy has.
export {
  EmojiPickerBody as PickerBody,
  EmojiPickerCard as ShadcnEmojiPicker,
  EmojiPickerFooter,
  EmojiPickerPopover,
  EmojiTapback as ShadcnTapback,
} from "../registry/emoji-picker";
export type { EmojiPickerBodyProps as PickerBodyProps, EmojiPickerCardProps as ShadcnEmojiPickerProps, EmojiPickerPopoverProps } from "../registry/emoji-picker";
