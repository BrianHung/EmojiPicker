import * as React from "react";
import { Emoji, useEmojiStatus, useEmojiStore, type EmojiSelection } from "emoji-components";
import { EmojiPopover } from "@/components/emoji-popover";
import { EmojiReactionBar as ReactionRow } from "@/components/ui/emoji-reaction-bar";
import { copyEmoji } from "@/components/site/picked";
import { cn } from "@/lib/utils";
import { instagram } from "./picker";
import { Avatar, EmojiText, FitViewport, MobileFrame, PickerSheet, SceneFrame, ScenePicker, ld, useCompact, useLongPress } from "@/styles/scene-kit";
import { tokensOf } from "@/styles/style";


const C = {
  page: ld("#ffffff", "#0c1014"),
  text: ld("#0c1014", "#f5f5f5"),
  muted: ld("#6a717a", "#a8a8a8"),
  received: ld("rgb(243 245 247)", "rgb(37 41 46)"),
  rule: ld("rgb(219 223 228)", "#262626"),
  border: ld("rgb(219 223 228)", "#363636"),
  icon: ld("#0c1014", "#f5f5f5"),
  chip: ld("rgb(243 245 247)", "#262626"),
};
const SENT_GRADIENT = "linear-gradient(180deg, #a238ff 0%, #7a3cff 35%, #3c57ff 70%, #1d72ff 100%)";

type Person = { name: string; color: string };
const MAYA: Person = { name: "Maya", color: "#f97316" };
const JORDAN: Person = { name: "Jordan", color: "#22c55e" };

type Message = { id: number; from: Person | "me"; text: string; reaction?: string; time?: string };

const INITIAL: Message[] = [
  { id: 11, from: JORDAN, text: "who renamed the chat??", reaction: "1f602", time: "Yesterday 11:48 PM" },
  { id: 12, from: "me", text: "the frog has admin now, I don't make the rules" },
  { id: 13, from: MAYA, text: "renamed it back from bufo's pond party 🐸" },
  { id: 1, from: MAYA, text: "ok who's in for the lake on saturday", time: "Today 10:12 AM" },
  { id: 2, from: MAYA, text: "I can drive, there's room for 4 🚗" },
  { id: 3, from: JORDAN, text: "count me in!!", reaction: "1f525" },
  { id: 4, from: JORDAN, text: "I'll bring snacks" },
  { id: 5, from: "me", text: "same, I'm in 🙌", time: "Today 10:20 AM" },
  { id: 6, from: "me", text: "hover or hold a message to react 👀" },
  { id: 7, from: MAYA, text: "perfect, leaving at 9 ☀️" },
];

const FONT = "var(--site-text-emoji,) -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function InstagramScene() {
  const { ref, compact } = useCompact();
  const [messages, setMessages] = React.useState(INITIAL);
  const list = React.useRef<HTMLDivElement>(null);
  const react = (id: number, unified: string) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, reaction: m.reaction === unified ? undefined : unified } : m)));
  const send = (text: string) => {
    setMessages((ms) => [...ms, { id: Date.now(), from: "me", text }]);
    requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight }));
  };
  return (
    <div ref={ref} className="w-full">
      {compact ? (
        <MobileFrame label="Instagram style direct messages" appStyle={instagram} style={{ background: C.page, color: C.text, fontFamily: FONT }}>
          <MobileHeader />
          <Thread messages={messages} listRef={list} onReact={react} compact />
          <Composer onSend={send} compact />
        </MobileFrame>
      ) : (
        <SceneFrame
          label="Instagram style direct messages"
          appStyle={instagram}
          className="flex flex-col border-black/10 dark:border-white/10"
          style={{ background: C.page, color: C.text, fontFamily: FONT }}
        >
          <Header />
          <Thread messages={messages} listRef={list} onReact={react} />
          <Composer onSend={send} />
        </SceneFrame>
      )}
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="flex h-[60px] shrink-0 items-center gap-3 pr-4 pl-3" style={{ borderBottom: `1px solid ${C.rule}` }} aria-hidden>
      <span style={{ color: C.icon }}>
        <Back />
      </span>
      <div className="relative size-9 shrink-0">
        <Avatar name={MAYA.name} size={26} color={MAYA.color} className="absolute top-0 left-0" />
        <Avatar name={JORDAN.name} size={26} color={JORDAN.color} className="absolute right-0 bottom-0 ring-2 ring-white dark:ring-[#0c1014]" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[16px] leading-5 font-semibold">Lake weekend</div>
        <div className="truncate text-[12px] leading-4" style={{ color: C.muted }}>
          Maya, Jordan
        </div>
      </div>
      <div className="ml-auto flex items-center gap-5" style={{ color: C.icon }}>
        <Phone />
        <Video />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex h-[75px] shrink-0 items-center gap-3 px-4" style={{ borderBottom: `1px solid ${C.rule}` }}>
      <div className="relative size-11 shrink-0">
        <Avatar name={MAYA.name} size={32} color={MAYA.color} className="absolute top-0 left-0" />
        <Avatar name={JORDAN.name} size={32} color={JORDAN.color} className="absolute right-0 bottom-0 ring-2 ring-white dark:ring-[#0c1014]" />
      </div>
      <div className="min-w-0">
        <div className="text-[16px] leading-5 font-semibold">Lake weekend</div>
        <div className="text-[12px] leading-4" style={{ color: C.muted }}>
          Maya, Jordan
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4" style={{ color: C.icon }}>
        <Phone />
        <Video />
        <Info />
      </div>
    </div>
  );
}

function Thread({ messages, listRef, onReact, compact = false }: { messages: Message[]; listRef: React.RefObject<HTMLDivElement | null>; onReact: (id: number, unified: string) => void; compact?: boolean }) {
  const [scroll, setScroll] = React.useState(0);
  return (
    <div
      ref={listRef}
      onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
      className="relative flex min-h-0 flex-1 flex-col-reverse overflow-y-auto pt-4 pb-2 [scrollbar-width:none]"
    >
      <div className="flex shrink-0 flex-col">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const first = !prev || prev.from !== m.from || Boolean(m.time);
        const last = !next || next.from !== m.from || Boolean(next.time);
        return (
          <React.Fragment key={m.id}>
            {m.time ? (
              <div className="py-3 text-center text-[12px] leading-4 font-light" style={{ color: C.muted }}>
                {m.time}
              </div>
            ) : null}
            <Row message={m} first={first} last={last} scroll={scroll} listRef={listRef} onReact={(u) => onReact(m.id, u)} compact={compact} />
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
}

type RowProps = { message: Message; first: boolean; last: boolean; scroll: number; listRef: React.RefObject<HTMLDivElement | null>; onReact: (unified: string) => void; compact: boolean };

function Row({ message, first, last, scroll, listRef, onReact, compact }: RowProps) {
  const mine = message.from === "me";
  const person = mine ? undefined : (message.from as Person);
  const [barOpen, setBarOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const hold = useLongPress(() => setBarOpen(true));
  const pick = (s: EmojiSelection) => {
    onReact(s.unified);
    copyEmoji(s);
    setBarOpen(false);
  };
  const bubble = React.useRef<HTMLDivElement>(null);
  const [top, setTop] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!mine || !bubble.current) return;
    let y = 0;
    for (let el: HTMLElement | null = bubble.current; el && el !== listRef.current; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
    if (y !== top) setTop(y);
  });
  const viewport = listRef.current?.clientHeight ?? 480;
  const r = (cont: boolean) => (cont ? 4 : 18);
  const radius = mine
    ? `18px ${r(!first)}px ${r(!last)}px 18px`
    : `${r(!first)}px 18px 18px ${r(!last)}px`;
  return (
    <div className={cn("group relative flex px-4", first ? "mt-2" : "mt-0.5", message.reaction && "mb-[18px]", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <div className="flex w-[31px] shrink-0 items-end">{last ? <Avatar name={person!.name} size={28} color={person!.color} fontSize={12} /> : null}</div>
      ) : null}
      <div className={cn("flex flex-col", compact ? "max-w-[75%]" : "max-w-[60%]", mine ? "items-end" : "items-start")}>
        {first && !mine ? (
          <div className="pb-1 pl-3 text-[12px] leading-4" style={{ color: C.muted }}>
            {person!.name}
          </div>
        ) : null}
        <div className={cn("flex items-center gap-1", mine && "flex-row-reverse")}>
          <div
            ref={bubble}
            {...(compact
              ? {
                  ...hold,
                  role: "button",
                  tabIndex: 0,
                  "aria-haspopup": "dialog" as const,
                  "aria-expanded": barOpen,
                  "aria-label": `${mine ? "You" : person!.name}: ${message.text}. Hold to react, double-tap to like`,
                  onDoubleClick: () => onReact("2764-fe0f"),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    setBarOpen(true);
                  },
                }
              : {})}
            className={cn(
              "relative px-3 py-2 text-[15px] leading-[18px] break-words whitespace-pre-wrap",
              mine ? "text-white" : "text-[#0c1014] dark:text-white",
              compact && "touch-manipulation outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-[#708dff]",
            )}
            style={{
              borderRadius: radius,
              background: mine ? SENT_GRADIENT : C.received,
              backgroundSize: mine ? `100% ${viewport}px` : undefined,
              backgroundPosition: mine ? `0 ${scroll - top}px` : undefined,
            }}
          >
            <EmojiText text={message.text} size={15} className="inline-block h-[18px] align-top leading-[18px]" />
            {message.reaction ? <ReactionChip unified={message.reaction} mine={mine} onRemove={() => onReact(message.reaction!)} /> : null}
          </div>
          {compact ? (
            <>
              <ReactionBar
                open={barOpen}
                onOpenChange={setBarOpen}
                onSelect={pick}
                align={mine ? "end" : "start"}
                anchor={bubble}
                onMore={() => {
                  setBarOpen(false);
                  setSheetOpen(true);
                }}
              />
              <PickerSheet appStyle={instagram} label="Choose a reaction" open={sheetOpen} onOpenChange={setSheetOpen} onSelect={(s) => onReact(s.unified)} />
            </>
          ) : (
            <div className={cn("flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100", barOpen && "opacity-100", mine && "flex-row-reverse")} style={{ color: C.muted }}>
              <ReactionBar open={barOpen} onOpenChange={setBarOpen} onSelect={pick} align={mine ? "end" : "start"} />
              <span className="flex size-8 items-center justify-center" aria-hidden>
                <ReplyIcon />
              </span>
              <span className="flex size-8 items-center justify-center" aria-hidden>
                <MoreIcon />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReactionChip({ unified, mine, onRemove }: { unified: string; mine: boolean; onRemove: () => void }) {
  const store = useEmojiStore();
  useEmojiStatus();
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`${store.get(unified)?.name ?? unified} reaction, tap to remove`}
      className={cn("absolute -bottom-[18px] flex h-[22px] min-w-[26px] items-center justify-center rounded-full px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#708dff]", mine ? "right-2" : "left-2")}
      style={{ background: C.chip, border: `2px solid ${C.page}` }}
    >
      <Emoji emoji={unified} size={14} className="text-[14px] leading-none" />
    </button>
  );
}

type ReactionBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (s: EmojiSelection) => void;
  align: "start" | "end";
  anchor?: React.RefObject<HTMLElement | null>;
  onMore?: () => void;
};

function ReactionBar({ open, onOpenChange, onSelect, align, anchor, onMore }: ReactionBarProps) {
  const store = useEmojiStore();
  const tb = instagram.tapback;
  const first = React.useRef<HTMLButtonElement>(null);
  const [more, setMore] = React.useState(false);
  const moreClass = cn(tb.more!.className, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#708dff]");
  return (
    <EmojiPopover.Root open={open} onOpenChange={onOpenChange}>
      {anchor ? (
        // Where Tab goes from the popup: the anchored bubble is no trigger
        <EmojiPopover.Trigger nativeButton={false} render={<span hidden />} />
      ) : (
        <EmojiPopover.Trigger aria-label="React" title="React" className="flex size-8 cursor-pointer items-center justify-center rounded-full outline-none hover:text-[#0c1014] dark:hover:text-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-[#708dff]">
          <SmileIcon size={16} />
        </EmojiPopover.Trigger>
      )}
      <EmojiPopover.Portal>
        <EmojiPopover.Positioner side="top" align={align} sideOffset={6} anchor={anchor}>
          <EmojiPopover.Popup initialFocus={anchor ? first : undefined} aria-label="Reactions">
            <ReactionRow data-style="instagram" style={tokensOf(instagram)} className={cn("block", tb.className)} aria-label="Reactions">
              <div className={tb.reactions}>
                {tb.pinned!.map((u, i) => (
                  <button
                    key={u}
                    ref={i === 0 ? first : undefined}
                    type="button"
                    aria-label={store.get(u)?.name ?? u}
                    onClick={() => {
                      const s = store.select(store.withSkinTone(u));
                      if (s) onSelect(s);
                    }}
                    className="cursor-pointer outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-[#708dff]"
                  >
                    <Emoji emoji={store.withSkinTone(u)} />
                  </button>
                ))}
                {onMore ? (
                  <button type="button" aria-label="More reactions" onClick={onMore} className={moreClass}>
                    {tb.more!.icon}
                  </button>
                ) : (
                  <EmojiPopover.Root open={more} onOpenChange={setMore}>
                    <EmojiPopover.Trigger aria-label="More reactions" className={moreClass}>
                      {tb.more!.icon}
                    </EmojiPopover.Trigger>
                    <EmojiPopover.Portal>
                      <EmojiPopover.Positioner side="top" align="center">
                        <EmojiPopover.Popup aria-label="Instagram style emoji picker">
                          <FitViewport width={instagram.size.width}>
                            <instagram.Picker onSelect={(s) => (onSelect(s), setMore(false))} autoFocus />
                          </FitViewport>
                        </EmojiPopover.Popup>
                      </EmojiPopover.Positioner>
                    </EmojiPopover.Portal>
                  </EmojiPopover.Root>
                )}
              </div>
            </ReactionRow>
          </EmojiPopover.Popup>
        </EmojiPopover.Positioner>
      </EmojiPopover.Portal>
    </EmojiPopover.Root>
  );
}

function Composer({ onSend, compact = false }: { onSend: (text: string) => void; compact?: boolean }) {
  const [value, setValue] = React.useState("");
  const input = React.useRef<HTMLInputElement>(null);
  const caret = React.useRef(0);
  const insert = (text: string) => {
    const at = caret.current;
    const next = value.slice(0, at) + text + value.slice(at);
    setValue(next);
    caret.current = at + text.length;
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(caret.current, caret.current);
    });
  };
  const submit = () => {
    const text = value.trim();
    if (text) onSend(text);
    setValue("");
    caret.current = 0;
  };
  return (
    <div className="m-4 flex h-11 shrink-0 items-center gap-1 rounded-[22px] pr-4 pl-[11px]" style={{ border: `1px solid ${C.border}` }}>
      <ScenePicker
        appStyle={instagram}
        label="Choose an emoji"
        side="top"
        sheet={compact}
        onSelect={(s) => insert(s.emoji)}
        triggerClassName="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#0c1014] outline-none dark:text-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-[#708dff]"
      >
        <SmileIcon size={24} />
      </ScenePicker>
      <input
        ref={input}
        value={value}
        aria-label="Message"
        placeholder="Message..."
        onChange={(e) => {
          setValue(e.target.value);
          caret.current = e.target.selectionStart ?? e.target.value.length;
        }}
        onSelect={(e) => (caret.current = e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="h-full min-w-0 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-[#6a717a] dark:placeholder:text-[#a8a8a8]"
      />
      {value.trim() ? (
        <button type="button" onClick={submit} className="cursor-pointer text-[14px] font-semibold text-[#4150f7] outline-none hover:text-[#0c1014] focus-visible:underline dark:text-[#708dff] dark:hover:text-white">
          Send
        </button>
      ) : (
        <div className="flex items-center gap-4" style={{ color: C.icon }}>
          <Mic />
          <ImageIcon />
          <HeartIcon />
        </div>
      )}
    </div>
  );
}

const stroke = (d: React.ReactNode, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const SmileIcon = ({ size }: { size: number }) =>
  stroke(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14.5s1.5 2 4 2 4-2 4-2" />
      <circle cx="9" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    </>,
    size,
  );
const Back = () => stroke(<path d="M15 4 7 12l8 8" />, 26);
const Phone = () => stroke(<path d="M7.9 2.8 5.5 3a2.6 2.6 0 0 0-2.4 2.8c.6 7.8 7.3 14.5 15.1 15.1a2.6 2.6 0 0 0 2.8-2.4l.2-2.4-4.6-2-1.7 2.2a12.2 12.2 0 0 1-5.8-5.8l2.2-1.7-2-4.6Z" />);
const Video = () =>
  stroke(
    <>
      <rect x="1.5" y="5" width="15" height="14" rx="3" />
      <path d="m16.5 10 6-3.5v11l-6-3.5" />
    </>,
  );
const Info = () =>
  stroke(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v6M12 7.5v.01" />
    </>,
  );
const Mic = () =>
  stroke(
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </>,
  );
const ImageIcon = () =>
  stroke(
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m22 15-5-5L5 22" />
    </>,
  );
const HeartIcon = () => stroke(<path d="M16.8 3.5A5 5 0 0 1 22 8.8c0 3.4-3 6.4-10 12.2C5 15.2 2 12.2 2 8.8a5 5 0 0 1 5.2-5.3c2.2 0 3.6 1 4.8 2.7 1.2-1.7 2.6-2.7 4.8-2.7Z" />);
const ReplyIcon = () => stroke(<path d="M10 8V5l-7 6 7 6v-3.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z" />, 16);
const MoreIcon = () =>
  stroke(
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>,
    16,
  );

