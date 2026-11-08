import * as CommonPopupDataAttributes from "../utils/CommonPopupDataAttributes";

/**
 * Identifies the positioner.
 * @type {'emoji-picker-popover-positioner'}
 */
export const slot = "data-slot";
/**
 * Present when the popup is open.
 */
export const open = CommonPopupDataAttributes.open;
/**
 * Present when the popup is closed.
 */
export const closed = CommonPopupDataAttributes.closed;
/**
 * Indicates which side the popup is positioned relative to the anchor, after it flips.
 * @type {'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end'}
 */
export const side = CommonPopupDataAttributes.side;
/**
 * Indicates how the popup is aligned relative to the specified side.
 * @type {'start' | 'center' | 'end'}
 */
export const align = CommonPopupDataAttributes.align;
