// The page hero: one preview card with app tabs (like shadcn's "Base UI / Radix UI"
// tabs), the app's picker live, and that app's file under it, collapsed. After a
// switch, the code can show as a diff against the previous app.
import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type Renderer } from "@brianhung/emoji-picker";
import { CodeBlock, CopyButton } from "../components/code";
import { Collapsible, FitBox, Tabs, useIsDark } from "../components/docs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SkinPicker, skinById, sourceOf, type Skin } from "../examples";
import { TEAM_EMOJI } from "../lib/custom-emoji";
import { IMessageDemo } from "./imessage";

const DiffView = React.lazy(() => import("../components/diff-view"));

export type AppId = "imessage" | "slack" | "discord" | "linear" | "notion" | "instagram";

type App = { id: AppId; label: string; file: string; source: string; note: string; skin?: Skin };

export const APPS: App[] = [
  { id: "imessage", label: "iMessage", file: "examples/apple.tsx", source: sourceOf("apple"), note: "Long-press or double-click a message to open the tapback bar.", skin: skinById("apple") },
  { id: "slack", label: "Slack", file: "examples/slack.tsx", source: sourceOf("slack"), note: skinById("slack").note, skin: skinById("slack") },
  { id: "discord", label: "Discord", file: "examples/discord.tsx", source: sourceOf("discord"), note: skinById("discord").note, skin: skinById("discord") },
  { id: "linear", label: "Linear", file: "examples/linear.tsx", source: sourceOf("linear"), note: skinById("linear").note, skin: skinById("linear") },
  { id: "notion", label: "Notion", file: "examples/notion.tsx", source: sourceOf("notion"), note: skinById("notion").note, skin: skinById("notion") },
  { id: "instagram", label: "Instagram", file: "examples/instagram.tsx", source: sourceOf("instagram"), note: skinById("instagram").note, skin: skinById("instagram") },
];

const appById = (id: AppId) => APPS.find((a) => a.id === id)!;

/** One app's live picker, sized to fit its card. */
export function AppPreview({ id, renderer, maxHeight }: { id: AppId; renderer: Renderer | "auto"; maxHeight?: number }) {
  const skin = appById(id).skin!;
  return (
    <EmojiProvider key={renderer} data={enUrl} renderer={skin.renderer ?? renderer} customEmojis={TEAM_EMOJI}>
      <FitBox width={skin.size.width} height={skin.size.height} maxHeight={maxHeight}>
        <SkinPicker layout={skin.layout} />
      </FitBox>
    </EmojiProvider>
  );
}

export function Hero({ renderer }: { renderer: Renderer | "auto" }) {
  const [app, setApp] = React.useState<AppId>("imessage");
  const [previous, setPrevious] = React.useState<AppId | null>(null);
  const [diff, setDiff] = React.useState(false);
  const dark = useIsDark();
  const current = appById(app);
  const before = previous ? appById(previous) : null;
  const showDiff = diff && before !== null;

  const select = (next: AppId) => {
    if (next === app) return;
    setPrevious(app);
    setApp(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs label="App" value={app} onChange={select} items={APPS.map((a) => ({ value: a.id, label: a.label }))} />
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex min-h-[460px] flex-col items-center justify-center gap-4 px-4 py-8 sm:min-h-[580px] sm:px-10 sm:py-10">
          {app === "imessage" ? <IMessageDemo /> : <AppPreview key={app} id={app} renderer={renderer} />}
        </div>
        <p className="border-t border-border px-4 py-3 text-center text-[13px] text-muted-foreground">{current.note}</p>
        <div className="border-t border-border bg-code">
          <div className="flex h-10 items-center gap-2 pr-1.5 pl-4">
            <span className="truncate font-mono text-[12.5px] text-muted-foreground">{showDiff ? `${before.file} → ${current.file}` : current.file}</span>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {before ? (
                <ToggleGroup aria-label="Code view" variant="outline" size="sm" spacing={0} value={[diff ? "diff" : "code"]} onValueChange={(v) => v[0] && setDiff(v[0] === "diff")} className="bg-background">
                  <ToggleGroupItem value="code" className="text-xs max-sm:h-10">
                    Code
                  </ToggleGroupItem>
                  <ToggleGroupItem value="diff" className="text-xs whitespace-nowrap max-sm:h-10">
                    Diff vs {before.label}
                  </ToggleGroupItem>
                </ToggleGroup>
              ) : null}
              <CopyButton text={current.source} />
            </div>
          </div>
          <div className="border-t border-border">
            <Collapsible lines={current.source.split("\n").length} collapse={7} resetKey={`${app}:${showDiff}`}>
              {showDiff ? (
                <React.Suspense fallback={<CodeBlock code={current.source} />}>
                  <DiffView dark={dark} oldFile={{ name: before.file, contents: before.source }} newFile={{ name: current.file, contents: current.source }} />
                </React.Suspense>
              ) : (
                <CodeBlock code={current.source} />
              )}
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
