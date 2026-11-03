// emoji.brianhung.me/examples/lexical/ — the picker inside a Lexical editor.
import * as React from "react";
import { createRoot } from "react-dom/client";
import { $getSelection, $isRangeSelection } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider } from "@brianhung/emoji-picker";
import { EmojiPickerPopover } from "../../registry/emoji-picker";
import { Code } from "../../components/code";
import { PageHeader } from "../../components/copy-page";
import { SiteShell } from "../../components/site";
import { EmojiTypeaheadPlugin } from "./emoji-typeahead-plugin";
import "../../styles.css";

const USAGE = `import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { EmojiProvider } from "@brianhung/emoji-picker";
import { EmojiTypeaheadPlugin } from "./emoji-typeahead-plugin";

export function Editor() {
  return (
    <EmojiProvider data="/emoji/en.json">
      <LexicalComposer initialConfig={{ namespace: "editor", onError: console.error }}>
        <RichTextPlugin contentEditable={<ContentEditable />} ErrorBoundary={LexicalErrorBoundary} />
        <EmojiTypeaheadPlugin />
      </LexicalComposer>
    </EmojiProvider>
  );
}`;

const PLUGIN = `const menu = useEmojiSuggestions({ query });
const options = menu.suggestions.map((s, i) => new EmojiOption(s, i));

<LexicalTypeaheadMenuPlugin
  onQueryChange={setQuery}
  options={options}
  triggerFn={useBasicTypeaheadTriggerMatch(":", { minLength: 1 })}
  onSelectOption={(option, node, close) => {
    editor.update(() => {
      node?.replace($createTextNode(menu.textFor(option.suggestion) + " "));
      close();
    });
  }}
  menuRenderFn={…}
/>`;

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <EmojiPickerPopover
        label="Insert emoji"
        triggerClassName="rounded-md px-2 py-1"
        onSelect={(s) => {
          editor.focus();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) selection.insertText(s.emoji || (s.shortcode ?? ""));
          });
        }}
      >
        <span aria-hidden>🙂</span>
        <span className="text-muted-foreground">Emoji</span>
      </EmojiPickerPopover>
    </div>
  );
}

const PLACEHOLDER_TEXT = "Type : followed by a shortcode, such as :tada.";

function Editor() {
  return (
    <LexicalComposer initialConfig={{ namespace: "emoji-demo", onError: (e) => console.error(e) }}>
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
      </div>
    </LexicalComposer>
  );
}

function Page() {
  return (
    <EmojiProvider data={enUrl}>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <PageHeader title="Lexical" description="Shortcode suggestions and an emoji picker for the Lexical editor." md="/examples/lexical.md" />
        <div className="mt-8">
          <Editor />
        </div>
        <h2 className="mt-12 text-xl font-semibold tracking-tight">Usage</h2>
        <div className="mt-4">
          <Code title="editor.tsx">{USAGE}</Code>
        </div>
        <h2 className="mt-12 text-xl font-semibold tracking-tight">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Lexical's typeahead menu handles the trigger, caret position and keyboard. <code>useEmojiSuggestions</code> supplies the ranked options and the text to insert. Copy <code>emoji-typeahead-plugin.tsx</code> into your project.
        </p>
        <div className="mt-4">
          <Code title="emoji-typeahead-plugin.tsx (excerpt)">{PLUGIN}</Code>
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
