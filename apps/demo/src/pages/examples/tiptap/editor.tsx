// The picker inside a Tiptap (ProseMirror) editor: `:shortcode` suggestions at the caret,
// and the full picker from a toolbar button.
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, useEmojiStore } from "@brianhung/emoji-picker";
import { EmojiNode, emojiAttrs } from "@/components/tiptap/emoji-node";
import { EmojiSuggestion, EmojiSuggestionMenu } from "@/components/tiptap/emoji-suggestion";
import { TEAM_EMOJI } from "@/lib/custom-emoji";
import { EmojiPickerPopover } from "@/registry/emoji-picker";

function TiptapEditor() {
  const store = useEmojiStore();
  const editor = useEditor({
    extensions: [StarterKit, EmojiSuggestion, EmojiNode.configure({ store })],
    content: "<p>Type <code>:</code> followed by a shortcode, such as <code>:tada</code> or the custom <code>:shipit</code>. Use the arrow keys to move, Enter or Tab to insert, and Escape to close. A complete <code>:shipit:</code> also converts.</p><p></p>",
    editorProps: { attributes: { class: "min-h-[180px] px-4 py-3 outline-none [&_p]:my-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-[0.9em]" } },
  });
  if (!editor) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <EmojiPickerPopover
          label="Insert emoji"
          triggerClassName="rounded-md px-2 py-1"
          onSelect={(s) => {
            const attrs = s.emoji ? null : emojiAttrs(store, s.unified);
            if (attrs) editor.chain().focus().insertEmoji(attrs).run();
            else editor.chain().focus().insertContent(s.emoji).run();
          }}
        >
          <span aria-hidden>🙂</span>
          <span className="text-muted-foreground">Emoji</span>
        </EmojiPickerPopover>
      </div>
      <EditorContent editor={editor} />
      <EmojiSuggestionMenu editor={editor} />
    </div>
  );
}

export function Editor() {
  return (
    <EmojiProvider data={enUrl} customEmojis={TEAM_EMOJI}>
      <TiptapEditor />
    </EmojiProvider>
  );
}
