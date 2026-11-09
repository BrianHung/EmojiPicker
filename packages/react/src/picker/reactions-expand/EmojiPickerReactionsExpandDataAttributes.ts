import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies the expand button.
 * @type {'emoji-picker-reactions-expand'}
 */
export const slot = "data-slot";
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
