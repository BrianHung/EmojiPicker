import type { Key, KeyboardDelegate } from "@react-types/shared";
import type { EmojiGridMove } from "@brianhung/emoji-picker-core/grid";
import { createGridNavigation, type NavigationSource } from "@brianhung/emoji-picker-core/grid";

export interface GridKeyboardDelegate extends KeyboardDelegate {
  move(key: Key, move: EmojiGridMove, viewport?: number): Key | null;
  getFirstKey(): Key | null;
  getLastKey(): Key | null;
}

// Core's grid navigation as React Aria's keyboard delegate
export function gridKeyboardDelegate(source: () => NavigationSource): GridKeyboardDelegate {
  const navigation = createGridNavigation(source);
  return {
    move: (key, move, viewport) => navigation.move(String(key), move, viewport),
    getKeyBelow: (key) => navigation.move(String(key), "down"),
    getKeyAbove: (key) => navigation.move(String(key), "up"),
    getKeyRightOf: (key) => navigation.move(String(key), "right"),
    getKeyLeftOf: (key) => navigation.move(String(key), "left"),
    getFirstKey: navigation.first,
    getLastKey: navigation.last,
    getKeyForSearch: (search, from) => navigation.search(search, from == null ? null : String(from)),
  };
}
