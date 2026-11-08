import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies an emoji cell.
 * @type {'emoji-picker-emoji'}
 */
export const slot = "data-slot";
/**
 * The emoji's unified code.
 * @type {string}
 */
export const unified = "data-unified";
/**
 * The cell's row.
 * @type {number}
 */
export const row = "data-row";
/**
 * The cell's column.
 * @type {number}
 */
export const column = "data-column";
/**
 * The cell's index across the list.
 * @type {number}
 */
export const index = "data-index";
/**
 * Present on the cell the keyboard or pointer is on.
 */
export const highlighted = "data-highlighted";
/**
 * Present on the cell at the keyboard position, by DOM focus or the search field's aria-activedescendant.
 */
export const focused = "data-focused";
/**
 * Present on a single-value picker's selected cell.
 */
export const selected = "data-selected";
/**
 * Present on cells with skin-tone variations.
 */
export const hasVariations = "data-has-variations";
/**
 * Present on cells whose imageUrl replaces the native glyph.
 */
export const overridden = "data-overridden";
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
