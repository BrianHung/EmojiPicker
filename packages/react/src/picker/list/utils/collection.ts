import type { Collection, Key, Node } from "@react-types/shared";
import type { EmojiItem, EmojiSection } from "@emoji-components/core";

export type CollectionValue = EmojiSection | EmojiItem;
export type CollectionNode = Node<CollectionValue>;

export const isSection = (value: CollectionValue | null): value is EmojiSection => value != null && "items" in value;

const node = (type: "section" | "header" | "item", key: Key, value: CollectionValue, textValue: string, childNodes: CollectionNode[] = [], parentKey: Key | null = null): CollectionNode => ({
  type,
  key,
  value,
  textValue,
  level: parentKey == null ? 0 : 1,
  index: -1,
  hasChildNodes: childNodes.length > 0,
  childNodes,
  rendered: null,
  parentKey,
});

// Items keep their node across collections, so the virtualizer reuses its views
const itemNodes = new WeakMap<EmojiItem, CollectionNode>();
const itemNode = (item: EmojiItem) => {
  const hit = itemNodes.get(item);
  if (hit) return hit;
  const created = node("item", item.id, item, item.label, [], item.section);
  itemNodes.set(item, created);
  return created;
};

// React Aria's collection over the picker's sections: a section, its title, then its items
export class EmojiCollection implements Collection<CollectionNode> {
  readonly #nodes: CollectionNode[] = [];
  readonly #top: CollectionNode[] = [];
  readonly #positions = new Map<Key, number>();
  readonly #items = new Map<Key, EmojiItem>();
  readonly #sections: EmojiSection[] = [];

  constructor(sections: readonly EmojiSection[]) {
    for (const s of sections) {
      const header = s.header ? [node("header", `header:${s.id}`, s, s.name, [], s.id)] : [];
      const children = [...header, ...s.items.map(itemNode)];
      this.#sections.push(s);
      this.#add(node("section", s.id, s, s.name, children), true);
      for (const child of children) this.#add(child);
      for (const item of s.items) this.#items.set(item.id, item);
    }
  }

  #add(n: CollectionNode, top = false) {
    this.#positions.set(n.key, this.#nodes.length);
    this.#nodes.push(n);
    if (top) this.#top.push(n);
  }

  get size() {
    return this.#nodes.length;
  }
  *[Symbol.iterator]() {
    yield* this.#top;
  }
  getKeys() {
    return this.#nodes.map((n) => n.key);
  }
  getItem(key: Key) {
    const i = this.#positions.get(key);
    return i == null ? null : this.#nodes[i]!;
  }
  at(index: number) {
    return this.#nodes[index] ?? null;
  }
  getKeyBefore(key: Key) {
    const i = this.#positions.get(key);
    return i ? this.#nodes[i - 1]!.key : null;
  }
  getKeyAfter(key: Key) {
    const i = this.#positions.get(key);
    return i == null ? null : (this.#nodes[i + 1]?.key ?? null);
  }
  getFirstKey() {
    return this.#nodes[0]?.key ?? null;
  }
  getLastKey() {
    return this.#nodes[this.#nodes.length - 1]?.key ?? null;
  }
  getChildren(key: Key): Iterable<CollectionNode> {
    return this.getItem(key)?.childNodes ?? [];
  }
  getTextValue(key: Key) {
    return this.getItem(key)?.textValue ?? "";
  }
  emoji(key: Key | null | undefined): EmojiItem | undefined {
    return key == null ? undefined : this.#items.get(key);
  }
  sections(): readonly EmojiSection[] {
    return this.#sections;
  }
}
