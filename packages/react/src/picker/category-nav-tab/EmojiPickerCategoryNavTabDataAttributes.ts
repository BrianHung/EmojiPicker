import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies a category tab.
 * @type {'emoji-picker-category-nav-tab'}
 */
export const slot = "data-slot";
/**
 * Present on the tab for the section in view.
 */
export const active = "data-active";
/**
 * Present while search results show.
 */
export const disabled = InteractionDataAttributes.disabled;
/**
 * Present while the tab holds focus.
 */
export const focused = "data-focused";
/**
 * Present while it is pressed.
 */
export const pressed = InteractionDataAttributes.pressed;
/**
 * Present while the pointer is over it (never on touch).
 */
export const hovered = InteractionDataAttributes.hovered;
/**
 * Present while it has keyboard focus.
 */
export const focusVisible = InteractionDataAttributes.focusVisible;
