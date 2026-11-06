import { $getRoot, $getSelection, $insertNodes, $isRangeSelection } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import enUrl from "@brianhung/emoji-picker-data/en/iamcal.json?url";
import { EmojiProvider, useEmojiStore } from "@brianhung/emoji-picker-react";
import { $createEmojiNode, EmojiNode, EmojiShortcodePlugin, emojiAttrs } from "@/components/lexical/emoji-node";
import { EmojiTypeaheadPlugin } from "@/components/lexical/emoji-typeahead-plugin";
import { PickerPopover } from "@/components/picker-popover";

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const store = useEmojiStore();
  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <PickerPopover
        label="Insert emoji"
        triggerClassName="rounded-md px-2 py-1"
        finalFocus={() => editor.getRootElement()}
        onSelect={(s) => {
          editor.update(() => {
            const selection = $getSelection();
            const range = $isRangeSelection(selection) ? selection : $getRoot().selectEnd();
            const attrs = s.emoji ? null : emojiAttrs(store, s.unified);
            if (attrs) $insertNodes([$createEmojiNode(attrs)]);
            else range.insertText(s.emoji);
          });
        }}
      >
        <span aria-hidden>🙂</span>
        <span className="text-muted-foreground">Emoji</span>
      </PickerPopover>
    </div>
  );
}

const PLACEHOLDER_TEXT = "Type : followed by a shortcode, such as :tada or :rocket. A complete :rocket: also converts.";

function LexicalEditor() {
  return (
    <LexicalComposer initialConfig={{ namespace: "emoji-demo", nodes: [EmojiNode], onError: (e) => console.error(e) }}>
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable aria-label="Editor" className="min-h-[180px] px-4 py-3 outline-none [&_p]:my-2" />}
            placeholder={<div className="pointer-events-none absolute top-5 left-4 text-muted-foreground">{PLACEHOLDER_TEXT}</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <EmojiTypeaheadPlugin />
        <EmojiShortcodePlugin />
      </div>
    </LexicalComposer>
  );
}

export function Editor() {
  return (
    <EmojiProvider data={enUrl}>
      <LexicalEditor />
    </EmojiProvider>
  );
}
