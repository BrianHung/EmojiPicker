import * as React from "react";
import { $applyNodeReplacement, DecoratorNode, TextNode, type EditorConfig, type NodeKey, type SerializedLexicalNode, type Spread } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { Emoji, useEmojiStore } from "@brianhung/emoji-picker";
import type { EmojiStore } from "@brianhung/emoji-picker-core";

export type EmojiAttrs = {
  unified: string;
  shortcode: string;
  text: string | null;
};

type SerializedEmojiNode = Spread<EmojiAttrs, SerializedLexicalNode>;

export function emojiAttrs(store: EmojiStore, idOrShortcode: string): EmojiAttrs | null {
  const record = store.get(idOrShortcode) ?? store.fromShortcode(idOrShortcode);
  if (!record) return null;
  const unified = record.imageUrl ? record.unified : store.withSkinTone(record.unified);
  const text = record.imageUrl ? null : String.fromCodePoint(...unified.split("-").map((hex) => parseInt(hex, 16)));
  return { unified, shortcode: record.shortcodes[0] ?? record.unified, text };
}

export class EmojiNode extends DecoratorNode<React.JSX.Element> {
  __attrs: EmojiAttrs;

  static getType() {
    return "emoji";
  }

  static clone(node: EmojiNode) {
    return new EmojiNode(node.__attrs, node.__key);
  }

  static importJSON({ unified, shortcode, text }: SerializedEmojiNode) {
    return $createEmojiNode({ unified, shortcode, text });
  }

  constructor(attrs: EmojiAttrs, key?: NodeKey) {
    super(key);
    this.__attrs = attrs;
  }

  exportJSON(): SerializedEmojiNode {
    return { ...super.exportJSON(), ...this.__attrs, type: "emoji", version: 1 };
  }

  createDOM(_config: EditorConfig) {
    const span = document.createElement("span");
    span.className = "inline-block align-[-0.2em]";
    span.dataset.emojiNode = "";
    return span;
  }

  updateDOM() {
    return false;
  }

  isInline() {
    return true;
  }

  getTextContent() {
    return this.__attrs.text ?? `:${this.__attrs.shortcode}:`;
  }

  decorate() {
    return <Emoji emoji={this.__attrs.unified} size={20} className="inline-block size-[1.25em] leading-none" />;
  }
}

export function $createEmojiNode(attrs: EmojiAttrs) {
  return $applyNodeReplacement(new EmojiNode(attrs));
}

const SHORTCODE = /:([a-z0-9_+'-]+):/i;

export function EmojiShortcodePlugin() {
  const [editor] = useLexicalComposerContext();
  const store = useEmojiStore();
  React.useEffect(
    () =>
      editor.registerNodeTransform(TextNode, (node) => {
        if (!node.isSimpleText()) return;
        const match = SHORTCODE.exec(node.getTextContent());
        const attrs = match ? emojiAttrs(store, match[1]!) : null;
        if (!match || !attrs) return;
        const [, target] = match.index === 0 ? [null, node.splitText(match[0].length)[0]] : node.splitText(match.index, match.index + match[0].length);
        target?.replace($createEmojiNode(attrs)).selectNext();
      }),
    [editor, store],
  );
  return null;
}
