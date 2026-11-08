import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";
import * as CommonTriggerDataAttributes from "../utils/CommonTriggerDataAttributes";

/**
 * Identifies the trigger.
 * @type {'emoji-picker-popover-trigger'}
 */
export const slot = "data-slot";
/**
 * Present when the popover is open.
 */
export const popupOpen = CommonTriggerDataAttributes.popupOpen;
/**
 * Present while the trigger is pressed.
 */
export const pressed = InteractionDataAttributes.pressed;
/**
 * Present while the pointer is over the trigger (never on touch).
 */
export const hovered = InteractionDataAttributes.hovered;
/**
 * Present while the trigger has keyboard focus.
 */
export const focusVisible = InteractionDataAttributes.focusVisible;
/**
 * Present when the trigger is disabled.
 */
export const disabled = InteractionDataAttributes.disabled;
