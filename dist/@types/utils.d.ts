export interface EmojiObject {
    unicode: string;
    name: string;
    keywords?: string[];
}
export declare function unifiedToNative(unified: string): any;
export declare function measureScrollbar(): number;
export declare type itemRange = {
    key: string;
    from: number;
    to: number;
    length: number;
};
export declare function calcCountAndRange(data: Record<string, any[]>, perRow: number): {
    itemCount: number;
    itemRanges: itemRange[];
};
export declare function shallowDiffer(prev: Object, next: Object): boolean;
//# sourceMappingURL=utils.d.ts.map