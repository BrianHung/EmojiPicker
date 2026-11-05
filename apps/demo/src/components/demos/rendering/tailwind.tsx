import * as React from "react";
import en from "@brianhung/emoji-picker-core/data/en.json?url";
import { EmojiProvider, type EmojiSelection, type ImageUrl, type Renderer } from "@brianhung/emoji-picker-react";
import { twemojiUrl, withoutTone } from "@brianhung/emoji-picker-core";
import { Checkbox } from "@/components/ui/checkbox";
import { EmojiPickerCard, EmojiTapback } from "@/components/ui/emoji-picker";
import { Label } from "@/components/ui/label";
import { Chips } from "@/components/site/chips";
import { cn } from "@/lib/utils";

const artwork: Record<string, string> = {
  "2764-fe0f": "/reactions/heart.webp",
  "1f44d": "/reactions/thumbs-up.webp",
  "1f44e": "/reactions/thumbs-down.webp",
  "1f602": "/reactions/haha.svg",
  "203c-fe0f": "/reactions/exclamation.webp",
  "2753": "/reactions/question.webp",
};

const twemoji: ImageUrl = (unified, { renderer }) => (renderer === "image" ? twemojiUrl(unified) : undefined);
const tapbacks: ImageUrl = (unified, context) => artwork[withoutTone(unified)] ?? twemoji(unified, context);

const NOTO = "https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap";
const FONTS = { system: undefined, twemoji: "[--emoji-font-family:Twemoji]", noto: "[--emoji-font-family:'Noto_Color_Emoji']" };

type Font = keyof typeof FONTS;

export function RenderingPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [renderer, setRenderer] = React.useState<Renderer | "auto">("auto");
  const [font, setFont] = React.useState<Font>("system");
  const [custom, setCustom] = React.useState(true);
  React.useEffect(() => {
    if (font === "twemoji") import("@brianhung/emoji-picker-twemoji-font/twemoji.css");
  }, [font]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Chips label="Renderer" value={renderer} onChange={setRenderer} options={[["auto", "Auto"], ["native", "Native"], ["image", "Images"]]} />
        <Chips label="Font" value={font} onChange={setFont} options={[["system", "System"], ["twemoji", "Twemoji"], ["noto", "Noto"]]} />
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={custom} onCheckedChange={setCustom} />
          Custom tapbacks
        </Label>
      </div>
      {font === "noto" && <link rel="stylesheet" href={NOTO} precedence="default" />}
      <EmojiProvider data={en} renderer={renderer} imageUrl={custom ? tapbacks : twemoji}>
        <div className="flex flex-col items-center gap-4">
          <EmojiTapback onSelect={onSelect} count={6} className={cn(FONTS[font])} />
          <EmojiPickerCard footer={false} onSelect={onSelect} className={cn("h-[300px]", FONTS[font])} />
        </div>
      </EmojiProvider>
    </>
  );
}
