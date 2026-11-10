"use client";

import * as React from "react";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { EmojiPickerViewportContext } from "./EmojiPickerViewportContext";
import { usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { renderElement, resolve } from "../../internals/renderElement";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import type { EmojiPickerOrientation } from "../utils/types";
import { SLOTS } from "../../internals/slots";
import { EmojiPickerList } from "../list/EmojiPickerList";
import { useStore } from "../../utils/useStore";

export type EmojiPickerViewportState = { searching: boolean; orientation: EmojiPickerOrientation };

export type EmojiPickerViewportProps = EmojiComponentsPartElementProps<EmojiPickerViewportState, HTMLDivElement>;

const SCROLL: Record<EmojiPickerOrientation, React.CSSProperties> = {
  vertical: { overflowX: "hidden", overflowY: "scroll", overscrollBehavior: "contain" },
  horizontal: { overflowX: "auto", overflowY: "hidden", overscrollBehavior: "contain" },
};
const FIXED_GUTTER: React.CSSProperties = { scrollbarGutter: "stable" };

export const EmojiPickerViewport = React.forwardRef<HTMLDivElement, EmojiPickerViewportProps>(function EmojiPickerViewport({ onKeyDown, style, children, ...props }, ref) {
  const { state, columns } = useEmojiPickerRootContext("EmojiPicker.Viewport");
  const searching = useStore(state, (s) => s.searching);
  const [orientation, setOrientation] = React.useState<EmojiPickerOrientation>("vertical");
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return (
    <EmojiPickerViewportContext.Provider value={setOrientation}>
      {renderElement(
        "div",
        {
          ...props,
          "data-slot": SLOTS.viewport,
          ref,
          onKeyDown: keys,
          children: children ?? <EmojiPickerList />,
          style: (s: EmojiPickerViewportState) => ({ ...SCROLL[s.orientation], ...(columns ? FIXED_GUTTER : null), ...resolve(style, s) }),
        },
        { searching, orientation },
        ["orientation", "searching"],
      )}
    </EmojiPickerViewportContext.Provider>
  );
});

export declare namespace EmojiPickerViewport {
  type Props = EmojiPickerViewportProps;
  type State = EmojiPickerViewportState;
}
