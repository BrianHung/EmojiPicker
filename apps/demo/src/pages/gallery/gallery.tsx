// The gallery page: a tab per app style and a grid of cards, one per pattern
// (the app in context, inline picker, popovers, tapback, reactions, autocomplete, sheet).
import * as React from "react";
import { usePickedEmoji } from "@/components/site/picked";
import { Emoji, useTextFieldEmojiTypeahead } from "@brianhung/emoji-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock, CopyButton } from "@/components/site/code";
import { cn } from "@/lib/utils";
import { FitBox, Tabs } from "@/components/site/docs";
import { SCENES, STYLES, sourceOf, type Style } from "@/styles";
import { toggleReaction, type Reaction } from "@/styles/scene-kit";
import { StyleAutocomplete, StyleDropdown, StylePills, StyleTapback } from "@/styles/variants";
import variants from "@/styles/variants.tsx?raw";
import { discordEmojiOptions } from "@/experiences/discord";

/** One exported function from a source file, up to its closing brace. */
function extract(source: string, name: string) {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`export function ${name}`));
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && l === "}");
  return lines.slice(start, end + 1).join("\n");
}

/** A gallery card (shadcn charts): title, one line, a live preview and its code behind "View Code". */
function GalleryCard({
  title,
  description,
  code,
  file,
  children,
  className,
  previewClassName,
}: {
  title?: string;
  description?: string;
  code: string;
  file: string;
  children: React.ReactNode;
  className?: string;
  previewClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className={cn("min-w-0 gap-0 bg-background", title ? "pt-5" : "pt-0", className)}>
      {title ? (
        <CardHeader className="px-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription className="text-[13px]">{description}</CardDescription>
        </CardHeader>
      ) : null}
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

/** The card starts mid-shortcode, so its `:` menu shows without typing. */
const DRAFT = ":smi";

function AutocompleteDemo({ appStyle }: { appStyle: Style }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const emoji = useTextFieldEmojiTypeahead(ref, { insert: appStyle.id === "apple" ? "emoji" : "shortcode", limit: 7, ...(appStyle.id === "discord" ? discordEmojiOptions : {}) });
  return (
    <div className="relative w-full max-w-[380px]">
      <StyleAutocomplete appStyle={appStyle} {...emoji} className="absolute inset-x-0 bottom-full mb-1.5" />
      <input
        ref={ref}
        aria-label="Message"
        defaultValue={DRAFT}
        placeholder="Type :smiling or :tad"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function PillsDemo({ appStyle }: { appStyle: Style }) {
  const [reactions, setReactions] = React.useState<Reaction[]>([
    { unified: "1f389", count: 3, mine: true },
    { unified: "1f680", count: 2, mine: false },
    { unified: "2764-fe0f", count: 1, mine: false },
  ]);
  return <StylePills appStyle={appStyle} reactions={reactions} onToggle={(u) => setReactions((r) => toggleReaction(r, u))} />;
}

function TapbackDemo({ appStyle }: { appStyle: Style }) {
  const [, setLast] = usePickedEmoji();
  return (
    <div className="flex flex-col items-center gap-3">
      <StyleTapback appStyle={appStyle} onSelect={setLast} />
    </div>
  );
}

function DropdownDemo({ appStyle, search }: { appStyle: Style; search: boolean }) {
  const [last, setLast] = usePickedEmoji();
  return (
    <div className="flex flex-col items-center gap-3">
      <StyleDropdown appStyle={appStyle} search={search} onSelect={setLast} triggerClassName="flex size-10 items-center justify-center rounded-full border border-border bg-background text-xl hover:bg-accent">
        {last?.unified ? <Emoji emoji={last.unified} size={22} /> : "🙂"}
      </StyleDropdown>
    </div>
  );
}

function InlineDemo({ appStyle }: { appStyle: Style }) {
  const [, setPicked] = usePickedEmoji();
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <FitBox width={appStyle.size.width} height={appStyle.size.height}>
        <appStyle.Picker onSelect={setPicked} />
      </FitBox>
    </div>
  );
}

const tabFromHash = () => {
  const id = typeof location === "undefined" ? "" : location.hash.slice(1);
  return STYLES.some((s) => s.id === id) ? id : STYLES[0]!.id;
};

export function GalleryPage() {
  const [styleId, setStyleId] = React.useState(tabFromHash);
  const appStyle = STYLES.find((s) => s.id === styleId)!;
  React.useEffect(() => {
    const sync = () => setStyleId(tabFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = (id: string) => {
    setStyleId(id);
    history.replaceState(null, "", `#${id}`);
  };
  const file = `styles/${appStyle.id}/picker.tsx`;
  const Scene = SCENES[appStyle.id]!;

  return (
    <div className="flex flex-col gap-8">
      <Tabs label="App" value={styleId} onChange={select} items={STYLES.map((s) => ({ value: s.id, label: s.label }))} />
      {/* Remount per style: each card's state belongs to one app. */}
      <div key={appStyle.id} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* On a phone the app scenes fill the card (they are the phone's screen); Apple's is a device mockup. */}
        <GalleryCard
          code={sourceOf(appStyle.id, "scene")}
          file={`styles/${appStyle.id}/scene.tsx`}
          className="overflow-hidden md:col-span-2 xl:col-span-3"
          previewClassName={cn("overflow-x-auto sm:p-8", appStyle.id === "apple" ? "p-4" : "p-0")}
        >
          <Scene />
        </GalleryCard>
        <GalleryCard title="Inline picker" description="A picker placed in the page." code={sourceOf(appStyle.id, "picker")} file={file} className="md:row-span-2" previewClassName="md:min-h-[560px]">
          <InlineDemo appStyle={appStyle} />
        </GalleryCard>
        <GalleryCard title="Popover" description="A picker that opens from a trigger." code={extract(variants, "StyleDropdown")} file="styles/variants.tsx">
          <DropdownDemo appStyle={appStyle} search />
        </GalleryCard>
        <GalleryCard
          title="Popover without search"
          description="A popover that omits the Search part."
          code={`<StyleDropdown appStyle={${appStyle.id}} search={false} onSelect={onSelect}>\n  🙂\n</StyleDropdown>\n\n${extract(variants, "StyleDropdown")}`}
          file="styles/variants.tsx"
        >
          <DropdownDemo appStyle={appStyle} search={false} />
        </GalleryCard>
        <GalleryCard title="Tapback" description="The most-used emoji and an expand button." code={extract(variants, "StyleTapback")} file="styles/variants.tsx">
          <TapbackDemo appStyle={appStyle} />
        </GalleryCard>
        <GalleryCard title="Reactions" description="Reaction counts with an add button." code={extract(variants, "StylePills")} file="styles/variants.tsx">
          <PillsDemo appStyle={appStyle} />
        </GalleryCard>
        <GalleryCard title="Autocomplete" description="Shortcode suggestions for a text field." code={extract(variants, "StyleAutocomplete")} file="styles/variants.tsx" previewClassName="items-end pt-72">
          <AutocompleteDemo appStyle={appStyle} />
        </GalleryCard>
        <GalleryCard title="Sheet" description="A picker docked at full width." code={`<${appStyle.label}Picker className="h-[340px] w-full rounded-none border-0 shadow-none" />`} file={file} previewClassName="items-end p-0 pt-6">
          {/* The sheet keeps the app's own width (Discord needs ~420px for its rail and "Add Emoji") and scales down to the card. */}
          <FitBox width={appStyle.size.width} height={361} className="items-end">
            <div className="overflow-hidden rounded-t-[20px] border border-b-0 border-border bg-background" style={{ width: appStyle.size.width }}>
              <div className="mx-auto my-2 h-1 w-9 rounded-full bg-muted-foreground/30" />
              <appStyle.Picker className="h-[340px] w-full rounded-none border-0 shadow-none" />
            </div>
          </FitBox>
        </GalleryCard>
      </div>
    </div>
  );
}
