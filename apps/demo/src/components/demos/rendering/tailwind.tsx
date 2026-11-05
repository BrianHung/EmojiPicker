import * as React from "react";
import en from "@brianhung/emoji-picker-core/data/en.json?url";
import { EmojiOverrides, EmojiProvider, type EmojiSelection, type Renderer } from "@brianhung/emoji-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { EmojiPickerCard, EmojiTapback } from "@/components/ui/emoji-picker";
import { Label } from "@/components/ui/label";
import { Chips } from "@/components/site/chips";

const artwork = {
  "2764-fe0f": "/reactions/heart.svg",
  "1f44d": "/reactions/thumbs-up.svg",
};

export function RenderingPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [renderer, setRenderer] = React.useState<Renderer | "auto">("auto");
  const [custom, setCustom] = React.useState(true);
  const pickers = (
    <div className="flex flex-col items-center gap-4">
      <EmojiTapback onSelect={onSelect} />
      <EmojiPickerCard footer={false} onSelect={onSelect} className="h-[300px]" />
    </div>
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Chips label="Renderer" value={renderer} onChange={setRenderer} options={[["auto", "Auto"], ["native", "Native"], ["twemoji", "Twemoji"]]} />
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={custom} onCheckedChange={setCustom} />
          Custom ❤️ and 👍
        </Label>
      </div>
      <EmojiProvider data={en} renderer={renderer}>
        {custom ? <EmojiOverrides artwork={artwork}>{pickers}</EmojiOverrides> : pickers}
      </EmojiProvider>
    </>
  );
}
