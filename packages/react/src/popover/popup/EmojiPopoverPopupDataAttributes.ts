import * as CommonPopupDataAttributes from "../utils/CommonPopupDataAttributes";

/**
 * Identifies the popup.
 * @type {'emoji-popover-popup'}
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
 * Present when the popup begins animating in.
 */
export const startingStyle = CommonPopupDataAttributes.startingStyle;
/**
 * Present when the popup is animating out.
 */
export const endingStyle = CommonPopupDataAttributes.endingStyle;
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
