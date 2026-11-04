// The List's React Aria collection, built from its sections without rendering them:
// items are the shared EmojiItem objects, so a collection is its sections, their
// titles, and an index of keys.
import type { Collection, Key, Node } from "@react-types/shared";
import type { EmojiItem, EmojiSection } from "./sections";

type BaseNode = Omit<Node<unknown>, "childNodes" | "value"> & { childNodes: Iterable<Node<unknown>>; value: unknown };

const node = (type: string, key: Key, value: unknown, textValue: string, childNodes: Node<unknown>[] = [], parentKey: Key | null = null): BaseNode => ({
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

export const headerKey = (section: string) => `header:${section}`;
export const LOADER_KEY = "loader";

export class EmojiCollection implements Collection<Node<unknown>> {
  private readonly nodes: Node<unknown>[] = [];
  private readonly top: Node<unknown>[] = [];
  private readonly positions = new Map<Key, number>();
  /** Options in the list (sections and titles aside). */
  readonly itemCount: number;

  constructor(sections: readonly EmojiSection[], loader = false) {
    let items = 0;
    for (const s of sections) {
      const header = s.header ? [node("header", headerKey(s.id), s, s.name, [], s.id) as Node<unknown>] : [];
      const children = [...header, ...(s.items as readonly Node<unknown>[] as Node<unknown>[])];
      this.add(node("section", s.id, s, s.name, children) as Node<unknown>, true);
      for (const child of children) this.add(child);
      items += s.items.length;
    }
    if (loader) this.add(node("loader", LOADER_KEY, null, "") as Node<unknown>, true);
    this.itemCount = items;
  }

  private add(n: Node<unknown>, top = false) {
    this.positions.set(n.key, this.nodes.length);
    this.nodes.push(n);
    if (top) this.top.push(n);
  }

  get size() {
    return this.nodes.length;
  }
  *[Symbol.iterator]() {
    yield* this.top;
  }
  getKeys() {
    return this.nodes.map((n) => n.key);
  }
  getItem(key: Key) {
    const i = this.positions.get(key);
    return i == null ? null : this.nodes[i]!;
  }
  at(index: number) {
    return this.nodes[index] ?? null;
  }
  getKeyBefore(key: Key) {
    const i = this.positions.get(key);
    return i ? this.nodes[i - 1]!.key : null;
  }
  getKeyAfter(key: Key) {
    const i = this.positions.get(key);
    return i == null ? null : (this.nodes[i + 1]?.key ?? null);
  }
  getFirstKey() {
    return this.nodes[0]?.key ?? null;
  }
  getLastKey() {
    return this.nodes[this.nodes.length - 1]?.key ?? null;
  }
  getChildren(key: Key): Iterable<Node<unknown>> {
    return this.getItem(key)?.childNodes ?? [];
  }
  getTextValue(key: Key) {
    return this.getItem(key)?.textValue ?? "";
  }
  /** The emoji item for a key, or undefined for a section, title or loader. */
  emoji(key: Key | null | undefined): EmojiItem | undefined {
    const n = key == null ? null : this.getItem(key);
    return n?.type === "item" ? (n as unknown as EmojiItem) : undefined;
  }
}
