import * as InteractionDataAttributes from "../../internals/InteractionDataAttributes";

/**
 * Identifies the listbox.
 * @type {'emoji-picker-list'}
 */
export const slot = "data-slot";
/**
 * Present while search results show.
 */
export const searching = "data-searching";
/**
 * How search results show, while they do.
 * @type {'ranked' | 'grouped'}
 */
export const results = "data-results";
/**
 * Present when the list has nothing to show.
 */
export const empty = "data-empty";
/**
 * The list's orientation.
 * @type {'horizontal' | 'vertical'}
 */
export const orientation = "data-orientation";
/**
 * Present while the listbox or a cell in it holds focus.
 */
export const focused = "data-focused";
/**
 * Present while the list has keyboard focus.
 */
export const focusVisible = InteractionDataAttributes.focusVisible;
