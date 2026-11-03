// Discord style, in situ: a text channel (dark) with reactions under a message, the
// hover toolbar's "Add Reaction" opening the Discord style picker, and the composer's
// `:smi` autocomplete. Measured from Discord web (dark), Nov 2026:
// header 49px (0.8px rule, 16/20, padding 8 8 8 16); rows with a 40px avatar at x=16,
// name + time + content from x=72 at 16/22; a 56px composer, radius 8, inset 8px.
import * as React from "react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { Emoji, EmojiProvider, useEmojiStatus, useEmojiStore } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { discord, discordAutocompleteOptions } from "../../examples/discord";
import { SkinAutocomplete } from "../../examples/variants";
import { useAutocompleteInput } from "../../components/emoji-autocomplete";
import { TEAM_EMOJI } from "../../lib/custom-emoji";
import { Avatar, EmojiText, SceneFrame, ScenePicker, toggleReaction, useFontStylesheet, type Reaction } from "../kit";

const W = 760;
const H = 600;
const THEME = "dark";

// Discord's dark palette (measured, oklab as Chrome reports it).
const C = {
  chat: "oklab(0.2195 0.0021 -0.0074)",
  composer: "oklab(0.2568 0.0006 -0.0076)",
  header: "oklab(0.9527 0.0006 -0.0054)",
  name: "oklab(0.9527 0.0006 -0.0054)",
  text: "oklab(0.9527 0.0006 -0.0054)",
  muted: "oklab(0.608 0.0013 -0.0123)",
  icon: "oklab(0.7 0.0016 -0.0115)",
  rule: "color-mix(in oklab, #97979f 12%, transparent)",
  hover: "color-mix(in oklab, #000 6%, transparent)",
  toolbar: "#242429",
  toolbarBorder: "color-mix(in oklab, #97979f 12%, transparent)",
};

type Message = { id: number; author: string; colors: [string, string]; nameColor?: string; time: string; lines: string[]; reactions: Reaction[] };

const INITIAL: Message[] = [
  { id: 1, author: "Maya", colors: ["#f97316", "#db2777"], nameColor: "#f0b232", time: "Today at 9:41 AM", lines: ["morning! the new build is up on staging 🎉", "give it a spin when you get a sec"], reactions: [] },
  {
    id: 2,
    author: "Jordan",
    colors: ["#22c55e", "#0ea5e9"],
    time: "Today at 9:44 AM",
    lines: ["just tried it, the reactions feel so much snappier", "hover a message and hit the smiley to add one 👀"],
    reactions: [
      { unified: "1f525", count: 4, mine: true },
      { unified: "1f440", count: 2, mine: false },
      { unified: "1f64c", count: 1, mine: false },
    ],
  },
  { id: 4, author: "Maya", colors: ["#f97316", "#db2777"], nameColor: "#f0b232", time: "Today at 9:46 AM", lines: ["ok the skin tone picker is my favorite part ✋🏽"], reactions: [{ unified: "1f499", count: 1, mine: false }] },
  { id: 3, author: "Sam", colors: ["#8b5cf6", "#6366f1"], nameColor: "#9ab6ff", time: "Today at 9:47 AM", lines: ["try typing :smi in the box below"], reactions: [] },
];

export function DiscordScene() {
  useFontStylesheet("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap");
  return (
    // Discord draws Twemoji everywhere, so the scene has its own provider.
    <EmojiProvider data={enUrl} renderer="twemoji" customEmojis={TEAM_EMOJI}>
      <SceneFrame
        width={W}
        height={H}
        theme={THEME}
        label="Discord style channel"
        appStyle={discord}
        className="flex flex-col rounded-[8px] shadow-2xl ring-1 ring-black/40"
        style={{ background: C.chat, color: C.text, fontFamily: "'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <Channel />
      </SceneFrame>
    </EmojiProvider>
  );
}

function Channel() {
  const [messages, setMessages] = React.useState(INITIAL);
  const list = React.useRef<HTMLDivElement>(null);
  const toggle = (id: number, unified: string) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, reactions: toggleReaction(m.reactions, unified) } : m)));
  const send = (text: string) => {
    setMessages((ms) => {
      const last = ms[ms.length - 1];
      if (last?.author === "You") return [...ms.slice(0, -1), { ...last, lines: [...last.lines, text] }];
      return [...ms, { id: Date.now(), author: "You", colors: ["#5865f2", "#3b82f6"], time: "Today at 9:52 AM", lines: [text], reactions: [] }];
    });
    requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight }));
  };
  return (
    <>
      <Header />
      <div ref={list} className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[26px] [scrollbar-width:none]">
        <div className="mt-auto" />
        {messages.map((m) => (
          <DiscordMessage key={m.id} message={m} onToggle={(u) => toggle(m.id, u)} />
        ))}
      </div>
      <Composer onSend={send} />
    </>
  );
}

function Header() {
  return (
    <div className="flex h-[49px] shrink-0 items-center gap-2 pt-2 pr-2 pb-2 pl-4" style={{ borderBottom: `0.8px solid ${C.rule}` }}>
      <span style={{ color: C.icon }}>
        <Hash />
      </span>
      <span className="text-[16px] leading-5 font-semibold" style={{ color: C.header }}>
        general
      </span>
      <div className="ml-auto flex items-center gap-4 pr-2" style={{ color: C.icon }}>
        <Threads />
        <Bell />
        <Pin />
        <Members />
        <div className="flex h-8 w-[180px] items-center justify-between rounded-[8px] px-2 text-[14px]" style={{ background: "oklab(0.18 0.0015 -0.006)", color: C.muted }}>
          Search
          <SearchIcon />
        </div>
      </div>
    </div>
  );
}

function DiscordMessage({ message, onToggle }: { message: Message; onToggle: (unified: string) => void }) {
  const store = useEmojiStore();
  useEmojiStatus(); // names for labels once the data is in
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const quick = ["1f44d", "2764-fe0f", "1f602"];
  return (
    <div tabIndex={0} aria-label={`${message.author}, ${message.time}`} className={cn("group relative mt-[17px] outline-none focus-visible:shadow-[inset_2px_0_0_#5865f2] min-h-11 py-0.5 pr-12 pl-[72px] hover:bg-(--hover) focus-within:bg-(--hover)", pickerOpen && "bg-(--hover)")} style={{ "--hover": C.hover } as React.CSSProperties}>
      <Avatar name={message.author} size={40} colors={message.colors} className="absolute top-0.5 left-4 mt-0.5" fontSize={15} />
      <h3 className="text-[16px] leading-[22px]">
        <span className="font-medium" style={{ color: message.nameColor ?? C.name }}>
          {message.author}
        </span>
        <time className="ml-1 align-baseline text-[12px] leading-[22px] font-medium" style={{ color: C.muted }}>
          {message.time}
        </time>
      </h3>
      {message.lines.map((line, i) => (
        <p key={i} className="text-[16px] leading-[22px] break-words whitespace-pre-wrap" style={{ color: C.text }}>
          <EmojiText text={line} size={22} className="mx-px inline-block size-[22px] align-[-6px]" />
        </p>
      ))}
      {message.reactions.length ? (
        <div className="flex flex-wrap items-center gap-1 pt-1 pb-0.5">
          {message.reactions.map((r) => {
            const record = store.get(r.unified);
            return (
              <button
                key={r.unified}
                type="button"
                aria-pressed={r.mine}
                aria-label={`${record?.name ?? r.unified}, ${r.count} reaction${r.count === 1 ? "" : "s"}${r.mine ? ", including you" : ""}`}
                onClick={() => onToggle(r.unified)}
                className={cn("flex cursor-pointer items-center gap-1.5 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2]", discord.pill.base, discord.pill.mine)}
              >
                <Emoji unified={r.unified} size={16} className="size-4" />
                <span>{r.count}</span>
              </button>
            );
          })}
          <ScenePicker
            appStyle={discord}
            theme={THEME}
            label="Add Reaction"
            title="Add Reaction"
            onSelect={(s) => onToggle(s.unified)}
            triggerClassName={cn("flex cursor-pointer items-center outline-none hover:text-(--discord-strong) focus-visible:ring-2 focus-visible:ring-[#5865f2]", discord.pill.add)}
          >
            <SmilePlus />
          </ScenePicker>
        </div>
      ) : null}
      {/* Hover toolbar: three quick reactions, Add Reaction (the picker), Reply, More. */}
      <div
        className={cn("pointer-events-none absolute -top-4 right-3.5 z-10 flex items-center rounded-[8px] p-0.5 opacity-0 shadow-[0_4px_8px_rgb(0_0_0/0.16)] group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100", pickerOpen && "pointer-events-auto opacity-100")}
        style={{ background: C.toolbar, border: `0.8px solid ${C.toolbarBorder}`, color: C.icon }}
      >
        {quick.map((u) => (
          <button key={u} type="button" aria-label={`React with ${store.get(u)?.name ?? u}`} onClick={() => onToggle(u)} className="flex size-8 cursor-pointer items-center justify-center rounded outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#5865f2]">
            <Emoji unified={u} size={20} className="size-5" />
          </button>
        ))}
        <span className="mx-1 h-5 w-px" style={{ background: C.rule }} />
        <ScenePicker
          appStyle={discord}
          theme={THEME}
          label="Add Reaction"
          title="Add Reaction"
          align="end"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(s) => onToggle(s.unified)}
          triggerClassName="flex size-8 cursor-pointer items-center justify-center rounded outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5865f2]"
        >
          <SmilePlus />
        </ScenePicker>
        <span className="flex size-8 items-center justify-center" aria-hidden>
          <Reply />
        </span>
        <span className="flex size-8 items-center justify-center" aria-hidden>
          <More />
        </span>
      </div>
    </div>
  );
}

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const { value, setText, insertAtCaret, autocomplete, inputProps } = useAutocompleteInput<HTMLTextAreaElement>({ ...discordAutocompleteOptions });
  const submit = () => {
    const text = value.trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <div className="relative mx-2 mb-4 shrink-0">
      <SkinAutocomplete skin={discord} autocomplete={autocomplete} className="absolute inset-x-0 bottom-full mb-2" />
      <div className="flex h-14 items-center rounded-[8px]" style={{ background: C.composer, border: `0.8px solid ${C.rule}` }}>
        <span className="flex h-full w-14 shrink-0 items-center justify-center" style={{ color: C.icon }} aria-hidden>
          <PlusCircle />
        </span>
        <textarea
          {...inputProps}
          rows={1}
          aria-label="Message #general"
          placeholder="Message #general"
          className="block h-[22px] min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-[22px] outline-none placeholder:text-(--ph)"
          style={{ color: C.text, "--ph": C.muted } as React.CSSProperties}
          onKeyDown={(e) => {
            if (autocomplete.onKeyDown(e)) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex shrink-0 items-center gap-1 pr-3 pl-2" style={{ color: C.icon }}>
          <span className="flex size-8 items-center justify-center" aria-hidden>
            <Gift />
          </span>
          <span className="flex size-8 items-center justify-center" aria-hidden>
            <Gif />
          </span>
          <span className="flex size-8 items-center justify-center" aria-hidden>
            <StickerIcon />
          </span>
          <ScenePicker
            appStyle={discord}
            theme={THEME}
            label="Select emoji"
            side="top"
            align="end"
            onSelect={(s) => insertAtCaret(s.emoji || `:${s.shortcode}:`)}
            triggerClassName="flex size-8 cursor-pointer items-center justify-center rounded outline-none grayscale hover:grayscale-0 focus-visible:ring-2 focus-visible:ring-[#5865f2] data-[state=open]:grayscale-0"
          >
            <Emoji unified="1f642" size={22} className="size-[22px]" />
          </ScenePicker>
        </div>
      </div>
    </div>
  );
}

// Icons: simple 24px glyphs in Discord's shapes (currentColor).
const svg = (d: React.ReactNode, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    {d}
  </svg>
);
const Hash = () => svg(<path d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z" fillRule="evenodd" />);
const Threads = () => svg(<path d="M12 2.8c-5.1 0-9.2 3.7-9.2 8.3 0 2.2.9 4.2 2.5 5.7L4.6 21l4.3-2.2c1 .3 2 .5 3.1.5 5.1 0 9.2-3.7 9.2-8.3S17.1 2.8 12 2.8Zm-4 9.7a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z" />);
const Bell = () => svg(<path d="M9.7 2.1c.9-.4 1.6-1 2.3-1s1.4.6 2.3 1A7 7 0 0 1 19 9v3.6c0 .6.2 1.2.6 1.7l1.2 1.5c.7.9.1 2.2-1 2.2H4.2c-1.1 0-1.7-1.3-1-2.2l1.2-1.5c.4-.5.6-1.1.6-1.7V9a7 7 0 0 1 4.7-6.9ZM9 20h6a3 3 0 0 1-6 0Z" />);
const Pin = () => svg(<path d="M19.4 9.6 14.4 4.6a1 1 0 0 0-1.6.3l-1.4 3-4 1.3a1 1 0 0 0-.4 1.7l2.3 2.3-4.5 4.5a1 1 0 1 0 1.4 1.4l4.5-4.5 2.3 2.3a1 1 0 0 0 1.7-.4l1.3-4 3-1.4a1 1 0 0 0 .3-1.6Z" />);
const Members = () => svg(<path d="M14.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM3 18.5C3 15.5 6.6 13 11 13s8 2.5 8 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1.5Zm14.4-6.3c2.6.5 4.6 2.2 4.6 4.3V18a1 1 0 0 1-1 1h-.5v-.5c0-2.4-1.3-4.6-3.1-6.3ZM15.6 11.2a5 5 0 0 0 1.1-3.2c0-1.2-.4-2.3-1.1-3.2a3.5 3.5 0 1 1 0 6.4Z" />);
const SearchIcon = () => svg(<path d="M15.6 14.2a7 7 0 1 0-1.4 1.4l4.1 4.1a1 1 0 0 0 1.4-1.4l-4.1-4.1ZM10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fillRule="evenodd" />, 16);
const PlusCircle = () => svg(<path d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1-15a1 1 0 1 0-2 0v3H8a1 1 0 1 0 0 2h3v3a1 1 0 1 0 2 0v-3h3a1 1 0 1 0 0-2h-3V8Z" fillRule="evenodd" />);
const Gift = () => svg(<path d="M4 6a4 4 0 0 1 4-4h.1c1.6 0 3 .9 3.9 2.2A4.6 4.6 0 0 1 15.9 2h.1a4 4 0 0 1 3.5 6H21a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-8V8h-2v4H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1.5A4 4 0 0 1 4 6Zm7 2c-.1-1.7-1.3-4-2.9-4H8a2 2 0 1 0 0 4h3Zm2 0h3a2 2 0 1 0 0-4h-.1c-1.6 0-2.8 2.3-2.9 4ZM3 14v5a3 3 0 0 0 3 3h5v-8H3Zm10 8h5a3 3 0 0 0 3-3v-5h-8v8Z" fillRule="evenodd" />);
const Gif = () => svg(<path d="M2 6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6Zm4.8 2.5c-1.9 0-3.1 1.5-3.1 3.5s1.2 3.5 3.1 3.5c1 0 1.8-.3 2.4-.9V11.6H6.9v1.2h1v.9c-.2.2-.6.3-1 .3-1 0-1.6-.8-1.6-2s.6-2 1.6-2c.5 0 .9.2 1.2.6l1-.9a3 3 0 0 0-2.3-1.2Zm4.4.1h-1.5v6.8h1.5V8.6Zm1.5 0h4.4v1.3h-2.9v1.6h2.6v1.3h-2.6v2.6h-1.5V8.6Z" fillRule="evenodd" />);
const StickerIcon = () => svg(<path d="M12 23a11 11 0 1 1 11-11v.3a10.7 10.7 0 0 1-10.7 10.7H12ZM20.9 13A11 11 0 0 1 13 20.9V17a4 4 0 0 1 4-4h3.9ZM8 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-8.3 3.7a1 1 0 1 0-1.4 1.4c1.1 1.1 2.4 1.7 3.7 1.9a1 1 0 0 0 .3-2 4.3 4.3 0 0 1-2.6-1.3Z" fillRule="evenodd" />);
const SmilePlus = () => svg(<path d="M12 23a11 11 0 0 0 10.9-12.5 1 1 0 0 0-1.4-.8 3 3 0 0 1-4-3.4 1 1 0 0 0-.9-1.2A3 3 0 0 1 14.3 1.4 1 1 0 0 0 13.5 1.1 11 11 0 1 0 12 23ZM8 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9.5-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-9.8 3.8a1 1 0 0 0-1.4 1.4 8 8 0 0 0 11.4 0 1 1 0 0 0-1.4-1.4 6 6 0 0 1-8.6 0ZM19 0a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0V5h-2a1 1 0 1 1 0-2h2V1a1 1 0 0 1 1-1Z" fillRule="evenodd" />, 20);
const Reply = () => svg(<path d="M2.3 7.3a1 1 0 0 0 0 1.4l5 5a1 1 0 0 0 1.4-1.4L5.4 9H11a7 7 0 0 1 7 7v4a1 1 0 1 0 2 0v-4a9 9 0 0 0-9-9H5.4l3.3-3.3a1 1 0 0 0-1.4-1.4l-5 5Z" />, 20);
const More = () => svg(<path d="M4 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />, 20);

export default DiscordScene;
