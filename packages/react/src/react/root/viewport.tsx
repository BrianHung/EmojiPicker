import * as React from "react";
import { usePicker, ViewportContext } from "./context";
import { usePickerKeyDown } from "../utils/keyboard";
import { renderElement, resolve, type EmojiPickerOrientation, type EmojiPickerPartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";

export type ViewportState = { searching: boolean; orientation: EmojiPickerOrientation };

export type ViewportProps = EmojiPickerPartElementProps<ViewportState, HTMLDivElement>;

const SCROLL: Record<EmojiPickerOrientation, React.CSSProperties> = {
  vertical: { overflowX: "hidden", overflowY: "scroll", overscrollBehavior: "contain" },
  horizontal: { overflowX: "auto", overflowY: "hidden", overscrollBehavior: "contain" },
};
const FIXED_GUTTER: React.CSSProperties = { scrollbarGutter: "stable" };

export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, style, ...props }, ref) {
  const { state, columns } = usePicker("EmojiPicker.Viewport");
  const searching = useStore(state, (s) => s.searching);
  const [orientation, setOrientation] = React.useState<EmojiPickerOrientation>("vertical");
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return (
    <ViewportContext.Provider value={setOrientation}>
      {renderElement(
        "div",
        {
          "data-slot": SLOTS.viewport,
          ...props,
          ref,
          onKeyDown: keys,
          style: (s: ViewportState) => ({ ...SCROLL[s.orientation], ...(columns ? FIXED_GUTTER : null), ...resolve(style, s) }),
        },
        { searching, orientation },
        ["orientation", "searching"],
      )}
    </ViewportContext.Provider>
  );
});

export declare namespace Viewport {
  type Props = ViewportProps;
  type State = ViewportState;
}
