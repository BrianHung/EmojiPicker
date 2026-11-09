import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies a variation.
 * @type {'emoji-picker-list-variations-option'}
 */
export const slot = "data-slot";
/**
 * The variation's unified code.
 * @type {string}
 */
export const unified = "data-unified";
/**
 * Present on the variation the keyboard or pointer is on.
 */
export const highlighted = "data-highlighted";
/**
 * Present on the current tone.
 */
export const selected = "data-selected";
/**
 * Present while the pointer is over it (never on touch).
 */
export const hovered = InteractionDataAttributes.hovered;
/**
 * Present while it has keyboard focus.
 */
export const focusVisible = InteractionDataAttributes.focusVisible;
