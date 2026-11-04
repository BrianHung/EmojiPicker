// Every editor × every app's ":" menu: the adapters all return one EmojiTypeahead, which any menu renders.
import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { schema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import "prosemirror-view/style/prosemirror.css";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, useEmojiTypeaheadStore, useTextFieldEmojiTypeahead } from "@brianhung/emoji-picker";
import { emojiTypeahead } from "@brianhung/emoji-picker/prosemirror";
import { useTiptapEmojiTypeahead } from "@brianhung/emoji-picker/tiptap";
import { useLexicalEmojiTypeahead } from "@brianhung/emoji-picker/lexical";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useContentEditableEmojiTypeahead } from "@/editors/contenteditable";
import { EXPERIENCES, type Experience } from "@/experiences";

const FIELD = "block min-h-[66px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-[22px] outline-none [&_p]:m-0";
const LABEL = "Message";

type EditorProps = { experience: Experience };

function Composer({ children }: { children: React.ReactNode }) {
  return <div className="relative rounded-lg border border-border bg-background focus-within:border-ring">{children}</div>;
}

function TextareaEditor({ experience: { Menu, options } }: EditorProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const emoji = useTextFieldEmojiTypeahead(ref, options);
  return (
    <Composer>
      <Menu {...emoji} />
      <textarea ref={ref} aria-label={LABEL} rows={3} className={FIELD} />
    </Composer>
  );
}

function TiptapEditor({ experience: { Menu, options } }: EditorProps) {
  const editor = useEditor({ extensions: [StarterKit], editorProps: { attributes: { "aria-label": LABEL, class: FIELD } } });
  const emoji = useTiptapEmojiTypeahead(editor, options);
  return (
    <Composer>
      <Menu {...emoji} />
      <EditorContent editor={editor} />
    </Composer>
  );
}

function LexicalMenu({ experience: { Menu, options } }: EditorProps) {
  return <Menu {...useLexicalEmojiTypeahead(options)} />;
}

function LexicalEditor({ experience }: EditorProps) {
  return (
    <LexicalComposer initialConfig={{ namespace: "editors", onError: (e) => console.error(e) }}>
      <Composer>
        <LexicalMenu experience={experience} />
        <RichTextPlugin contentEditable={<ContentEditable aria-label={LABEL} className={FIELD} />} ErrorBoundary={LexicalErrorBoundary} />
        <HistoryPlugin />
      </Composer>
    </LexicalComposer>
  );
}

function ProseMirrorEditor({ experience: { Menu, options } }: EditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { plugin, ...emoji } = useEmojiTypeaheadStore((store, extra) => emojiTypeahead(store, { ...options, ...extra }), [options]);
  React.useEffect(() => {
    const plugins = [plugin, history(), keymap({ "Mod-z": undo, "Mod-Shift-z": redo }), keymap(baseKeymap)];
    const view = new EditorView(ref.current, { state: EditorState.create({ schema, plugins }), attributes: { role: "textbox", "aria-label": LABEL, class: FIELD } });
    return () => view.destroy();
  }, [plugin]);
  return (
    <Composer>
      <Menu {...emoji} />
      <div ref={ref} />
    </Composer>
  );
}

function ContentEditableEditor({ experience: { Menu, options } }: EditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const emoji = useContentEditableEmojiTypeahead(ref, options);
  return (
    <Composer>
      <Menu {...emoji} />
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label={LABEL} className={FIELD} />
    </Composer>
  );
}

const EDITORS = [
  { id: "textarea", label: "Textarea", Editor: TextareaEditor },
  { id: "tiptap", label: "Tiptap", Editor: TiptapEditor },
  { id: "lexical", label: "Lexical", Editor: LexicalEditor },
  { id: "prosemirror", label: "ProseMirror", Editor: ProseMirrorEditor },
  { id: "contenteditable", label: "Contenteditable", Editor: ContentEditableEditor },
];

function Segmented({ label, items, value, onChange }: { label: string; items: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as string)}>
      <TabsList aria-label={label} className="max-w-full overflow-x-auto">
        {items.map((item) => (
          <TabsTrigger key={item.id} value={item.id}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function EditorsDemo() {
  const [editor, setEditor] = React.useState(EDITORS[0]!.id);
  const [experience, setExperience] = React.useState(EXPERIENCES[0]!.id);
  const { Editor } = EDITORS.find((e) => e.id === editor)!;
  const current = EXPERIENCES.find((e) => e.id === experience)!;
  return (
    <EmojiProvider data={enUrl}>
      <div className="not-prose flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Editor" items={EDITORS} value={editor} onChange={setEditor} />
          <Segmented label="Experience" items={EXPERIENCES} value={experience} onChange={setExperience} />
        </div>
        {/* Chat apps dock their menu above the composer; Notion's opens below the line. */}
        <div className={cn("flex h-[540px] flex-col rounded-xl border border-border bg-card p-4", current.below ? "justify-start" : "justify-end")}>
          <Editor key={editor} experience={current} />
          <p className="mt-2 text-sm text-muted-foreground">Type :smi, then the arrow keys, Enter or Tab, or Escape.</p>
        </div>
      </div>
    </EmojiProvider>
  );
}
