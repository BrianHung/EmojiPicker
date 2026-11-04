// The render seams: components a picker accepts in place of its default markup.
// Each receives the props to spread onto its element (keep the ref); state is on
// data attributes (data-highlighted, data-focused, data-hovered, data-pressed, ...).
import type * as React from "react";

/** The emoji a cell shows. */
export type ListEmoji = {
  /** Hovered or highlighted (an animated custom emoji plays). */
  isActive: boolean;
  unified: string;
  /** Shortcodes, then the name. */
  names: string[];
  /** The native character; the id for custom emoji. */
  emoji: string;
  isCustom: boolean;
  imageUrl?: string;
  hasVariations: boolean;
};

export type EmojiCellProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  emoji: ListEmoji;
  children: React.ReactNode;
};

export type CategoryHeaderProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  category: {
    id: string;
    name: string;
    collapsed: boolean;
    /** @deprecated Headers are text inside the listbox; put controls in `components.HeaderActions`. */
    toggleCollapsed: () => void;
  };
  children: React.ReactNode;
};

/**
 * Controls for a section title (a collapse chevron, a "Customize" link). They render
 * in a layer over the list, outside the listbox, pinned with the title as it sticks.
 */
export type HeaderActionsProps = {
  section: { id: string; name: string };
  collapsed: boolean;
  toggle: () => void;
  /**
   * For the control that toggles: `aria-expanded`. No `aria-controls`: the list is virtualized, so
   * a section out of view has no element to name.
   */
  toggleProps: { "aria-expanded": boolean; "aria-controls"?: string };
};

export type CategoryButtonProps = React.HTMLAttributes<HTMLElement> & {
  category: { id: string; name: string; isActive: boolean };
};

export type ListComponents = {
  Emoji?: React.ComponentType<EmojiCellProps>;
  CategoryHeader?: React.ComponentType<CategoryHeaderProps>;
  HeaderActions?: React.ComponentType<HeaderActionsProps>;
};

/** Custom markup for parts. Spread the given props onto your element and keep its ref. */
export type PickerComponents = ListComponents & {
  CategoryButton?: React.ComponentType<CategoryButtonProps>;
};
