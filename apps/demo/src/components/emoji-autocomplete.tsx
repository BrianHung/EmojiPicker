// shadcn/ui-styled :shortcode: autocomplete. The hook
// owns matching, highlight, keys and ARIA; this file is only markup and classes.
import * as React from "react";
import { Emoji, useShortcodeAutocomplete, type ShortcodeAutocomplete, type ShortcodeAutocompleteOptions } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";

/** Text, caret and autocomplete state for one input or textarea. */
export function useAutocompleteInput<T extends HTMLInputElement | HTMLTextAreaElement>(options: Omit<ShortcodeAutocompleteOptions, "value" | "caret" | "onChoose"> = {}) {
  const ref = React.useRef<T>(null);
  const [value, setValue] = React.useState("");
  const [caret, setCaret] = React.useState(0);

  const setText = React.useCallback((next: string, at = next.length) => {
    setValue(next);
    setCaret(at);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(at, at);
    });
  }, []);

  const autocomplete = useShortcodeAutocomplete({ ...options, value, caret, onChoose: (r) => setText(r.value, r.caret) });

  /** Spread onto the input/textarea. Call your own onKeyDown after `autocomplete.onKeyDown` returns false. */
  const inputProps = {
    ref,
    value,
    ...autocomplete.getInputProps(),
    onChange: (e: React.ChangeEvent<T>) => {
      setValue(e.target.value);
      setCaret(e.target.selectionStart ?? e.target.value.length);
    },
    onSelect: (e: React.SyntheticEvent<T>) => setCaret(e.currentTarget.selectionStart ?? 0),
    onBlur: () => autocomplete.dismiss(),
  };

  /** Insert text at the caret (e.g. from a picker). */
  const insertAtCaret = (text: string) => setText(value.slice(0, caret) + text + value.slice(caret), caret + text.length);

  return { value, setText, insertAtCaret, autocomplete, inputProps, ref };
}

export type EmojiAutocompleteProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  autocomplete: ShortcodeAutocomplete;
  /** Look of the popup; replaces the default shadcn surface. `className` is for placement. */
  appearance?: string;
  /** Option classes; replaces the default highlight (data-[highlighted]:bg-accent). */
  itemClassName?: string;
  /** Header above the options; receives the typed query. */
  header?: (query: string) => React.ReactNode;
  /** Header classes; replace the default. */
  headerClassName?: string;
  /** List classes (padding, height); replace the default. */
  listClassName?: string;
  /** Replace an option's contents. */
  renderItem?: (suggestion: ShortcodeAutocomplete["suggestions"][number], highlighted: boolean) => React.ReactNode;
};

/** The popup. Position it yourself (e.g. absolute, above the composer). */
const SURFACE = "rounded-lg border border-border bg-popover text-sm text-foreground shadow-lg";

export function EmojiAutocomplete({ autocomplete: ac, appearance = SURFACE, className, itemClassName, header, headerClassName, listClassName, renderItem, ...props }: EmojiAutocompleteProps) {
  if (!ac.open) return null;
  return (
    <div {...props} className={cn("overflow-hidden", appearance, className)}>
      {header ? <div className={headerClassName ?? "border-b border-border px-3 py-1.5 text-xs text-muted-foreground"}>{header(ac.query)}</div> : null}
      <ul {...ac.getListProps()} className={cn("overflow-y-auto", listClassName ?? "max-h-64 p-1")}>
        {ac.suggestions.map((s, i) => (
          <li
            key={`${s.record.unified}:${s.shortcode}`}
            {...ac.getOptionProps(i)}
            className={cn("flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5", itemClassName ?? "data-[highlighted]:bg-accent")}
          >
            {renderItem ? (
              renderItem(s, i === ac.highlightedIndex)
            ) : (
              <>
                <Emoji emoji={s.record.unified} size={20} className="text-xl leading-none" />
                <span className="font-medium">:{s.shortcode}:</span>
                <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{s.record.name}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
