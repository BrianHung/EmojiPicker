import * as React from "react";
import { Emoji, useEmojiStatus, useEmojiStore, useFrequentEmoji } from "@brianhung/emoji-picker";
import { useAutocompleteInput } from "../components/emoji-autocomplete";
import { Smile, SmilePlus } from "../examples/icons";
import { skinById } from "../examples";
import { SkinAutocomplete, SkinDropdown, SkinPills, toggleReaction, type Reaction } from "../examples/variants";

const slack = skinById("slack");

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
      { unified: "ship-it", count: 1, mine: false },
    ],
  },
  {
    id: 2,
    author: "Marcus",
    color: "#2bac76",
    time: "10:05 AM",
    text: "the tapback feels exactly like iMessage :exploding_head: skin tones too? :wave::skin-tone-4:",
    reactions: [{ unified: "1f44d", count: 2, mine: false }],
  },
  { id: 3, author: "You", color: "#4a154b", time: "10:06 AM", text: "yep :+1::skin-tone-3: and custom ones like :lgtm: work everywhere", reactions: [] },
];

// Slack renders :shortcodes: (with :skin-tone-N:) as emoji; custom ones as images.
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
      out.push(<Emoji key={m.index} unified={tone ?? record.unified} size={22} className="mx-px inline-block align-[-5px] text-[22px] leading-none" title={m[0]} />);
      last = m.index! + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text, store, status]);
  return <>{nodes}</>;
}

/** Slack mockup: shortcodes in messages, reaction pills, hover toolbar, add-reaction picker, :shortcode: composer. */
export function SlackDemo() {
  const [messages, setMessages] = React.useState(INITIAL);
  const list = React.useRef<HTMLDivElement>(null);
  const toggle = (id: number, unified: string) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, reactions: toggleReaction(m.reactions, unified) } : m)));
  const send = (text: string) => {
    setMessages((ms) => [...ms, { id: Date.now(), author: "You", color: "#4a154b", time: "now", text, reactions: [] }]);
    requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }));
  };

  return (
    <div className="mx-auto flex h-[640px] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#dddddd] bg-white font-[Lato,system-ui,sans-serif] text-[#1d1c1d] shadow-2xl dark:border-[#35373b] dark:bg-[#1a1d21] dark:text-[#d1d2d3]">
      <div className="flex h-[49px] shrink-0 items-center gap-2 border-b border-[#dddddd] px-4 dark:border-[#35373b]">
        <span className="text-[18px] font-black"># general</span>
        <span className="text-[13px] text-[#616061] dark:text-[#ababad]">3 members</span>
      </div>
      <div ref={list} className="flex flex-1 flex-col justify-end overflow-y-auto py-2">
        {messages.map((m) => (
          <SlackMessage key={m.id} message={m} onToggle={(u) => toggle(m.id, u)} />
        ))}
      </div>
      <SlackComposer onSend={send} />
    </div>
  );
}

function SlackMessage({ message, onToggle }: { message: Message; onToggle: (unified: string) => void }) {
  const store = useEmojiStore();
  useEmojiStatus(); // re-render once the dataset is ready
  const quick = useFrequentEmoji(3);
  return (
    <div className="group relative flex gap-2 px-5 py-2 hover:bg-[#f8f8f8] dark:hover:bg-[#222529]">
      <div className="mt-[3px] flex size-9 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white" style={{ background: message.color }}>
        {message.author[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-black">{message.author}</span>
          <span className="text-[12px] text-[#616061] dark:text-[#ababad]">{message.time}</span>
        </div>
        <p className="text-[15px] leading-[22px] break-words">
          <SlackText text={message.text} />
        </p>
        {message.reactions.length ? (
          <div className="mt-1">
            <SkinPills skin={slack} reactions={message.reactions} onToggle={onToggle} />
          </div>
        ) : null}
      </div>
      {/* Slack's hover toolbar: three quick reactions + add reaction */}
      <div className="absolute -top-4 right-5 hidden items-center rounded-lg border border-[#dddddd] bg-white p-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] group-focus-within:flex group-hover:flex has-[[aria-expanded=true]]:flex dark:border-[#35373b] dark:bg-[#1a1d21]">
        {quick.map((u) => (
          <button key={u} type="button" aria-label={`React with ${store.get(u)?.name ?? u}`} onClick={() => onToggle(store.withSkinTone(u))} className="flex size-8 items-center justify-center rounded hover:bg-[#f4f4f4] dark:hover:bg-[#2c2d30]">
            <Emoji unified={store.withSkinTone(u)} size={18} className="text-[18px] leading-none" />
          </button>
        ))}
        <SkinDropdown skin={slack} label="Add reaction" align="end" onSelect={(s) => onToggle(s.unified)} triggerClassName="flex size-8 items-center justify-center rounded text-[#616061] hover:bg-[#f4f4f4] dark:text-[#ababad] dark:hover:bg-[#2c2d30]">
          <SmilePlus size={18} />
        </SkinDropdown>
      </div>
    </div>
  );
}

function SlackComposer({ onSend }: { onSend: (text: string) => void }) {
  // Slack keeps :shortcodes: as text in the composer and renders them in the message.
  const { value, setText, insertAtCaret, autocomplete, inputProps } = useAutocompleteInput<HTMLTextAreaElement>({ insert: "shortcode", limit: 8 });
  const submit = () => {
    const text = value.trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <div className="relative shrink-0 px-5 pb-5">
      <SkinAutocomplete skin={slack} autocomplete={autocomplete} className="absolute inset-x-5 bottom-full mb-1" />
      <div className="rounded-lg border border-[#bbbabb] focus-within:border-[#868686] dark:border-[#565856]">
        <textarea
          {...inputProps}
          rows={2}
          aria-label="Message #general"
          placeholder="Message #general"
          className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[15px] outline-none placeholder:text-[#868686]"
          onKeyDown={(e) => {
            if (autocomplete.onKeyDown(e)) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#f4f4f4] text-lg text-[#616061] dark:bg-[#2c2d30]">+</span>
          <span className="flex h-7 items-center px-1.5 text-[15px] font-medium text-[#616061] dark:text-[#ababad]">Aa</span>
          <SkinDropdown skin={slack} side="top" label="Emoji" onSelect={(s) => insertAtCaret(`${s.shortcode ?? s.emoji} `)} triggerClassName="flex size-7 items-center justify-center rounded text-[#616061] hover:bg-[#f4f4f4] dark:text-[#ababad] dark:hover:bg-[#2c2d30]">
            <Smile size={18} />
          </SkinDropdown>
          <span className="flex size-7 items-center justify-center text-[15px] text-[#616061] dark:text-[#ababad]">@</span>
          <button type="button" onClick={submit} disabled={!value.trim()} className="ml-auto flex h-7 items-center rounded bg-[#007a5a] px-2.5 text-xs font-bold text-white disabled:bg-transparent disabled:text-[#bbbabb]">
            Send
          </button>
        </div>
      </div>
      <p className="mt-1 text-right text-[11px] text-[#868686]">Type :tad or :lgtm</p>
    </div>
  );
}
