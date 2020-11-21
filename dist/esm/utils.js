export function unifiedToNative(unified) {
    const codePoints = unified.split('-').map(u => parseInt(u, 16));
    return String.fromCodePoint.apply(String, codePoints);
}
let scrollbarWidth = -1;
export function measureScrollbar() {
    if (typeof document == 'undefined')
        return 0;
    if (scrollbarWidth !== -1)
        return scrollbarWidth;
    const div = document.createElement('div');
    div.style.cssText = "width:100px; height:100px; overflow:scroll; position:absolute; top:-9999px";
    document.body.appendChild(div);
    scrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return scrollbarWidth;
}
export function calcCountAndRange(data, perRow) {
    let itemCount = 0, itemRanges = [];
    Object.entries(data).forEach(([key, array]) => {
        if (array.length === 0)
            return;
        let from = itemCount, to = itemCount + 1 + Math.ceil(array.length / perRow);
        itemRanges.push({ key, from, to, length: array.length });
        itemCount = to;
    });
    return { itemCount, itemRanges };
}
export function shallowDiffer(prev, next) {
    for (let attribute in prev) {
        if (!(attribute in next)) {
            return true;
        }
    }
    for (let attribute in next) {
        if (prev[attribute] !== next[attribute]) {
            return true;
        }
    }
    return false;
}
export function throttleIdleTask(callback) {
    const idleHandler = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;
    let running = false;
    return function throttled(args) {
        if (running) {
            return;
        }
        running = true;
        idleHandler(() => {
            running = false;
            callback(args);
        });
    };
}
//# sourceMappingURL=utils.js.map