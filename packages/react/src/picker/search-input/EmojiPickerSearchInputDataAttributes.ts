import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies the search input.
 * @type {'emoji-picker-search-input'}
 */
export const slot = "data-slot";
/**
 * Present while the input holds focus.
 */
export const focused = "data-focused";
/**
 * Present while it has keyboard focus.
 */
export const focusVisible = InteractionDataAttributes.focusVisible;
/**
 * Present while the pointer is over it (never on touch).
 */
export const hovered = InteractionDataAttributes.hovered;
