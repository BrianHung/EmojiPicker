// The gallery page: a tab per app style and a grid of cards, one per pattern
// (inline picker, popovers, tapback, reactions, autocomplete, sheet, conversation).
import * as React from "react";
import { Emoji, type EmojiSelection } from "@brianhung/emoji-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock, CopyButton, cn } from "../components/code";
import { FitBox, Tabs } from "../components/docs";
import { useAutocompleteInput } from "../components/emoji-autocomplete";
import { SKINS, SkinPicker, sourceOf, type Skin } from "../examples";
import { discordAutocompleteOptions } from "../examples/discord";
import { SkinAutocomplete, SkinDropdown, SkinPills, SkinTapback, toggleReaction, type Reaction } from "../examples/variants";
import { IMessageDemo } from "./imessage";
import { SlackDemo } from "./slack";
import imessageSource from "./imessage.tsx?raw";
import slackSource from "./slack.tsx?raw";

/** One exported function from a source file, up to its closing brace. */
function extract(source: string, name: string) {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`export function ${name}`));
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && l === "}");
  return lines.slice(start, end + 1).join("\n");
}

const variants = sourceOf("variants");

function Picked({ s }: { s: EmojiSelection | null }) {
  return <span className="h-4 text-xs text-muted-foreground">{s ? `Picked ${s.emoji || s.shortcode} ${s.shortcode ?? ""}` : "Nothing picked"}</span>;
}

/** A gallery card (shadcn charts): title, one line, a live preview and its code behind "View Code". */
function GalleryCard({ title, description, code, file, children, className, previewClassName }: { title: string; description: string; code: string; file: string; children: React.ReactNode; className?: string; previewClassName?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className={cn("min-w-0 gap-0 bg-background pt-5", className)}>
      <CardHeader className="px-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight">
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription className="text-[13px]">{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn("flex min-h-[300px] flex-1 items-center justify-center p-6", previewClassName)}>{children}</CardContent>
      <CardFooter className="gap-2 border-t px-3 py-2">
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-[13px] text-muted-foreground aria-expanded:text-foreground max-sm:h-10">
          {open ? "Hide Code" : "View Code"}
        </Button>
        <span className="ml-auto truncate font-mono text-xs text-muted-foreground">{file}</span>
        <CopyButton text={code} />
      </CardFooter>
      {open ? (
        <div className="max-h-[420px] overflow-auto border-t border-border bg-code">
          <CodeBlock code={code} />
        </div>
      ) : null}
    </Card>
  );
}

function AutocompleteDemo({ skin }: { skin: Skin }) {
  const { autocomplete, inputProps } = useAutocompleteInput<HTMLInputElement>({ insert: skin.id === "apple" ? "emoji" : "shortcode", limit: 7, ...(skin.id === "discord" ? discordAutocompleteOptions : {}) });
  return (
    <div className="relative w-full max-w-[380px]">
      <SkinAutocomplete skin={skin} autocomplete={autocomplete} className="absolute inset-x-0 bottom-full mb-1.5" />
      <input
        {...inputProps}
        aria-label="Message"
        placeholder="Type :smiling or :tad"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => autocomplete.onKeyDown(e)}
      />
    </div>
  );
}

function PillsDemo({ skin }: { skin: Skin }) {
  const [reactions, setReactions] = React.useState<Reaction[]>([
    { unified: "1f389", count: 3, mine: true },
    { unified: "1f680", count: 2, mine: false },
    { unified: "2764-fe0f", count: 1, mine: false },
  ]);
  return <SkinPills skin={skin} reactions={reactions} onToggle={(u) => setReactions((r) => toggleReaction(r, u))} />;
}

function TapbackDemo({ skin }: { skin: Skin }) {
  const [last, setLast] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <SkinTapback skin={skin} onSelect={setLast} />
      <Picked s={last} />
    </div>
  );
}

function DropdownDemo({ skin, search }: { skin: Skin; search: boolean }) {
  const [last, setLast] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <SkinDropdown skin={skin} search={search} onSelect={setLast} triggerClassName="flex size-10 items-center justify-center rounded-full border border-border bg-background text-xl hover:bg-accent">
        {last?.unified ? <Emoji unified={last.unified} size={22} /> : "🙂"}
      </SkinDropdown>
      <Picked s={last} />
    </div>
  );
}

function InlineDemo({ skin }: { skin: Skin }) {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <div className="flex w-full flex-col items-center gap-3" data-skin-shot={skin.id}>
      <FitBox width={skin.size.width} height={skin.size.height}>
        <SkinPicker layout={skin.layout} onSelect={setPicked} />
      </FitBox>
      <Picked s={picked} />
    </div>
  );
}

const tabFromHash = () => {
  const id = typeof location === "undefined" ? "" : location.hash.slice(1);
  return SKINS.some((s) => s.id === id) ? id : SKINS[0]!.id;
};

export function GalleryPage() {
  const [skinId, setSkinId] = React.useState(tabFromHash);
  const skin = SKINS.find((s) => s.id === skinId)!;
  React.useEffect(() => {
    const sync = () => setSkinId(tabFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = (id: string) => {
    setSkinId(id);
    history.replaceState(null, "", `#${id}`);
  };
  const file = `examples/${skin.id}.tsx`;

  return (
    <div className="flex flex-col gap-8">
      <Tabs label="App" value={skinId} onChange={select} items={SKINS.map((s) => ({ value: s.id, label: s.label }))} />
      <p className="-mt-4 text-sm text-muted-foreground">{skin.note}</p>
      {/* Remount per skin: each card's state belongs to one app. */}
      <div key={skin.id} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GalleryCard title="Inline picker" description="A picker placed in the page." code={sourceOf(skin.id)} file={file} className="md:row-span-2" previewClassName="min-h-[560px]">
          <InlineDemo skin={skin} />
        </GalleryCard>
        <GalleryCard title="Popover" description="A picker that opens from a trigger." code={extract(variants, "SkinDropdown")} file="examples/variants.tsx">
          <DropdownDemo skin={skin} search />
        </GalleryCard>
        <GalleryCard title="Popover without search" description="A popover that omits the Search part." code={`<SkinDropdown skin={${skin.id}} search={false} onSelect={onSelect}>\n  🙂\n</SkinDropdown>\n\n${extract(variants, "SkinDropdown")}`} file="examples/variants.tsx">
          <DropdownDemo skin={skin} search={false} />
        </GalleryCard>
        <GalleryCard title="Tapback" description="The most-used emoji and an expand button." code={extract(variants, "SkinTapback")} file="examples/variants.tsx">
          <TapbackDemo skin={skin} />
        </GalleryCard>
        <GalleryCard title="Reactions" description="Reaction counts with an add button." code={extract(variants, "SkinPills")} file="examples/variants.tsx">
          <PillsDemo skin={skin} />
        </GalleryCard>
        <GalleryCard title="Autocomplete" description="Shortcode suggestions for a text field." code={extract(variants, "SkinAutocomplete")} file="examples/variants.tsx" previewClassName="items-end pt-72">
          <AutocompleteDemo skin={skin} />
        </GalleryCard>
        <GalleryCard
          title="Sheet"
          description="A picker docked at full width."
          code={`<SkinPicker layout={${skin.id}.layout} className="h-[340px] w-full rounded-none border-0 shadow-none" />`}
          file={file}
          previewClassName="items-end p-0 pt-6"
        >
          <div className="w-full max-w-[375px] overflow-hidden rounded-t-[20px] border border-b-0 border-border bg-background">
            <div className="mx-auto my-2 h-1 w-9 rounded-full bg-muted-foreground/30" />
            <SkinPicker layout={skin.layout} className="h-[340px] w-full rounded-none border-0 shadow-none" />
          </div>
        </GalleryCard>
        {skin.id === "slack" ? (
          <GalleryCard title="Conversation" description="Messages with reactions, a message toolbar and a composer with autocomplete." code={slackSource} file="sections/slack.tsx" className="md:col-span-2 xl:col-span-3" previewClassName="p-4 sm:p-8">
            <SlackDemo />
          </GalleryCard>
        ) : null}
        {skin.id === "apple" ? (
          <GalleryCard title="Conversation" description="Messages with a tapback bar and an emoji keyboard." code={imessageSource} file="sections/imessage.tsx" className="md:col-span-2 xl:col-span-3" previewClassName="p-4 sm:p-8">
            <IMessageDemo />
          </GalleryCard>
        ) : null}
      </div>
    </div>
  );
}
