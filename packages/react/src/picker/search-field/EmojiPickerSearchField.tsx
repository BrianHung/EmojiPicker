"use client";

import * as React from "react";
import { SearchField as AriaSearchField } from "react-aria-components/SearchField";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import type { EmojiPickerSearchState } from "../search/EmojiPickerSearch";
import { useQueryEmpty } from "../utils/useQueryEmpty";
import * as EmojiPickerSearchFieldDataAttributes from "./EmojiPickerSearchFieldDataAttributes";
import { EmojiPickerSearchFieldContext } from "./EmojiPickerSearchFieldContext";

export type EmojiPickerSearchFieldState = EmojiPickerSearchState;

export type EmojiPickerSearchFieldProps = Omit<EmojiComponentsPartElementProps<EmojiPickerSearchFieldState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">, "children"> & { children?: React.ReactNode };

const FIELD: React.CSSProperties = { position: "relative", flex: "1 1 auto", alignSelf: "stretch", display: "flex", alignItems: "center", minWidth: 0 };

// React Aria's SearchField: SearchInput renders one around itself when it isn't inside a SearchField
export const EmojiPickerSearchField = React.forwardRef<HTMLDivElement, EmojiPickerSearchFieldProps>(function EmojiPickerSearchField({ className, style, render, children, ...props }, ref) {
  const { labels } = useEmojiPickerRootContext("EmojiPicker.SearchField");
  const empty = useQueryEmpty("EmojiPicker.SearchField");
  return (
    <AriaSearchField
      {...(props as object)}
      ref={ref}
      data-slot={SLOTS.searchField}
      aria-label={labels.searchLabel}
      className={() => resolve(className, { empty }) ?? ""}
      style={() => ({ ...FIELD, ...resolve(style, { empty }) })}
      render={(dom) => renderElement("div", { ...dom, [EmojiPickerSearchFieldDataAttributes.empty]: flag(empty), render }, { empty })}
    >
      <EmojiPickerSearchFieldContext.Provider value>{children}</EmojiPickerSearchFieldContext.Provider>
    </AriaSearchField>
  );
});

export declare namespace EmojiPickerSearchField {
  type Props = EmojiPickerSearchFieldProps;
  type State = EmojiPickerSearchFieldState;
}
