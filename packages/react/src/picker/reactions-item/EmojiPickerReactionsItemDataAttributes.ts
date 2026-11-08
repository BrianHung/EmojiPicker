import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies a reaction.
 * @type {'emoji-picker-emoji'}
 */
export const slot = "data-slot";
/**
 * The emoji's unified code.
 * @type {string}
 */
export const unified = "data-unified";
/**
 * Present on a pressed reaction, when the row has a value.
 */
export const selected = "data-selected";
/**
 * Present when imageUrl replaces the native glyph.
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
