import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type EmojiSelection, type Renderer } from "@brianhung/emoji-picker";
import { Code, Demo } from "../components/code";
import { EmojiPickerPopover, ShadcnEmojiPicker, ShadcnTapback } from "../components/emoji-picker";

function Picked({ selection }: { selection: EmojiSelection | null }) {
  return (
    <p className="h-5 text-xs text-muted-foreground">
      {selection ? (
        <>
          picked <span className="text-base">{selection.emoji}</span> <code>{selection.unified}</code> {selection.shortcode ? <code>{selection.shortcode}</code> : null}
        </>
      ) : (
        "nothing picked yet"
      )}
    </p>
  );
}

export function InlineAndDropdown() {
  const [inline, setInline] = React.useState<EmojiSelection | null>(null);
  const [dropdown, setDropdown] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Inline</h3>
        <Demo className="flex-col gap-3">
          <ShadcnEmojiPicker onSelect={setInline} />
          <Picked selection={inline} />
        </Demo>
        <Code>{`<EmojiPicker.Root onSelect={insert} className="h-[380px] w-[352px] rounded-xl border bg-popover">
  <EmojiPicker.Search><EmojiPicker.SkinTone /></EmojiPicker.Search>
  <EmojiPicker.Viewport>
    <EmojiPicker.List components={{ Emoji: EmojiCell }} />
    <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
  </EmojiPicker.Viewport>
</EmojiPicker.Root>`}</Code>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Dropdown</h3>
        <Demo className="min-h-[468px] flex-col items-start justify-start gap-3">
          <EmojiPickerPopover onSelect={setDropdown}>
            <span className="text-base">{dropdown?.emoji || "🙂"}</span> Add reaction
          </EmojiPickerPopover>
          <Picked selection={dropdown} />
        </Demo>
        <Code>{`<Popover>
  <PopoverTrigger asChild><Button variant="outline">🙂 Add reaction</Button></PopoverTrigger>
  <PopoverContent className="w-fit p-0">
    <EmojiPicker.Root onSelect={(e) => { insert(e.emoji); setOpen(false) }}>…</EmojiPicker.Root>
  </PopoverContent>
</Popover>`}</Code>
      </div>
    </div>
  );
}

export function TapbackVariant() {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Demo className="min-h-[468px] flex-col justify-start gap-3">
        <ShadcnTapback onSelect={setPicked} />
        <Picked selection={picked} />
      </Demo>
      <Code>{`// Top 5 by decayed frequency (iOS defaults until there's history).
// "+" expands into the full picker; picking collapses it again.
<Tapback onSelect={(e) => react(message.id, e.unified)} count={5}>
  <EmojiPicker.Search />
  <EmojiPicker.Viewport><EmojiPicker.List /></EmojiPicker.Viewport>
</Tapback>`}</Code>
    </div>
  );
}

const SAMPLE = "🥹😂❤️‍🔥🫶🏽👩🏾‍💻🇯🇵🏳️‍🌈🐙";

function RendererColumn({ renderer, title, note }: { renderer: Renderer; title: string; note: string }) {
  return (
    <EmojiProvider data={enUrl} renderer={renderer}>
      <div className="flex flex-col items-center gap-3">
        <div className="text-center">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
        <ShadcnTapback onSelect={() => {}} />
        <ShadcnEmojiPicker footer={false} className="h-[300px]" />
      </div>
    </EmojiProvider>
  );
}

export function Renderers() {
  return (
    <div className="flex flex-col gap-6">
      <Demo className="grid gap-8 md:grid-cols-2 [&>*]:min-w-0">
        <RendererColumn renderer="native" title="Native" note="System font: Apple, Google, Segoe UI" />
        <RendererColumn renderer="twemoji" title="Twemoji" note="jdecked/twemoji 17 SVGs" />
      </Demo>
      <p className="text-sm text-muted-foreground">
        Sample in your system font: <span className="text-xl">{SAMPLE}</span>. On Windows, the flags show as letters, which is why <code>renderer="auto"</code> switches to Twemoji there. It's a feature check (can this device draw 🇯🇵?), not user-agent sniffing.
      </p>
      <Code>{`<EmojiProvider data={enUrl} renderer="auto" /* "native" | "twemoji" */ twemojiBaseUrl="/twemoji/svg/">
  …
</EmojiProvider>`}</Code>
    </div>
  );
}
