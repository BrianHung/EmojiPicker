import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, type CategoryOption, type CustomEmoji } from "@brianhung/emoji-picker";
import { usePickedEmoji } from "@/components/site/picked";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BUFO_PACK_URL, loadPack, usePack } from "@/lib/packs";
import { EmojiPickerCard } from "@/registry/emoji-picker";

const STANDARD: CategoryOption[] = [{ id: "smileys_people" }, { id: "animals_nature" }, { id: "food_drink" }, { id: "travel_places" }, { id: "activities" }, { id: "objects" }, { id: "symbols" }, { id: "flags" }];

type Pack = { key: string; label: string; emoji: CustomEmoji[] };
type Status = { pending?: boolean; error?: string; count?: number };
type PacksContext = { bufo: CustomEmoji[] | null; extra: Pack[]; status: Status; addPack: (url: string) => void; pickerRef: React.RefObject<HTMLDivElement | null> };

const Context = React.createContext<PacksContext | null>(null);
const usePacks = () => React.use(Context)!;

export function Packs({ children }: { children: React.ReactNode }) {
  const bufo = usePack(BUFO_PACK_URL);
  const [extra, setExtra] = React.useState<Pack[]>([]);
  const [status, setStatus] = React.useState<Status>({});
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const addPack = async (url: string) => {
    const reveal = () => pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (extra.some((p) => p.key === url)) return reveal();
    setStatus({ pending: true });
    try {
      const emoji = await loadPack(url);
      setExtra((list) => [...list, { key: url, label: new URL(url, location.href).hostname || "Pack", emoji }]);
      setStatus({ count: emoji.length });
      reveal();
    } catch (err) {
      setStatus({ error: err instanceof Error ? err.message : String(err) });
    }
  };

  return <Context value={{ bufo, extra, status, addPack, pickerRef }}>{children}</Context>;
}

export function BufoPicker() {
  const { bufo, extra, pickerRef } = usePacks();
  const [, setPicked] = usePickedEmoji();
  const packs = React.useMemo<Pack[]>(() => [...(bufo ? [{ key: "bufo", label: "Bufo", emoji: bufo }] : []), ...extra], [bufo, extra]);
  const customEmojis = React.useMemo(() => packs.flatMap((p) => p.emoji), [packs]);
  const categories = React.useMemo<CategoryOption[]>(() => {
    const groups = [...new Set(customEmojis.map((e) => e.group ?? "Custom"))];
    return [{ id: "suggested", name: "Frequently used" }, ...groups.map((g) => ({ id: `custom:${g}` as const, name: g })), ...STANDARD];
  }, [customEmojis]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div ref={pickerRef} className="flex shrink-0 flex-col items-center gap-3">
          {bufo ? (
            // Provider options are read once: remount when the set of packs changes
            <EmojiProvider key={packs.map((p) => p.key).join()} data={enUrl} customEmojis={customEmojis}>
              <EmojiPickerCard onSelect={setPicked} categories={categories} />
            </EmojiProvider>
          ) : (
            <div className="h-[420px] w-[352px] animate-pulse rounded-xl bg-muted" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 text-sm">
          <h2 className="text-base font-semibold">Bufo</h2>
          <p className="text-muted-foreground">
            {bufo ? `${bufo.length} emoji` : "Loading…"} from{" "}
            <a className="underline underline-offset-4" href="https://bufo.zone/">
              all-the-bufo
            </a>
            . Loaded from all-the-bufo at view time; not redistributed.
          </p>
          <p className="text-muted-foreground">
            Search by any word of the name: <code>party</code>, <code>lgtm</code>, <code>ice cream</code>. Shortcodes keep the Slack names, <code>:bufo-yes:</code>.
          </p>
          {extra.length > 0 && <p className="text-muted-foreground">Also loaded: {extra.map((p) => `${p.label} (${p.emoji.length})`).join(", ")}.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadPack() {
  const { status, addPack } = usePacks();
  const [url, setUrl] = React.useState("");
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) addPack(url.trim());
        }}
      >
        <Input type="url" required placeholder="https://example.com/emoji/pack.json" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Pack URL" />
        <Button type="submit" disabled={status.pending}>
          Load
        </Button>
      </form>
      <p className="mt-2 h-5 text-xs text-muted-foreground" aria-live="polite">
        {status.pending ? "Loading…" : status.error ? `Couldn't load: ${status.error}` : status.count != null ? `Loaded ${status.count} emoji.` : ""}
      </p>
    </div>
  );
}
