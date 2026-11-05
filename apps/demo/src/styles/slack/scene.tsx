import * as React from "react";
import { BoldIcon, CodeIcon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, PlusIcon, SquareCodeIcon, StrikethroughIcon } from "lucide-react";
import { Emoji, isComposingKey, useEmojiStatus, useEmojiStore, useFrequentEmoji, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { useEmojiTextField } from "@/components/emoji-text-field";
import { SlackEmojiMenu, slackEmojiOptions } from "@/experiences/slack";
import { copyEmoji } from "@/components/site/picked";
import { avatarFor } from "@/lib/people";
import { cn } from "@/lib/utils";
import { Smile, SmilePlus } from "@/styles/icons";
import { PickerSheet, toggleReaction, useCompact, type Reaction } from "@/styles/scene-kit";
import { StyleDropdown, StylePills } from "@/styles/variants";
import { slack } from "./picker";

type Message = { id: number; author: string; color: string; time: string; text: string; reactions: Reaction[] };

const INITIAL: Message[] = [
  {
    id: 1,
    author: "Priya",
    color: "#e8912d",
    time: "10:02 AM",
    text: "shipped the new emoji picker :tada: try typing :smiling in the composer below",
    reactions: [
      { unified: "1f389", count: 3, mine: true },
      { unified: "1f680", count: 2, mine: false },
      { unified: "1f6a2", count: 1, mine: false },
    ],
  },
  {
    id: 2,
    author: "Bufo",
    color: "#2bac76",
    time: "10:05 AM",
    text: "the tapback feels exactly like iMessage :exploding_head: skin tones too? :wave::skin-tone-4:",
    reactions: [{ unified: "1f44d", count: 2, mine: false }],
  },
  { id: 3, author: "You", color: "#4a154b", time: "10:06 AM", text: "yep :+1::skin-tone-3: and the skin tone sticks everywhere :ship:", reactions: [] },
];

const SHORTCODE = /:([a-z0-9_+\-']+):(?::skin-tone-([2-6]):)?/gi;

function SlackText({ text }: { text: string }) {
  const store = useEmojiStore();
  const status = useEmojiStatus();
  const nodes = React.useMemo(() => {
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(SHORTCODE)) {
      const record = store.fromShortcode(m[1]!);
      if (!record) continue;
      out.push(text.slice(last, m.index));
      const tone = m[2] ? record.tones[Number(m[2]) - 2] : undefined;
      out.push(<Emoji key={m.index} emoji={tone ?? record.unified} size={22} className="mx-px inline-block align-[-5px] text-[22px] leading-none" title={m[0]} />);
      last = m.index! + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text, store, status]);
  return <>{nodes}</>;
}

function EmojiMenu({ sheet, label, onSelect, triggerClassName, side, align, children }: { sheet: boolean; label: string; onSelect: (s: EmojiSelection) => void; triggerClassName: string; side?: "top"; align?: "end"; children: React.ReactNode }) {
  if (sheet)
    return (
      <PickerSheet appStyle={slack} label={label} onSelect={onSelect} triggerClassName={triggerClassName}>
        {children}
      </PickerSheet>
    );
  return (
    <StyleDropdown appStyle={slack} side={side} align={align} label={label} onSelect={(s) => (onSelect(s), copyEmoji(s))} triggerClassName={triggerClassName}>
      {children}
    </StyleDropdown>
  );
}

export function SlackScene() {
  const { ref, compact } = useCompact();
  const [messages, setMessages] = React.useState(INITIAL);
  const list = React.useRef<HTMLDivElement>(null);
  const toggle = (id: number, unified: string) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, reactions: toggleReaction(m.reactions, unified) } : m)));
  const send = (text: string) => {
    setMessages((ms) => [...ms, { id: Date.now(), author: "You", color: "#4a154b", time: "now", text, reactions: [] }]);
    requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }));
  };

  return (
    <div ref={ref} className="w-full">
      <div
        className={cn(
          "mx-auto flex h-[640px] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#dddddd] bg-white font-[Lato,system-ui,sans-serif] text-[#1d1c1d] shadow-2xl dark:border-[#35373b] dark:bg-[#1a1d21] dark:text-[#d1d2d3]",
          compact && "rounded-none border-0 shadow-none",
        )}
      >
        <div className="flex h-[49px] shrink-0 items-center gap-2 border-b border-[#dddddd] px-4 dark:border-[#35373b]">
          <span className="text-[18px] leading-6 font-black"># general</span>
          <span className="text-[13px] text-[#616061] dark:text-[#ababad]">3 members</span>
        </div>
        <div ref={list} className="flex flex-1 flex-col justify-end overflow-y-auto py-2">
          {messages.map((m) => (
            <SlackMessage key={m.id} message={m} onToggle={(u) => toggle(m.id, u)} compact={compact} />
          ))}
        </div>
        <SlackComposer onSend={send} compact={compact} />
      </div>
    </div>
  );
}

function SlackMessage({ message, onToggle, compact }: { message: Message; onToggle: (unified: string) => void; compact: boolean }) {
  const store = useEmojiStore();
  useEmojiStatus();
  const quick = useFrequentEmoji(3);
  const avatar = avatarFor(message.author);
  return (
    <div className="group relative flex gap-2 px-5 py-2 hover:bg-[#f8f8f8] dark:hover:bg-[#222529]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[15px] font-bold text-white" style={{ background: message.color }}>
        {avatar ? <img src={avatar} alt="" className="size-full rounded-[8px] bg-[#e6e6eb] object-contain" /> : message.author[0]}
      </div>
      <div className="-mt-1 min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] leading-[22px] font-black dark:text-[#f8f8f8]">{message.author}</span>
          <span className="text-[12px] leading-[17.6px] text-[#616061] dark:text-[#ababad]">{message.time}</span>
        </div>
        <p className="text-[15px] leading-[22px] break-words">
          <SlackText text={message.text} />
        </p>
        {message.reactions.length ? (
          <div className="mt-1">
            <StylePills appStyle={slack} reactions={message.reactions} onToggle={onToggle} onSelect={copyEmoji} />
          </div>
        ) : null}
      </div>
      <div className="absolute -top-4 right-5 hidden items-center rounded-[12px] bg-white p-1 shadow-[0_0_0_1px_rgba(29,28,29,0.13),0_1px_3px_rgba(0,0,0,0.08)] group-focus-within:flex group-hover:flex has-[[aria-expanded=true]]:flex dark:bg-[#1a1d21] dark:shadow-[0_0_0_1px_rgba(232,232,232,0.13),0_1px_3px_rgba(0,0,0,0.08)]">
        {quick.map((u) => (
          <button key={u} type="button" aria-label={`React with ${store.get(u)?.name ?? u}`} onClick={() => onToggle(store.withSkinTone(u))} className="flex size-8 items-center justify-center rounded-[8px] hover:bg-[#f4f4f4] dark:hover:bg-[#2c2d30]">
            <Emoji emoji={store.withSkinTone(u)} size={16} className="text-[16px] leading-none" />
          </button>
        ))}
        <EmojiMenu sheet={compact} label="Add reaction" align="end" onSelect={(s) => onToggle(s.unified)} triggerClassName="flex size-8 items-center justify-center rounded-[8px] text-[#616061] hover:bg-[#f4f4f4] dark:text-[#ababad] dark:hover:bg-[#2c2d30]">
          <SmilePlus size={18} />
        </EmojiMenu>
      </div>
    </div>
  );
}

const FORMATS = [[BoldIcon, ItalicIcon, StrikethroughIcon], [LinkIcon], [ListOrderedIcon, ListIcon], [CodeIcon, SquareCodeIcon]];

function SlackComposer({ onSend, compact }: { onSend: (text: string) => void; compact: boolean }) {
  const { value, setText, insertAtCaret, emoji, inputProps } = useEmojiTextField<HTMLTextAreaElement>({ ...slackEmojiOptions, insert: "shortcode" });
  const submit = () => {
    const text = value.trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <div className="shrink-0 px-5 pb-5">
      <div className="group/composer rounded-[8px] border border-[rgba(29,28,29,0.13)] bg-white focus-within:border-[rgba(94,93,96,0.45)] focus-within:shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border-[#565856] dark:bg-[#222529] dark:focus-within:border-[#797c81]">
        <div className="flex h-[38px] items-start rounded-t-[8px] p-1 text-[#454447] group-focus-within/composer:bg-[#f8f8f8] dark:text-[#b9babd] dark:group-focus-within/composer:bg-transparent" aria-hidden>
          {FORMATS.map((group, i) => (
            <React.Fragment key={i}>
              {i ? <span className="mx-1 mt-1.5 h-5 w-px bg-[#dddddd] dark:bg-[#35373b]" /> : null}
              {group.map((Icon, j) => (
                <span key={j} className="mt-0.5 mr-0.5 flex size-7 items-center justify-center rounded opacity-30 group-focus-within/composer:opacity-100">
                  <Icon size={18} />
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="relative">
          <SlackEmojiMenu {...emoji} />
          <textarea
            {...inputProps}
            rows={1}
            aria-label="Message #general"
            placeholder="Message #general"
            className="block max-h-[437.8px] min-h-[38px] w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-[15px] leading-[22px] text-[#1d1c1d] outline-none field-sizing-content placeholder:text-[#5e5d60] dark:text-[#d1d2d3] dark:placeholder:text-[#9a9b9e]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isComposingKey(e.nativeEvent)) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <div className="flex h-10 items-center gap-0.5 pr-1 pl-1.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-[rgba(29,28,29,0.06)] text-[#454447] dark:bg-[rgba(232,232,232,0.06)] dark:text-[#b9babd]">
            <PlusIcon size={18} />
          </span>
          <span className="flex h-7 items-center px-1.5 text-[15px] font-medium text-[#616061] dark:text-[#ababad]">Aa</span>
          <EmojiMenu sheet={compact} side="top" label="Emoji" onSelect={(s) => insertAtCaret(`${s.shortcode ?? s.emoji} `)} triggerClassName="flex size-7 items-center justify-center rounded text-[#616061] hover:bg-[#f4f4f4] dark:text-[#ababad] dark:hover:bg-[#2c2d30]">
            <Smile size={18} />
          </EmojiMenu>
          <span className="flex size-7 items-center justify-center text-[15px] text-[#616061] dark:text-[#ababad]">@</span>
          <button type="button" onClick={submit} disabled={!value.trim()} className="ml-auto flex h-7 items-center rounded bg-[#007a5a] px-2.5 text-xs font-bold text-white disabled:bg-transparent disabled:text-[#bbbabb]">
            Send
          </button>
        </div>
      </div>
      <p className="mt-1 text-right text-[11px] text-[#868686]">Type :tad or :smi</p>
    </div>
  );
}
