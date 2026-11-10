"use client";

import * as React from "react";
import { flag, renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { EmojiPickerSearchClear } from "../search-clear/EmojiPickerSearchClear";
import { EmojiPickerSearchInput } from "../search-input/EmojiPickerSearchInput";
import { EmojiPickerSearchInputGroup } from "../search-input-group/EmojiPickerSearchInputGroup";
import { useQueryEmpty } from "../utils/useQueryEmpty";
import * as EmojiPickerSearchDataAttributes from "./EmojiPickerSearchDataAttributes";

export type EmojiPickerSearchState = { empty: boolean };

export type EmojiPickerSearchProps = EmojiComponentsPartElementProps<EmojiPickerSearchState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">;

export const EmojiPickerSearch = React.forwardRef<HTMLDivElement, EmojiPickerSearchProps>(function EmojiPickerSearch({ onKeyDown, children, ...props }, ref) {
  const empty = useQueryEmpty("EmojiPicker.Search");
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return renderElement(
    "div",
    {
      [EmojiPickerSearchDataAttributes.empty]: flag(empty),
      ...props,
      "data-slot": SLOTS.search,
      ref,
      onKeyDown: keys,
      children: children ?? (
        <EmojiPickerSearchInputGroup>
          <EmojiPickerSearchInput />
          <EmojiPickerSearchClear />
        </EmojiPickerSearchInputGroup>
      ),
    },
    { empty },
  );
});

export declare namespace EmojiPickerSearch {
  type Props = EmojiPickerSearchProps;
  type State = EmojiPickerSearchState;
}
