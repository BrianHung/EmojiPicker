// emoji.brianhung.me/examples/tiptap/ — the picker inside a Tiptap (ProseMirror) editor:
// `:shortcode` suggestions at the caret, and the full picker from a toolbar button.
import * as React from "react";
import { createRoot } from "react-dom/client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider } from "@brianhung/emoji-picker";
import { EmojiPickerPopover } from "../../registry/emoji-picker";
import { Code } from "../../components/code";
import { PageHeader } from "../../components/copy-page";
import { SiteShell } from "../../components/site";
import { EmojiSuggestion, EmojiSuggestionMenu } from "./emoji-suggestion";
import "../../styles.css";

const USAGE = `import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EmojiProvider } from "@brianhung/emoji-picker";
import { EmojiSuggestion, EmojiSuggestionMenu } from "./emoji-suggestion";

function Editor() {
  const editor = useEditor({ extensions: [StarterKit, EmojiSuggestion] });
  return (
    <EmojiProvider data="/emoji/en.json">
      <EditorContent editor={editor} />
      {editor && <EmojiSuggestionMenu editor={editor} />}
    </EmojiProvider>
  );
}`;

const EXTENSION = `const menu = useEmojiSuggestions({
  query,
  onChoose: (s) => editor.chain().focus().deleteRange(range).insertContent(menu.textFor(s) + " ").run(),
});

Suggestion({
  editor,
  char: ":",
  render: () => ({
    onKeyDown: ({ event }) => menu.onKeyDown(event),
  }),
});

<EmojiPopover.Root open={menu.open}>
  <EmojiPopover.Content anchor={() => clientRect()}>…</EmojiPopover.Content>
</EmojiPopover.Root>`;

function Editor() {
  const editor = useEditor({
    extensions: [StarterKit, EmojiSuggestion],
    content: "<p>Type <code>:</code> followed by a shortcode, such as <code>:tada</code>. Use the arrow keys to move, Enter or Tab to insert, and Escape to close.</p><p></p>",
    editorProps: { attributes: { class: "min-h-[180px] px-4 py-3 outline-none [&_p]:my-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-[0.9em]" } },
  });
  if (!editor) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <EmojiPickerPopover label="Insert emoji" triggerClassName="rounded-md px-2 py-1" onSelect={(s) => editor.chain().focus().insertContent(s.emoji || (s.shortcode ?? "")).run()}>
          <span aria-hidden>🙂</span>
          <span className="text-muted-foreground">Emoji</span>
        </EmojiPickerPopover>
      </div>
      <EditorContent editor={editor} />
      <EmojiSuggestionMenu editor={editor} />
    </div>
  );
}

function Page() {
  return (
    <EmojiProvider data={enUrl}>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <PageHeader title="Tiptap" description="Shortcode suggestions and an emoji picker for the Tiptap editor." md="/examples/tiptap.md" />
        <div className="mt-8">
          <Editor />
        </div>
        <h2 className="mt-12 text-xl font-semibold tracking-tight">Usage</h2>
        <div className="mt-4">
          <Code title="editor.tsx">{USAGE}</Code>
        </div>
        <h2 className="mt-12 text-xl font-semibold tracking-tight">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The extension passes the query from <code>@tiptap/suggestion</code> to <code>useEmojiSuggestions</code> and positions the menu at the caret with <code>EmojiPopover</code>. Copy <code>emoji-suggestion.tsx</code> into your project.
        </p>
        <div className="mt-4">
          <Code title="emoji-suggestion.tsx (excerpt)">{EXTENSION}</Code>
        </div>
      </main>
    </EmojiProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="examples">
    <Page />
  </SiteShell>,
);
