// The page hero: one preview card with app tabs (like shadcn's "Base UI / Radix UI"
// tabs), the app's picker live, and that app's file under it, collapsed.
import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type Renderer } from "@brianhung/emoji-picker";
import { CodeBlock, CopyButton } from "@/components/site/code";
import { useRenderer } from "@/components/site/shell";
import { Collapsible, FitBox, Tabs } from "@/components/site/docs";
import { STYLES, StylePicker, sourceOf, styleById, type Style } from "@/styles";
import { AppleScene } from "@/styles/apple/scene";

/** One style's live picker, sized to fit its card. */
function StylePreview({ appStyle, renderer }: { appStyle: Style; renderer: Renderer | "auto" }) {
  return (
    <EmojiProvider key={renderer} data={enUrl} renderer={appStyle.renderer ?? renderer}>
      <FitBox width={appStyle.size.width} height={appStyle.size.height}>
        <StylePicker layout={appStyle.layout} />
      </FitBox>
    </EmojiProvider>
  );
}

export function Hero() {
  const renderer = useRenderer();
  const [id, setId] = React.useState("apple");
  const appStyle = styleById(id);
  const source = React.useMemo(() => sourceOf(id, "picker"), [id]);

  return (
    <div className="flex flex-col gap-4">
      <Tabs label="App" value={id} onChange={setId} items={STYLES.map((s) => ({ value: s.id, label: s.label }))} />
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex min-h-[460px] flex-col items-center justify-center gap-4 px-4 py-8 sm:min-h-[580px] sm:px-10 sm:py-10">
          {id === "apple" ? <AppleScene /> : <StylePreview key={id} appStyle={appStyle} renderer={renderer} />}
        </div>
        <div className="border-t border-border bg-code">
          <div className="flex h-10 items-center gap-2 pr-1.5 pl-4">
            <span className="truncate font-mono text-[12.5px] text-muted-foreground">styles/{id}/picker.tsx</span>
            <CopyButton text={source} className="ml-auto" />
          </div>
          <div className="border-t border-border">
            <Collapsible lines={source.split("\n").length} collapse={7} resetKey={id}>
              <CodeBlock code={source} />
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
