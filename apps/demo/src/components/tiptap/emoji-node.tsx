import { InputRule, Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, type NodeViewProps } from "@tiptap/react";
import { Emoji, type EmojiStore } from "emoji-components";

export type EmojiNodeAttrs = {
  unified: string;
  shortcode: string;
  text: string | null;
};

export type EmojiNodeOptions = {
  store: EmojiStore | null;
};

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    emoji: { insertEmoji: (attrs: EmojiNodeAttrs) => ReturnType };
  }
}

export function emojiAttrs(store: EmojiStore, idOrShortcode: string): EmojiNodeAttrs | null {
  const record = store.get(idOrShortcode) ?? store.fromShortcode(idOrShortcode);
  if (!record) return null;
  const unified = record.imageUrl ? record.unified : store.withSkinTone(record.unified);
  const text = record.imageUrl ? null : String.fromCodePoint(...unified.split("-").map((hex) => parseInt(hex, 16)));
  return { unified, shortcode: record.shortcodes[0] ?? record.unified, text };
}

export const emojiContent = (attrs: EmojiNodeAttrs) => [
  { type: "emoji", attrs },
  { type: "text", text: " " },
];

function EmojiView({ node }: NodeViewProps) {
  const { unified } = node.attrs as EmojiNodeAttrs;
  return (
    <NodeViewWrapper as="span" className="inline-block align-[-0.2em]" data-emoji-node="">
      <Emoji emoji={unified} size={20} className="inline-block size-[1.25em] leading-none" />
    </NodeViewWrapper>
  );
}

export const EmojiNode = Node.create<EmojiNodeOptions>({
  name: "emoji",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  addOptions: () => ({ store: null }),

  addAttributes: () => ({
    unified: { default: null, parseHTML: (el) => el.getAttribute("data-unified") },
    shortcode: { default: null, parseHTML: (el) => el.getAttribute("data-shortcode") },
    text: { default: null, parseHTML: (el) => el.getAttribute("data-text") },
  }),

  parseHTML: () => [{ tag: "span[data-emoji-node]" }],

  renderHTML({ node, HTMLAttributes }) {
    const { unified, shortcode, text } = node.attrs as EmojiNodeAttrs;
    return ["span", mergeAttributes(HTMLAttributes, { "data-emoji-node": "", "data-unified": unified, "data-shortcode": shortcode, "data-text": text }), text ?? `:${shortcode}:`];
  },

  renderText: ({ node }) => {
    const { shortcode, text } = node.attrs as EmojiNodeAttrs;
    return text ?? `:${shortcode}:`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmojiView, { as: "span" });
  },

  addCommands() {
    return {
      insertEmoji:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent(emojiContent(attrs)),
    };
  },

  addInputRules() {
    const { store } = this.options;
    return [
      new InputRule({
        find: /:([a-z0-9_+'-]+):$/i,
        handler: ({ state, range, match }) => {
          const attrs = store ? emojiAttrs(store, match[1]!) : null;
          if (!attrs) return null;
          state.tr.replaceWith(range.from, range.to, this.type.create(attrs));
        },
      }),
    ];
  },
});
