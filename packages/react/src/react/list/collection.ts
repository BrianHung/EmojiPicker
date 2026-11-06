import type { Collection, Key, Node } from "@react-types/shared";
import type { EmojiItem, EmojiSection } from "../state/sections";

const node = (type: string, key: Key, value: unknown, textValue: string, childNodes: Node<unknown>[] = [], parentKey: Key | null = null): Node<unknown> => ({
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

export class EmojiCollection implements Collection<Node<unknown>> {
  private readonly nodes: Node<unknown>[] = [];
  private readonly top: Node<unknown>[] = [];
  private readonly positions = new Map<Key, number>();

  constructor(sections: readonly EmojiSection[]) {
    for (const s of sections) {
      const header = s.header ? [node("header", `header:${s.id}`, s, s.name, [], s.id)] : [];
      const children = [...header, ...(s.items as unknown as readonly Node<unknown>[])];
      this.add(node("section", s.id, s, s.name, children), true);
      for (const child of children) this.add(child);
    }
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
  emoji(key: Key | null | undefined): EmojiItem | undefined {
    const n = key == null ? null : this.getItem(key);
    return n?.type === "item" ? (n as unknown as EmojiItem) : undefined;
  }
}
