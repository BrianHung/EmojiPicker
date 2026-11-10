import * as React from "react";
import { autoUpdate, flip, FloatingPortal, offset, shift, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { Emoji, useTextFieldEmojiSuggestions } from "emoji-components";

export function ShortcodeSuggestions() {
  const ref = React.useRef<HTMLInputElement>(null);
  const menu = useTextFieldEmojiSuggestions(ref, { limit: 6 });
  const { refs, floatingStyles, context } = useFloating({
    open: menu.open,
    onOpenChange: (open) => open || menu.dismiss(),
    placement: "top-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  React.useLayoutEffect(() => refs.setPositionReference(menu.anchor), [refs, menu.anchor]);
  const { getFloatingProps } = useInteractions([useDismiss(context, { escapeKey: false })]);
  return (
    <>
      <input
        ref={ref}
        aria-label="Message"
        placeholder="Type :tada or :thu"
        className="h-10 w-full max-w-[352px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      />
      {menu.open ? (
        <FloatingPortal>
          <ul
            ref={refs.setFloating}
            style={floatingStyles}
            {...menu.getListProps(getFloatingProps())}
            className="z-50 max-h-64 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          >
            {menu.suggestions.map((s, i) => (
              <li key={`${s.record.unified}:${s.shortcode}`} {...menu.getOptionProps(i)} className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 data-[highlighted]:bg-accent">
                <Emoji emoji={s.record.unified} size={20} className="text-xl leading-none" />
                <span className="font-medium">:{s.shortcode}:</span>
              </li>
            ))}
          </ul>
        </FloatingPortal>
      ) : null}
    </>
  );
}
