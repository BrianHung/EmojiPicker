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
const NOTO_FONT = "[--emoji-font-family:'Noto_Color_Emoji']";

type Choice = Renderer | "auto" | "noto";

export function RenderingPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [choice, setChoice] = React.useState<Choice>("auto");
  const noto = choice === "noto";
  const [custom, setCustom] = React.useState(true);
  const pickers = (
    <div className="flex flex-col items-center gap-4">
      <EmojiTapback onSelect={onSelect} count={6} className={cn(noto && NOTO_FONT)} />
      <EmojiPickerCard footer={false} onSelect={onSelect} className={cn("h-[300px]", noto && NOTO_FONT)} />
    </div>
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Chips label="Renderer" value={choice} onChange={setChoice} options={[["auto", "Auto"], ["native", "Native"], ["image", "Twemoji"], ["noto", "Noto"]]} />
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={custom} onCheckedChange={setCustom} />
          Custom tapbacks
        </Label>
      </div>
      {noto && <link rel="stylesheet" href={NOTO} precedence="default" />}
      <EmojiProvider data={en} renderer={noto ? "native" : choice} imageUrl={custom ? tapbacks : twemoji}>
        {pickers}
      </EmojiProvider>
    </>
  );
}
