export interface EmojiObject {
  unicode: string;
  name: string;
  keywords?: string[];
}

/**
 * Converts from unified to native representation of an emoji.
 * @param unified unified representation
 */
export function unifiedToNative(unified: string) {
  const codePoints = unified.split('-').map(u => parseInt(u, 16));
  return String.fromCodePoint.apply(String, codePoints);
}

/**
 * Measures the pixel width of a scrollbar.
 * source: https://github.com/sonicdoe/measure-scrollbar.
 */
export function measureScrollbar(): number {
  if (typeof document == 'undefined') return 0;
  const div = document.createElement('div');
  div.style.cssText = "width:100px; height:100px; overflow:scroll; position:absolute; top:-9999px";
  document.body.appendChild(div);
  const scrollbarWidth = div.offsetWidth - div.clientWidth;
  document.body.removeChild(div);
  return scrollbarWidth;
}

/**
 * Calculates the number of rows when key and array are flattened, along
 * with an array of ranges to map an index back to key.
 * @param data key array mapping
 * @param perRow number of elements to chunk array into
 */
export type itemRange = { key: string; from: number; to: number; length: number }
export function calcCountAndRange(data: Record<string, any[]>, perRow: number) {
  let itemCount = 0, itemRanges: itemRange[] = [];
  Object.entries(data).forEach(([key, array]) => {
    if (array.length === 0) return;
    let from = itemCount, to = itemCount + 1 + Math.ceil(array.length / perRow);
    itemRanges.push({key, from, to, length: array.length});
    itemCount = to;
  })
  return {itemCount, itemRanges};
}

// Returns true if objects shallowly differ.
export function shallowDiffer(prev: Object, next: Object): boolean {
  for (let attribute in prev) { if (!(attribute in next)) { return true; }}
  for (let attribute in next) { if (prev[attribute] !== next[attribute]) { return true; }}
  return false;
}

// Trailing throttle function.
export function throttleIdleTask(callback: Function) {
  // @ts-ignore
  const idleHandler = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;
  let running = false, argsFunc: any;
  return function throttled(...args: any[]) {
    argsFunc = args;
    if (running) { return; }
    running = true;
    idleHandler(() => {
      running = false; 
      callback.apply(null, argsFunc);
    })
  }
}