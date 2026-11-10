"use client";

import * as React from "react";
import { SearchField as AriaSearchField } from "react-aria-components/SearchField";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import type { EmojiPickerSearchState } from "../search/EmojiPickerSearch";
import { useQueryEmpty } from "../utils/useQueryEmpty";
import * as EmojiPickerSearchInputGroupDataAttributes from "./EmojiPickerSearchInputGroupDataAttributes";
import { EmojiPickerSearchInputGroupContext } from "./EmojiPickerSearchInputGroupContext";

export type EmojiPickerSearchInputGroupState = EmojiPickerSearchState;

export type EmojiPickerSearchInputGroupProps = Omit<EmojiComponentsPartElementProps<EmojiPickerSearchInputGroupState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">, "children"> & { children?: React.ReactNode };

const GROUP: React.CSSProperties = { position: "relative", flex: "1 1 auto", alignSelf: "stretch", display: "flex", alignItems: "center", minWidth: 0 };

// React Aria's SearchField, which gives SearchInput the query
export const EmojiPickerSearchInputGroup = React.forwardRef<HTMLDivElement, EmojiPickerSearchInputGroupProps>(function EmojiPickerSearchInputGroup({ className, style, render, children, ...props }, ref) {
  const { labels } = useEmojiPickerRootContext("EmojiPicker.SearchInputGroup");
  const empty = useQueryEmpty("EmojiPicker.SearchInputGroup");
  return (
    <AriaSearchField
      {...(props as object)}
      ref={ref}
      data-slot={SLOTS.searchInputGroup}
      aria-label={labels.searchLabel}
      className={() => resolve(className, { empty }) ?? ""}
      style={() => ({ ...GROUP, ...resolve(style, { empty }) })}
      render={(dom) => renderElement("div", { ...dom, [EmojiPickerSearchInputGroupDataAttributes.empty]: flag(empty), render }, { empty })}
    >
      <EmojiPickerSearchInputGroupContext.Provider value>{children}</EmojiPickerSearchInputGroupContext.Provider>
    </AriaSearchField>
  );
});

export declare namespace EmojiPickerSearchInputGroup {
  type Props = EmojiPickerSearchInputGroupProps;
  type State = EmojiPickerSearchInputGroupState;
}
