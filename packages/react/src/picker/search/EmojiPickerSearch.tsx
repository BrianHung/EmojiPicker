"use client";

import * as React from "react";
import { SearchField as AriaSearchField } from "react-aria-components/SearchField";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { EmojiPickerSearchClear } from "../search-clear/EmojiPickerSearchClear";
import { EmojiPickerSearchInput } from "../search-input/EmojiPickerSearchInput";
import { useQueryEmpty } from "../utils/useQueryEmpty";
import { EmojiPickerSearchContext } from "./EmojiPickerSearchContext";
import * as EmojiPickerSearchDataAttributes from "./EmojiPickerSearchDataAttributes";

export type EmojiPickerSearchState = { empty: boolean };

export type EmojiPickerSearchProps = Omit<EmojiComponentsPartElementProps<EmojiPickerSearchState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">, "children"> & { children?: React.ReactNode };

const FIELD: React.CSSProperties = { position: "relative", flex: "1 1 auto", alignSelf: "stretch", display: "flex", alignItems: "center", minWidth: 0 };

// React Aria's SearchField, which gives SearchInput the query
export const EmojiPickerSearch = React.forwardRef<HTMLDivElement, EmojiPickerSearchProps>(function EmojiPickerSearch({ className, style, render, onKeyDown, children, ...props }, ref) {
  const { labels } = useEmojiPickerRootContext("EmojiPicker.Search");
  const empty = useQueryEmpty("EmojiPicker.Search");
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return (
    <AriaSearchField
      {...(props as object)}
      ref={ref}
      data-slot={SLOTS.search}
      aria-label={labels.searchLabel}
      className={() => resolve(className, { empty }) ?? ""}
      style={() => ({ ...FIELD, ...resolve(style, { empty }) })}
      render={(dom) => renderElement("div", { ...dom, [EmojiPickerSearchDataAttributes.empty]: flag(empty), onKeyDown: keys, render }, { empty })}
    >
      <EmojiPickerSearchContext.Provider value>
        {children ?? (
          <>
            <EmojiPickerSearchInput />
            <EmojiPickerSearchClear />
          </>
        )}
      </EmojiPickerSearchContext.Provider>
    </AriaSearchField>
  );
});

export declare namespace EmojiPickerSearch {
  type Props = EmojiPickerSearchProps;
  type State = EmojiPickerSearchState;
}
