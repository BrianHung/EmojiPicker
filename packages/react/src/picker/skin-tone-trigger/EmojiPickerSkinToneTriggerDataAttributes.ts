import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";
import * as CommonTriggerDataAttributes from "../../popover/utils/CommonTriggerDataAttributes";

/**
 * Identifies the trigger.
 * @type {'emoji-picker-skin-tone-trigger'}
 */
export const slot = "data-slot";
/**
 * Present while the options are open.
 */
export const popupOpen = CommonTriggerDataAttributes.popupOpen;
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
