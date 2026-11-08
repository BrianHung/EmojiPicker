import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies an option.
 * @type {'emoji-picker-skin-tone-option'}
 */
export const slot = "data-slot";
/**
 * Present on the current tone.
 */
export const selected = "data-selected";
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
