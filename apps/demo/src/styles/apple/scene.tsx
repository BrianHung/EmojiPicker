import * as React from "react";
import { AnimatePresence, MotionGlobalConfig, motion, type Transition } from "motion/react";
import { useSmoothCorners } from "@lisse/react";
import { Emoji, EmojiPicker, isComposingKey, useEmojiStore, useFrequentEmoji, type CategoryOption, type EmojiRecord, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { copyEmoji } from "@/components/site/picked";
import { avatarFor } from "@/lib/people";
import { cn } from "@/lib/utils";
import { useEmojiTextField } from "@/components/emoji-text-field";
import { StyleTypeahead } from "@/styles/variants";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import * as I from "@/styles/icons";
import { EmojiText, ld } from "@/styles/scene-kit";
import { CELL } from "@/styles/style";
import { IPhoneFrame } from "./iphone-frame";
import { apple } from "./picker";
import { TAPBACKS, TapbackGlyph } from "./tapback-artwork";
import { SFCar } from "sf-symbols-lib/monochrome/SFCar";
import { SFChevronLeft } from "sf-symbols-lib/monochrome/SFChevronLeft";
import { SFChevronRight } from "sf-symbols-lib/monochrome/SFChevronRight";
import { SFClock } from "sf-symbols-lib/monochrome/SFClock";
import { SFDeleteLeft } from "sf-symbols-lib/monochrome/SFDeleteLeft";
import { SFDocumentOnDocument } from "sf-symbols-lib/monochrome/SFDocumentOnDocument";
import { SFEllipsisCircle } from "sf-symbols-lib/monochrome/SFEllipsisCircle";
import { SFFaceSmiling } from "sf-symbols-lib/monochrome/SFFaceSmiling";
import { SFFlag } from "sf-symbols-lib/monochrome/SFFlag";
import { SFLightbulb } from "sf-symbols-lib/monochrome/SFLightbulb";
import { SFLockFill } from "sf-symbols-lib/monochrome/SFLockFill";
import { SFMagnifyingglass } from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import { SFPlus } from "sf-symbols-lib/monochrome/SFPlus";
import { SFSoccerball } from "sf-symbols-lib/monochrome/SFSoccerball";
import { SFTranslate } from "sf-symbols-lib/monochrome/SFTranslate";
import { SFWifi } from "sf-symbols-lib/monochrome/SFWifi";
import { SFXmark } from "sf-symbols-lib/monochrome/SFXmark";


export type IMessageMode = "idle" | "tapback" | "menu" | "emoji";
export type Message = {
  id: number;
  from: "me" | "them";
  text: string;
  reactions: string[];
  time?: string;
  reactedBy?: "me" | "them";
  tapback?: boolean;
};
export type Incoming = { id: number; unified: string };
type Shown = Message & { tail: boolean };
export type Contact = { name: string; initials?: string; avatar?: React.ReactNode };

const W = 402;
const H = 874;
const C = {
  page: ld("#fcfcfc", "#000000"),
  them: ld("#e6e6e8", "#26252a"),
  blue: ld("#0086fd", "#0a84ff"),
  dim: ld("rgb(0 0 0 / 0.1)", "rgb(0 0 0 / 0.4)"),
  sheet: ld("#dbdee1", "#2b2b2d"),
  search: ld("#e8ebee", "#3a3a3c"),
  icon: ld("#76787d", "#98989f"),
  lifted: ld("#ffffff", "#2c2c2e"),
  menu: ld("#fafafa", "#252527"),
  thought: ld("#ffffff", "#3a3a3c"),
};

const SPRING: Transition = { type: "spring", duration: 0.42, bounce: 0.2 };
const POP: Transition = { type: "spring", duration: 0.35, bounce: 0.32 };
const ROOM: Transition = { type: "spring", duration: 0.28, bounce: 0 };
const FADE: Transition = { duration: 0.33, ease: [0.2, 0, 0, 1] };
const OUT: Transition = { duration: 0.15, ease: "easeIn" };

const ALEX: Message[] = [
  { id: 1, from: "them", text: "are we still on for dinner tonight?", reactions: [], time: "Today 6:02 PM" },
  { id: 2, from: "me", text: "yes!! 7pm at the ramen place", reactions: ["2764-fe0f"], tapback: true },
  { id: 3, from: "them", text: "perfect, I'll grab a table 🍜", reactions: [] },
];

function Reaction({ id, size, tapback = true }: { id: string; size: number; tapback?: boolean }) {
  return <TapbackGlyph unified={id} size={size} tapback={tapback} />;
}

type Layer = { fill: string; stroke?: string; strokeWidth?: number; erode?: number };
type Paint = { style: React.CSSProperties };
const paint = (fill: string, stroke?: string, strokeWidth?: number): Paint => ({ style: { fill, stroke, strokeWidth } });

function Union({ layers, children, className, style }: { layers: Layer[]; children: (paint: Paint) => React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={cn("pointer-events-none absolute top-0 left-0 overflow-visible", className)} style={style}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: ld("#ececec", "#262628") }} />
          <stop offset="1" style={{ stopColor: ld("#f0f0f0", "#2a2a2c") }} />
        </linearGradient>
        {layers.map((l, i) =>
          l.erode ? (
            <filter key={i} id={`${id}e${i}`} x="-5%" y="-5%" width="110%" height="110%">
              <feMorphology operator="erode" radius={l.erode} />
            </filter>
          ) : null,
        )}
      </defs>
      {layers.map((l, i) => (
        <g key={i} filter={l.erode ? `url(#${id}e${i})` : undefined}>
          {children(paint(l.fill === "glass" ? `url(#${id}g)` : l.fill, l.stroke, l.strokeWidth))}
        </g>
      ))}
    </svg>
  );
}

const GLASS: Layer[] = [{ fill: "none", stroke: ld("rgb(0 0 0 / 0.2)", "rgb(255 255 255 / 0.18)"), strokeWidth: 1 }, { fill: ld("#fdfdfd", "#2c2c2e") }, { fill: "glass", erode: 0.65 }];

function fillets(cx: number, cy: number, r: number, y: number, rf = 5.5) {
  const d = cy - y;
  if (d <= -r || d >= r) return [];
  const dx = Math.sqrt((r + rf) ** 2 - (rf - d) ** 2);
  return [-1, 1].map((s) => {
    const fx = cx + s * dx;
    const fy = y + rf;
    const k = r / (r + rf);
    const tx = cx + (fx - cx) * k;
    const ty = cy + (fy - cy) * k;
    return `M${fx},${y} A${rf},${rf} 0 0 ${s < 0 ? 1 : 0} ${tx},${ty} L${cx},${cy} L${cx},${y} Z`;
  });
}

type Rect = { top: number; left: number; width: number; height: number };

export function IMessageScreen({
  messages: initial = ALEX,
  contact = { name: "Alex", initials: "A" },
  initialMode = "tapback",
  scale,
  placeholder = "iMessage",
  time = "9:41",
  notice = false,
  incoming: pinned,
  replyWith = "263a-fe0f",
}: {
  placeholder?: string;
  messages?: Message[];
  contact?: Contact;
  initialMode?: IMessageMode;
  scale?: number;
  time?: string;
  notice?: boolean;
  incoming?: Incoming;
  replyWith?: string | null;
}) {
  const [messages, setMessages] = React.useState(initial);
  const shown = React.useMemo<Shown[]>(() => messages.map((m, i, all) => ({ ...m, tail: i === all.length - 1 || all[i + 1]!.from !== m.from || Boolean(all[i + 1]!.time) })), [messages]);
  const [selected, setSelected] = React.useState<{ id: number; rect: Rect } | null>(null);
  const [mode, setMode] = React.useState<IMessageMode>("idle");
  const [covering, setCovering] = React.useState(false);
  const screen = React.useRef<HTMLDivElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const bubbles = React.useRef(new Map<number, HTMLElement>());

  const measure = React.useCallback((id: number): Rect | null => {
    const el = bubbles.current.get(id);
    const frame = screen.current;
    if (!el || !frame) return null;
    const f = frame.getBoundingClientRect();
    const k = f.width / frame.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    return { top: (r.top - f.top) / k, left: (r.left - f.left) / k, width: r.width / k, height: r.height / k };
  }, []);
  const open = React.useCallback(
    (id: number, next: IMessageMode = "tapback") => {
      const rect = measure(id);
      if (!rect) return;
      setSelected({ id, rect });
      setMode(next);
      setCovering(next === "emoji");
      setCompose(false);
    },
    [measure],
  );
  const close = React.useCallback(() => setMode("idle"), []);
  const [compose, setCompose] = React.useState(false);
  const fromKeyboard = React.useRef(false);
  const keyboard = React.useRef<HTMLDivElement>(null);
  const opener = (open: () => void) => (e?: React.MouseEvent) => {
    fromKeyboard.current = e?.detail === 0;
    open();
  };
  React.useEffect(() => {
    if (mode !== "idle" || covering || !fromKeyboard.current || !selected) return;
    fromKeyboard.current = false;
    bubbles.current.get(selected.id)?.focus();
  }, [mode, covering]);
  const insert = React.useRef<(text: string) => void>(() => {});
  const erase = React.useRef<() => void>(() => {});
  const modeRef = React.useRef(mode);
  modeRef.current = mode;

  React.useEffect(() => {
    if (initialMode === "idle") return;
    const t = setTimeout(() => open(messages[messages.length - 1]!.id, initialMode), 150);
    return () => clearTimeout(t);
  }, []);

  const react = (id: number, unified: string, tapback = false) => {
    if (unified)
      setMessages((ms) =>
        ms.map((m) => {
          if (m.id !== id) return m;
          const same = (m.reactedBy ?? "me") === "me" && m.reactions.at(-1) === unified && Boolean(m.tapback) === tapback;
          return same ? { ...m, reactions: [], reactedBy: undefined, tapback: undefined } : { ...m, reactions: [unified], reactedBy: "me", tapback };
        }),
      );
    close();
  };

  const [incoming, setIncoming] = React.useState<(Incoming & { phase: "in" | "fly"; to?: { x: number; y: number } }) | null>(pinned ? { ...pinned, phase: "in" } : null);
  const timers = React.useRef<number[]>([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const receive = (id: number, unified: string) => {
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, MotionGlobalConfig.skipAnimations ? 0 : ms));
    later(1200, () => {
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, reactions: [unified], reactedBy: "them", tapback: false } : m)));
      setIncoming({ id, unified, phase: "in" });
      later(1300, () => {
        const r = measure(id);
        if (!r) return setIncoming(null);
        const me = messages.find((m) => m.id === id)?.from !== "them";
        setIncoming({ id, unified, phase: "fly", to: { x: me ? r.left + 2.4 : r.left + r.width - 2.4, y: r.top - 10.9 } });
      });
    });
  };

  const send = (text: string) => {
    const id = Date.now();
    setMessages((ms) => [...ms, { id, from: "me", text, reactions: [] }]);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    if (replyWith) receive(id, replyWith);
  };

  const message = selected ? shown.find((m) => m.id === selected.id) : undefined;
  const active = mode !== "idle" && selected && message;

  const body = (
    <div
      ref={screen}
      data-imessage=""
      className="relative overflow-hidden text-black antialiased select-none dark:text-white"
      style={{
        width: W,
        height: H,
        background: C.page,
        fontFamily: "var(--site-text-emoji,) -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        contain: "layout paint",
      }}
    >
      <div ref={scroller} className="absolute inset-0 overflow-y-auto px-[16.3px] pt-[171px] pb-[110px] [scrollbar-width:none]" onScroll={() => (modeRef.current === "tapback" || modeRef.current === "menu") && close()}>
        <Intro />
        <div className="flex flex-col">
          {shown.map((m, i) => (
            <React.Fragment key={m.id}>
              {m.time ? <Timestamp text={m.time} first={i === 0} /> : null}
              <Bubble
                message={m}
                gap={i === 0 || m.time ? 0 : messages[i - 1]!.from === m.from ? 2 : 8}
                hidden={Boolean((active || covering) && mode !== "menu" && selected?.id === m.id)}
                badgeHidden={incoming?.id === m.id}
                ref={(el) => {
                  if (el) bubbles.current.set(m.id, el);
                  else bubbles.current.delete(m.id);
                }}
                onOpen={(next) => open(m.id, next)}
              />
            </React.Fragment>
          ))}
        </div>
        {notice ? <SpamNotice /> : null}
      </div>
      <Header contact={contact} />
      <StatusBar time={time} />
      {compose ? <div className="absolute inset-0 z-[3]" onPointerDown={() => setCompose(false)} /> : null}
      <Composer onSend={send} placeholder={placeholder} emojiOpen={compose} onEmoji={opener(() => setCompose((c) => !c))} insert={insert} erase={erase} />

      <AnimatePresence onExitComplete={() => modeRef.current === "idle" && setCovering(false)}>
        {active ? (
          <motion.div
            key="dim"
            className="absolute inset-0 z-10"
            style={{ background: mode === "menu" ? "transparent" : C.dim }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { ...FADE, duration: 0.4 } }}
            transition={FADE}
            onPointerDown={close}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : null}
        {active && mode === "tapback" ? (
          <TapbackLayer key="tapback" rect={selected.rect} message={message} onReact={(u, t) => react(message.id, u, t)} onEmoji={opener(() => (setCovering(true), setMode("emoji")))} onClose={close} />
        ) : null}
        {active && mode === "menu" ? <MenuLayer key="menu" rect={selected.rect} message={message} onReact={(u, t) => react(message.id, u, t)} onEmoji={opener(() => (setCovering(true), setMode("emoji")))} onClose={close} /> : null}
        {active && mode === "emoji" ? <EmojiLayer key="emoji" rect={selected.rect} message={message} onClose={close} /> : null}
      </AnimatePresence>

      <AnimatePresence>{incoming ? <IncomingReaction key={incoming.id} {...incoming} initials={contact.initials ?? contact.name.slice(0, 1)} avatar={contact.avatar} onArrive={() => setIncoming(null)} /> : null}</AnimatePresence>

      <Drawer
        open={Boolean(active && mode === "emoji") || compose}
        onOpenChange={(o) => {
          if (o) return;
          close();
          setCompose(false);
        }}
        modal={false}
        disablePointerDismissal
      >
        <DrawerContent
          container={screen}
          ref={keyboard}
          // Base UI focuses the first tabbable without preventScroll, which scrolls the screen while the sheet slides in
          initialFocus={() => {
            if (fromKeyboard.current || matchMedia("(pointer: fine)").matches) keyboard.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
            return false;
          }}
          finalFocus={false}
          className="top-auto! right-[0.3px]! bottom-0! left-[0.3px]! h-[388.7px]! max-h-none! border-0! bg-transparent! text-base text-black dark:text-white duration-[380ms] ease-[cubic-bezier(0.2,1.1,0.32,1)] after:hidden data-ending-style:duration-[140ms]"
        >
          <DrawerTitle className="sr-only">Emoji keyboard</DrawerTitle>
          <EmojiKeyboard onPick={(s) => (copyEmoji(s), compose ? insert.current(s.emoji || `:${s.shortcode}:`) : message && react(message.id, s.unified))} onDelete={compose ? () => erase.current() : undefined} />
        </DrawerContent>
      </Drawer>
    </div>
  );

  if (!scale) return body;
  return (
    <div style={{ width: W * scale, height: H * scale, borderRadius: 62.7 * scale, overflow: "hidden" }} className="shrink-0">
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{body}</div>
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[54px]">
      <span className="absolute top-[21.7px] left-0 w-[164px] text-center text-[17.8px] leading-[22px] font-semibold tracking-[-0.01em]">{time}</span>
      <span className="absolute top-[13.7px] left-[153.3px] h-[37.3px] w-[95.3px] rounded-full bg-black" />
      <span className="absolute top-[35.3px] left-[277px] flex gap-[1.7px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="size-[3.6px] rounded-full bg-[#b9b9bb] dark:bg-[#5a5a5e]" />
        ))}
      </span>
      <SFWifi size={17} className="absolute top-[24.3px] left-[306px]" />
      <span className="absolute top-[25.5px] left-[333.3px] flex items-center">
        <span className="h-[12.3px] w-[26.3px] rounded-[4px] bg-black dark:bg-white" />
        <span className="ml-[1px] h-[4.4px] w-[1.6px] rounded-r-[1px] bg-black dark:bg-white" />
      </span>
    </div>
  );
}

const glass =
  "bg-[linear-gradient(#fdfdfd,#f6f6f6)] shadow-[0_0_0_0.34px_rgb(0_0_0/0.38),0_1px_4px_rgb(0_0_0/0.025)] dark:bg-[linear-gradient(#2c2c2e,#262628)] dark:shadow-[0_0_0_0.34px_rgb(255_255_255/0.18),0_1px_4px_rgb(0_0_0/0.3)]";

function Header({ contact }: { contact: Contact }) {
  const initials = contact.initials ?? contact.name.slice(0, 1);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-[160px] bg-[linear-gradient(#fcfcfc_70%,#fcfcfc00)] dark:bg-[linear-gradient(#000_70%,#0000)]">
      <span className={cn("absolute top-[61.3px] left-[15.3px] flex size-[45.3px] items-center justify-center rounded-full", glass)}>
        <SFChevronLeft size={21} className="-ml-[2px]" />
      </span>
      <span
        className={cn(
          "absolute top-[117px] left-1/2 flex h-[32.7px] -translate-x-1/2 items-center justify-center gap-[3px] rounded-full pr-[var(--pill-pad,10.4px)] pl-[calc(var(--pill-pad,10.4px)+3px)] text-[17.2px] font-bold tracking-[-0.01em] whitespace-nowrap",
          glass,
        )}
      >
        {contact.name}
        <SFChevronRight size={10} className="text-[#a3a3a8] dark:text-[#6c6c70]" />
      </span>
      {contact.avatar ? (
        <span className="absolute top-[62px] left-[171.3px] flex size-[60px] items-center justify-center overflow-hidden rounded-full">{contact.avatar}</span>
      ) : (
        <span className="absolute top-[62px] left-[171.3px] flex size-[60px] items-center justify-center rounded-full bg-[linear-gradient(rgb(163_188_222),rgb(117_127_189))] text-[25px] font-bold tracking-[0.01em] text-white">
          {initials}
        </span>
      )}
    </div>
  );
}

function Intro() {
  return (
    <div className="flex flex-col items-center text-[11.4px] leading-[13px] text-[#8a8a8e] dark:text-[#8d8d93]">
      <span>iMessage</span>
      <span className="flex items-center gap-[3px]">
        <SFLockFill size={8} />
        Encrypted
      </span>
    </div>
  );
}

function Timestamp({ text, first }: { text: string; first: boolean }) {
  const match = text.match(/^(.*?)\s+(\d{1,2}:\d{2}\s?[AP]M)$/);
  return (
    <p className={cn("mb-[6.6px] text-center text-[11.2px] leading-[15px] whitespace-pre-line text-[#8a8a8e] dark:text-[#8d8d93]", first ? "mt-[13px]" : "mt-[10px]")}>
      {match ? (
        <>
          <span className="font-medium">{match[1]}</span> {match[2]!.replace(" ", "\u202f")}
        </>
      ) : (
        text
      )}
    </p>
  );
}

function SpamNotice() {
  return (
    <div className="-ml-[1.3px] mt-[15px] flex w-[372px] flex-col items-center gap-[7.7px] text-center text-[11.4px] leading-[14.6px] font-medium tracking-[-0.012em] text-[#8a8a8e] dark:text-[#8d8d93]">
      <p>If you did not expect this message from an unknown sender, it may be spam.</p>
      <span className="flex h-[23.7px] items-center rounded-full bg-[#e9e9eb] px-[9px] text-[11.6px] font-semibold tracking-[-0.01em] text-[#0a7cff] dark:bg-[#26252a] dark:text-[#0a84ff]">Report Spam</span>
    </div>
  );
}

function Squircle({ radius, className, children }: { radius: number; className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useSmoothCorners(ref, { radius, smoothing: 0.6 });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

const COMPOSE_LIFT = 846.7 - (485.3 - 8);

function Composer({
  onSend,
  placeholder,
  emojiOpen,
  onEmoji,
  insert,
  erase,
}: {
  onSend: (text: string) => void;
  placeholder: string;
  emojiOpen: boolean;
  onEmoji: () => void;
  insert: React.RefObject<(text: string) => void>;
  erase: React.RefObject<() => void>;
}) {
  const store = useEmojiStore();
  const { value, setText, insertAtCaret, emoji, inputProps } = useEmojiTextField<HTMLInputElement>({ limit: 6, onSelect: copyEmoji });
  insert.current = insertAtCaret;
  erase.current = () => setText(segment(value).slice(0, -1).join(""));
  const submit = () => {
    const text = store.replaceShortcodes(value).trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-[4] h-[96px] bg-[linear-gradient(#fcfcfc00,#fcfcfc_45%)] dark:bg-[linear-gradient(#0000,#000_45%)]"
      initial={false}
      animate={{ y: emojiOpen ? -COMPOSE_LIFT : 0 }}
      transition={emojiOpen ? SPRING : { duration: 0.14, ease: "easeIn" }}
    >
      <div className="absolute inset-x-[16px] bottom-[77px] drop-shadow-[0_8px_24px_rgb(0_0_0/0.16)]">
        <Squircle radius={22}>
          <StyleTypeahead appStyle={apple} {...emoji} className="rounded-none! border-0! shadow-none!" />
        </Squircle>
      </div>
      <button
        type="button"
        aria-label="Emoji"
        aria-expanded={emojiOpen}
        onClick={onEmoji}
        className={cn(
          "absolute top-[27.3px] left-[27.3px] flex size-[41.3px] items-center justify-center rounded-full text-[#1c1c1e] outline-none focus-visible:ring-2 focus-visible:ring-[#0086fd] dark:text-white dark:focus-visible:ring-[#0a84ff]",
          glass,
        )}
      >
        <motion.span className="flex" animate={{ rotate: emojiOpen ? 45 : 0 }} transition={POP}>
          <SFPlus size={20} />
        </motion.span>
      </button>
      <div className={cn("absolute top-[27px] left-[79.3px] flex h-[41.7px] w-[295.4px] items-center rounded-full pr-3 pl-[16.7px]", glass)}>
        <input
          {...inputProps}
          aria-label="Message"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[17px] tracking-[-0.01em] caret-[#0086fd] outline-none placeholder:text-[#bdbdc0] dark:caret-[#0a84ff] dark:placeholder:text-[#6c6c70]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isComposingKey(e.nativeEvent)) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
    </motion.div>
  );
}

function useHugWidth(ref: React.RefObject<HTMLElement | null>, text: string) {
  React.useLayoutEffect(() => {
    const bubble = ref.current;
    const el = bubble?.querySelector<HTMLElement>("[data-text]");
    if (!bubble || !el) return;
    const measure = () => {
      bubble.style.width = "";
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()];
      const box = el.getBoundingClientRect();
      if (rects.length < 2 || !box.width) return;
      const scale = box.width / el.offsetWidth || 1;
      const longest = Math.max(...rects.map((r) => r.right)) - box.left;
      bubble.style.width = `${Math.ceil(longest / scale) + 1 + 30.6}px`;
    };
    measure();
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
    };
  }, [ref, text]);
}

function Tail({ me, color }: { me: boolean; color: string }) {
  return (
    <svg
      aria-hidden
      width="24"
      height="24"
      viewBox="0 -12 24 24"
      className="pointer-events-none absolute -bottom-[12px] overflow-visible"
      style={{ [me ? "right" : "left"]: 0, transform: me ? "scaleX(-1)" : undefined }}
    >
      <path d="M8.8,-4.2 C10.2,-2 10.7,1 9.6,3.6 C9.1,4.8 8.3,5.8 8.4,6.5 C8.5,6.9 9.2,6.9 9.9,6.6 C13.4,5.3 16.6,2.6 20.8,0.2 L21,-8 L8,-8 Z" style={{ fill: color }} />
    </svg>
  );
}

function ReactionBadge({ reactions, me, theirs = false, tapback = false }: { reactions: string[]; me: boolean; theirs?: boolean; tapback?: boolean }) {
  const fill = theirs ? C.them : C.blue;
  const s = me ? -1 : 1;
  const n = reactions.length;
  const w = 33.7 + (n - 1) * 25;
  const cx = -2.4 * s;
  const cy = -10.9;
  const shapes = (p: Paint) => (
    <>
      <rect x={-w / 2 + cx + 32} y={cy - 16.85 + 32} width={w} height={33.7} rx={16.85} {...p} />
      <circle cx={8.2 * s + 32} cy={13.6 + 32 - 10.9} r={6.1} {...p} />
      <circle cx={15.2 * s + 32} cy={23.6 + 32 - 10.9} r={2.6} {...p} />
    </>
  );
  return (
    <motion.span
      className="pointer-events-none absolute top-0 size-[64px]"
      style={{ [me ? "left" : "right"]: -32, top: -32, transformOrigin: `${32 + cx}px ${32 + cy}px` }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ ...POP, delay: 0.05 }}
    >
      <svg aria-hidden width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0 overflow-visible">
        {shapes(paint("none", C.page, 2.6))}
        {shapes(paint(fill))}
      </svg>
      <span className="absolute flex items-center justify-center gap-[3px]" style={{ left: 32 + cx - w / 2, top: 32 + cy - 16.85, width: w, height: 33.7 }}>
        {reactions.map((u) => (
          <Reaction key={u} id={u} size={22} tapback={tapback} />
        ))}
      </span>
    </motion.span>
  );
}

function BubbleShape({ message, lifted, className }: { message: Message & { tail?: boolean }; lifted?: boolean; className?: string }) {
  const me = message.from === "me";
  const ref = React.useRef<HTMLDivElement>(null);
  useHugWidth(ref, message.text);
  const color = lifted ? C.lifted : me ? C.blue : C.them;
  const fill = React.useRef<HTMLSpanElement>(null);
  useSmoothCorners(fill, { radius: 20.5, smoothing: 0.6 });
  return (
    <div ref={ref} className={cn("relative max-w-[300px] px-[15.3px] py-[9.5px] text-left text-[17px] leading-[22px] tracking-[-0.02em]", me && !lifted ? "text-white" : "text-black dark:text-white", className)}>
      <span ref={fill} aria-hidden className="absolute inset-0" style={{ background: color, transition: "background-color 80ms" }} />
      {message.tail === false ? null : <Tail me={me} color={color} />}
      <span data-text="" className="relative">
        <EmojiText text={message.text} size={20} className="inline-block align-[-3px]" />
      </span>
    </div>
  );
}

const Bubble = React.forwardRef<HTMLDivElement, { message: Shown; gap: number; hidden: boolean; badgeHidden?: boolean; onOpen: (mode: IMessageMode) => void }>(function Bubble(
  { message, gap, hidden, badgeHidden, onOpen },
  ref,
) {
  const press = React.useRef<number | undefined>(undefined);
  const me = message.from === "me";
  const reacted = message.reactions.length > 0;
  return (
    <motion.div className={cn("flex", me ? "justify-end" : "justify-start")} initial={false} animate={{ paddingTop: gap + (reacted ? 28 : 0) }} transition={ROOM}>
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`${me ? "You" : "They"}: ${message.text}. Long-press to react, right-click for more.`}
        className="relative outline-none"
        onDoubleClick={() => onOpen("tapback")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen("tapback"))}
        onContextMenu={(e) => {
          e.preventDefault();
          clearTimeout(press.current);
          onOpen("menu");
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || e.ctrlKey) return;
          press.current = window.setTimeout(() => onOpen("tapback"), 450);
        }}
        onPointerUp={() => clearTimeout(press.current)}
        onPointerLeave={() => clearTimeout(press.current)}
        style={{ visibility: hidden ? "hidden" : undefined }}
      >
        <BubbleShape message={message} />
        {reacted && !badgeHidden ? (
          <ReactionBadge key={message.reactions.join()} reactions={message.reactions} me={me} theirs={message.reactedBy === "them"} tapback={message.tapback} />
        ) : null}
      </div>
    </motion.div>
  );
});

const PILL = { w: 375, h: 64, inset: 16.3, gap: 68.4 };

const tapbackTop = (rect: Rect) => Math.max(rect.top, 100 + PILL.gap);

function useReactionItems(message: Message, recentCount: number) {
  const recents = useFrequentEmoji({ limit: 16 }).items.slice(0, recentCount);
  const mine = (message.reactedBy ?? "me") === "me" ? message.reactions.at(-1) : undefined;
  return [
    ...TAPBACKS.map((t) => ({ key: `t${t.unified}`, unified: t.unified, label: t.label, tapback: true })),
    ...recents.map((u) => ({ key: `r${u}`, unified: u, label: u, tapback: false })),
  ].map((item) => ({ ...item, selected: item.unified === mine && item.tapback === Boolean(message.tapback) }));
}

type ReactHandler = (unified: string, tapback: boolean) => void;

function TapbackLayer({ rect, message, onReact, onEmoji, onClose }: { rect: Rect; message: Message; onReact: ReactHandler; onEmoji: () => void; onClose: () => void }) {
  const items = useReactionItems(message, 6);
  const top = tapbackTop(rect);
  const me = message.from === "me";
  const s = me ? -1 : 1;
  const pillX = me ? W - PILL.inset - PILL.w : PILL.inset;
  const pillY = top - PILL.gap;
  const anchor = me ? rect.left : rect.left + rect.width;
  const cx0 = Math.min(Math.max(anchor + 28.7 * s, pillX + 44), pillX + PILL.w - 44);

  const [p, setP] = React.useState(0);
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const R = lerp(22.3, 11.7);
  const cx = cx0 + lerp(0, -11) * s;
  const cy = lerp(top + 11.5, top - 2.7);
  const blob = { cx: cx0 + 14.7 * s, cy: top + 32.2, r: lerp(7, 0) };
  const neck = { cx: cx0 + 10.6 * s, cy: top + 27, r: lerp(5.5, 0) };
  const dot = { cx: cx0 + lerp(23, -3.7) * s, cy: lerp(top + 44.3, top + 14), r: 4 };

  const pill = (p: Paint) => (
    <motion.rect
      rx={PILL.h / 2}
      initial={{ x: cx0 - 22, y: top - 10.7 - 22, width: 44, height: 44 }}
      animate={{ x: pillX, y: pillY, width: PILL.w, height: PILL.h }}
      transition={{ ...SPRING, delay: 0.06 }}
      {...p}
    />
  );
  const thought = (p: Paint) => (
    <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: 0.03 }} style={{ transformOrigin: `${cx0}px ${top + 11.5}px`, transformBox: "view-box" }}>
      <circle cx={cx} cy={cy} r={R} {...p} />
      {fillets(cx, cy, R, pillY + PILL.h).map((d) => (
        <path key={d.slice(0, 12)} d={d} {...p} />
      ))}
      {blob.r > 0.5 ? (
        <>
          <circle {...neck} {...p} />
          <circle {...blob} {...p} />
        </>
      ) : null}
    </motion.g>
  );
  const dotShape = (p: Paint) => (
    <motion.circle
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ ...POP, delay: 0.14 }}
      {...dot}
      {...p}
      style={{ ...p.style, transformOrigin: `${dot.cx}px ${dot.cy}px`, transformBox: "view-box" }}
    />
  );

  return (
    <motion.div className="absolute inset-0 z-20" onPointerDown={(e) => e.target === e.currentTarget && onClose()} exit={{ opacity: 0, transition: OUT }}>
      <div className="absolute" style={{ left: rect.left, top, width: rect.width }}>
        <BubbleShape message={message} lifted />
      </div>
      <Union layers={GLASS} style={{ filter: "drop-shadow(0 2px 6px rgb(0 0 0 / 0.03))" }}>
        {(p) => (
          <>
            {pill(p)}
            {thought(p)}
            {dotShape(p)}
          </>
        )}
      </Union>
      <motion.button
        type="button"
        aria-label="More emoji"
        onClick={onEmoji}
        className="absolute flex items-center justify-center rounded-full"
        style={{ left: cx - R, top: cy - R, width: R * 2, height: R * 2, opacity: 1 - p * 2.5 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...POP, delay: 0.03 }}
      >
        <Grin size={23.4} className="text-[#9d9da1] dark:text-[#8d8d93]" />
      </motion.button>
      <motion.div
        role="toolbar"
        aria-label="Tapbacks"
        className="absolute overflow-x-auto overflow-y-hidden rounded-full [scrollbar-width:none]"
        style={{ left: pillX, top: pillY, width: PILL.w, height: PILL.h }}
        onScroll={(e) => setP(Math.min(1, e.currentTarget.scrollLeft / 70))}
        initial={{ clipPath: `inset(0 ${PILL.w - 60}px 0 0 round 32px)` }}
        animate={{ clipPath: "inset(0 0px 0 0 round 32px)" }}
        transition={{ ...SPRING, delay: 0.06 }}
      >
        <div className="flex h-full w-max items-center pr-[7px] pl-[7.2px]">
          {items.map((t, i) => (
            <motion.button
              key={t.key}
              type="button"
              aria-label={t.selected ? `${t.label} (remove)` : t.label}
              aria-pressed={t.selected}
              onClick={() => onReact(t.unified, t.tapback)}
              className="relative flex h-[64px] w-[49px] shrink-0 items-center justify-center rounded-full"
              initial={{ scale: 0.5, opacity: 0, filter: "blur(4px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)", transition: { ...POP, delay: 0.12 + Math.min(i, 8) * 0.028 } }}
              whileTap={{ scale: 0.82 }}
              whileHover={{ scale: 1.12 }}
            >
              {t.selected ? (
                <span aria-hidden className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full" style={{ width: 46, height: 46, background: C.blue }} />
              ) : null}
              <span className="relative flex">
                <Reaction id={t.unified} size={28.5} tapback={t.tapback} />
              </span>
            </motion.button>
          ))}
          <button type="button" aria-label="More emoji" onClick={onEmoji} className="flex h-[64px] w-[49px] shrink-0 items-center justify-center">
            <Grin size={24} className="text-[#a5a5aa] dark:text-[#8d8d93]" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const MENU = {
  w: 255,
  h: 365.3,
  radius: 27,
  smoothing: 0.4,
  dx: 26.5,
  dy: 22.3,
  cell: 38.6,
  gridLeft: 11.9,
  rows: [28.5, 83.1],
  sizes: [26.5, 19.4],
  iconX: 41.2,
  textX: 65.8,
  details: 141.2,
  divider: { y: 173.3, left: 24.8, right: 25.5 },
  actions: [205.6, 248.3, 291, 333.7],
  font: 18,
};

function TapbackDetailsGlyph() {
  const circles = [
    { cx: 8.1, cy: 8.3, r: 7.6 },
    { cx: 15.1, cy: 14.1, r: 1.9 },
  ];
  return (
    <svg aria-hidden width="20.3" height="20.3" viewBox="0 0 20.3 20.3" fill="none" className="overflow-visible">
      {circles.map((c) => (
        <circle key={c.cx} {...c} stroke="currentColor" strokeWidth={2.7} />
      ))}
      {circles.map((c) => (
        <circle key={c.cx} {...c} style={{ fill: C.menu }} />
      ))}
      <path d="M8.1,4.9 V11.7 M4.7,8.3 H11.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={18.6} cy={18.6} r={1.6} fill="currentColor" />
    </svg>
  );
}

function SelectGlyph() {
  return (
    <svg aria-hidden width="13.7" height="22" viewBox="0 0 13.7 22" fill="none">
      <path d="M1.5,1.5 V13.7 Q1.5,15.6 3.4,15.6 H12.2 M1.5,5.3 H10.3 Q12.2,5.3 12.2,7.2 V20.5" stroke="currentColor" strokeWidth={1.35} strokeLinejoin="round" />
      <circle cx={1.5} cy={1.5} r={1.5} fill="currentColor" />
      <circle cx={12.2} cy={20.5} r={1.5} fill="currentColor" />
    </svg>
  );
}

const MENU_ACTIONS: { label: string; icon: React.ReactNode }[] = [
  { label: "Copy", icon: <SFDocumentOnDocument size={21.8} /> },
  { label: "Translate", icon: <SFTranslate size={26.8} /> },
  { label: "Select", icon: <SelectGlyph /> },
  { label: "More…", icon: <SFEllipsisCircle size={17.3} /> },
];

function MenuLayer({ rect, message, onReact, onEmoji, onClose }: { rect: Rect; message: Message; onReact: ReactHandler; onEmoji: () => void; onClose: () => void }) {
  const items = useReactionItems(message, 5);
  const me = message.from === "me";
  const left = Math.min(Math.max(me ? rect.left + rect.width - MENU.dx - MENU.w : rect.left + MENU.dx, PILL.inset), W - PILL.inset - MENU.w);
  const below = rect.top + MENU.dy;
  const top = below + MENU.h <= H - 100 ? below : Math.max(60, rect.top + rect.height - MENU.dy - MENU.h);
  const origin = `${rect.left + rect.width / 2 - left}px ${rect.top + rect.height / 2 - top}px`;
  const card = React.useRef<HTMLDivElement>(null);
  useSmoothCorners(card, { radius: MENU.radius, smoothing: MENU.smoothing });
  const rows = [items.slice(0, 6), [...items.slice(6, 11), null]];
  const copy = () => {
    navigator.clipboard?.writeText(message.text).catch(() => {});
    onClose();
  };
  return (
    <motion.div className="absolute inset-0 z-20" onPointerDown={(e) => e.target === e.currentTarget && onClose()} onContextMenu={(e) => e.preventDefault()} exit={{ opacity: 0, transition: OUT }}>
      <motion.div
        role="menu"
        aria-label="Message actions"
        className="absolute"
        style={{ left, top, width: MENU.w, height: MENU.h, transformOrigin: origin, filter: `drop-shadow(0 0 0.3px ${ld("rgb(0 0 0 / 0.75)", "rgb(255 255 255 / 0.2)")}) drop-shadow(0 2px 5px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 22px rgb(0 0 0 / 0.08))` }}
        initial={{ scale: 0.25, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.42, bounce: 0.16 }}
      >
        <div ref={card} className="absolute inset-0" style={{ background: C.menu }} />
        {rows.map((row, r) =>
          row.map((t, i) => {
            const style = { left: MENU.gridLeft + i * MENU.cell, top: MENU.rows[r]! - 22, width: MENU.cell, height: 44 };
            if (!t)
              return (
                <button key="more" type="button" role="menuitem" aria-label="More emoji" onClick={onEmoji} className="absolute flex items-center justify-center rounded-[12px] hover:bg-[#e9f3fc] dark:hover:bg-[#0a84ff]/20" style={style}>
                  <Grin size={18} className="text-black dark:text-white" />
                </button>
              );
            return (
              <button
                key={t.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={t.selected}
                aria-label={t.selected ? `${t.label} (remove)` : t.label}
                onClick={() => onReact(t.unified, t.tapback)}
                className={cn("absolute flex items-center justify-center rounded-[12px]", t.selected ? "bg-[#e9e9eb] dark:bg-[#3a3a3c]" : "hover:bg-[#e9f3fc] dark:hover:bg-[#0a84ff]/20")}
                style={style}
              >
                <Reaction id={t.unified} size={MENU.sizes[r]!} tapback={t.tapback} />
              </button>
            );
          }),
        )}
        <MenuRow y={MENU.details} icon={<TapbackDetailsGlyph />} label="Tapback Details…" onClick={onClose} />
        <span aria-hidden className="absolute h-px bg-[#e6e6e6] dark:bg-[#3a3a3c]" style={{ top: MENU.divider.y, left: MENU.divider.left, right: MENU.divider.right, height: 1 }} />
        {MENU_ACTIONS.map((a, i) => (
          <MenuRow key={a.label} y={MENU.actions[i]!} icon={a.icon} label={a.label} onClick={a.label === "Copy" ? copy : onClose} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function MenuRow({ y, icon, label, onClick }: { y: number; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="absolute inset-x-[8px] flex h-[42px] items-center rounded-[12px] text-black outline-none hover:bg-black/[0.04] focus-visible:bg-black/[0.06] dark:text-white dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.1]" style={{ top: y - 21 }}>
      <span aria-hidden className="absolute flex size-[30px] -translate-x-1/2 items-center justify-center" style={{ left: MENU.iconX - 8 }}>
        {icon}
      </span>
      <span className="absolute leading-[22px] tracking-[-0.022em] whitespace-nowrap" style={{ left: MENU.textX - 8, fontSize: MENU.font }}>
        {label}
      </span>
    </button>
  );
}

const CARD = { w: 182, h: 180, left: (W - 182) / 2, top: 56, radius: 44 };
const THOUGHT = { cx: 100, cy: 76, r: 50, emoji: 54 };
const TRAIL = [
  { cx: 66, cy: 117, r: 9 },
  { cx: 54, cy: 133, r: 4.5 },
];
const AVATAR = { cx: 40, cy: 152, r: 17 };

function IncomingReaction({ unified, phase, to, initials, avatar, onArrive }: Incoming & { phase: "in" | "fly"; to?: { x: number; y: number }; initials: string; avatar?: React.ReactNode; onArrive: () => void }) {
  const card = React.useRef<HTMLDivElement>(null);
  useSmoothCorners(card, { radius: CARD.radius, smoothing: 0.6 });
  const fly = phase === "fly" && to;
  const k = 16.85 / THOUGHT.r;
  const ox = CARD.left + THOUGHT.cx;
  const oy = CARD.top + THOUGHT.cy;
  const fade = { opacity: fly ? 0 : 1, transition: { duration: 0.18 } };
  return (
    <motion.div
      aria-live="polite"
      aria-label="Reaction received"
      className="pointer-events-none absolute z-30"
      style={{ left: CARD.left, top: CARD.top, width: CARD.w, height: CARD.h, transformOrigin: `${THOUGHT.cx}px ${THOUGHT.cy}px` }}
      initial={{ scale: 0.6, opacity: 0, y: -24 }}
      animate={fly ? { scale: k, opacity: 1, x: to.x - ox, y: to.y - oy } : { scale: 1, opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={fly ? { type: "spring", duration: 0.5, bounce: 0.1 } : { type: "spring", duration: 0.5, bounce: 0.3 }}
      onAnimationComplete={() => fly && onArrive()}
    >
      <motion.div className="absolute inset-0" animate={fade}>
        <div className="absolute inset-0" style={{ borderRadius: CARD.radius + 4, boxShadow: `0 0 0 0.4px ${ld("rgb(0 0 0 / 0.16)", "rgb(255 255 255 / 0.18)")}, 0 10px 30px rgb(0 0 0 / 0.12)` }} />
        <div ref={card} className="absolute inset-0 backdrop-blur-[30px] backdrop-saturate-[1.6]" style={{ background: `linear-gradient(${ld("rgb(255 255 255 / 0.72)", "rgb(58 58 60 / 0.72)")}, ${ld("rgb(246 246 248 / 0.66)", "rgb(44 44 46 / 0.66)")})` }} />
      </motion.div>
      <svg aria-hidden width={CARD.w} height={CARD.h} className="absolute inset-0 overflow-visible" style={{ filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.08))" }}>
        <g style={{ fill: fly ? C.them : C.thought, transition: "fill 0.3s" }}>
          <circle cx={THOUGHT.cx} cy={THOUGHT.cy} r={THOUGHT.r} />
          {TRAIL.map((c) => (
            <motion.circle key={c.cx} {...c} animate={fade} />
          ))}
        </g>
      </svg>
      <span className="absolute flex items-center justify-center" style={{ left: THOUGHT.cx - THOUGHT.r, top: THOUGHT.cy - THOUGHT.r, width: THOUGHT.r * 2, height: THOUGHT.r * 2 }}>
        <Reaction id={unified} size={THOUGHT.emoji} tapback={false} />
      </span>
      <motion.span
        className={cn(
          "absolute flex items-center justify-center overflow-hidden rounded-full",
          !avatar && "bg-[linear-gradient(rgb(163_188_222),rgb(117_127_189))] text-[13px] font-bold tracking-[0.01em] text-white",
        )}
        style={{ left: AVATAR.cx - AVATAR.r, top: AVATAR.cy - AVATAR.r, width: AVATAR.r * 2, height: AVATAR.r * 2 }}
        animate={fade}
      >
        {avatar ?? initials}
      </motion.span>
    </motion.div>
  );
}

const SHEET_TOP = 485.3;

function EmojiLayer({ rect, message, onClose }: { rect: Rect; message: Message; onClose: () => void }) {
  const me = message.from === "me";
  const s = me ? -1 : 1;
  const top = Math.min(rect.top, SHEET_TOP - 14 - rect.height);
  const edge = me ? rect.left + rect.width : rect.left;
  const big = { cx: edge + 37.5 * s, cy: top - 42.3, r: 37.7 };
  const bump = { cx: edge + 55.2 * s, cy: top - 6.2, r: 7.6 };
  const dot = { cx: edge + 63.7 * s, cy: top + 6.6, r: 4.6 };
  return (
    <motion.div className="absolute inset-0 z-20" onPointerDown={(e) => e.target === e.currentTarget && onClose()} exit={{ opacity: 0, transition: OUT }}>
      <motion.div className="absolute" style={{ left: rect.left, width: rect.width }} initial={{ top: rect.top }} animate={{ top }} transition={SPRING}>
        <BubbleShape message={message} lifted />
      </motion.div>
      <motion.div className="absolute inset-0" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING} style={{ transformOrigin: `${bump.cx}px ${bump.cy}px` }}>
        <Union layers={GLASS} style={{ filter: "drop-shadow(0 2px 6px rgb(0 0 0 / 0.03))" }}>
          {(paint) => (
            <>
              <circle {...big} {...paint} />
              <circle {...bump} {...paint} />
              <circle {...dot} {...paint} />
            </>
          )}
        </Union>
        <span aria-hidden className="absolute flex items-center justify-center" style={{ left: big.cx - big.r, top: big.cy - big.r, width: big.r * 2, height: big.r * 2 }}>
          <Grin size={38.5} className="text-[#bcbcbc] dark:text-[#6c6c70]" />
        </span>
      </motion.div>
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute flex size-[27px] items-center justify-center rounded-full", glass)}
        style={{ left: big.cx + 32.9 * s - 13.5, top: big.cy - 27.4 - 13.5 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...POP, delay: 0.15 }}
      >
        <SFXmark size={10} className="text-black [&_path]:stroke-black [&_path]:stroke-[0.6px] dark:text-white dark:[&_path]:stroke-white" />
      </motion.button>
    </motion.div>
  );
}

const IOS_GROUPS: { id: EmojiRecord["group"]; label: string; icon: React.ReactNode }[] = [
  { id: "smileys_people", label: "Smileys & People", icon: <SFFaceSmiling size={18.5} /> },
  { id: "animals_nature", label: "Animals & Nature", icon: <I.DogFace size={19} strokeWidth={1.7} /> },
  { id: "food_drink", label: "Food & Drink", icon: <I.Burger size={19} strokeWidth={1.7} /> },
  { id: "activities", label: "Activity", icon: <SFSoccerball size={18.5} /> },
  { id: "travel_places", label: "Travel & Places", icon: <SFCar size={18.5} /> },
  { id: "objects", label: "Objects", icon: <SFLightbulb size={18.5} /> },
  { id: "symbols", label: "Symbols", icon: <SymbolsGlyph /> },
  { id: "flags", label: "Flags", icon: <SFFlag size={17.5} /> },
];

function Grin({ size, className }: { size: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10.75" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <ellipse cx="8.6" cy="9.1" rx="1.3" ry="1.5" fill="currentColor" />
      <ellipse cx="15.4" cy="9.1" rx="1.3" ry="1.5" fill="currentColor" />
      <path d="M5.4,12.7 Q12,11.5 18.6,12.7 C18.3,16.7 15.5,19.2 12,19.2 C8.5,19.2 5.7,16.7 5.4,12.7Z" fill="currentColor" />
      <path d="M6.9,13.9 Q12,13 17.1,13.9 L16.8,15.1 Q12,14.4 7.2,15.1Z" style={{ fill: ld("#efefef", "#3a3a3c") }} />
    </svg>
  );
}

function SymbolsGlyph() {
  return (
    <span aria-hidden className="flex flex-col items-center text-[10px] leading-[9.5px] font-medium tracking-[-0.02em]">
      <span>T♪</span>
      <span>&amp;%</span>
    </span>
  );
}

const K = { col: 46, row: 38.4, rows: 5, left: 2.9, gap: 13.8, label: 61.6, grid: 81.2, labelInset: 9.8, emoji: 31.5 };
const TAB = { first: 29 - 15 - 0.3, pitch: 37.84 };
const MAX_VERSION = 16;

const KEYBOARD_CATEGORIES: CategoryOption[] = [{ id: "suggested", name: "Frequently Used", icon: <SFClock size={20} /> }, ...IOS_GROUPS.map((g) => ({ id: g.id, name: g.label, icon: g.icon }))];

const KEYBOARD_SIZES = {
  "--emoji-size": `${K.emoji}px`,
  "--emoji-font-family": 'var(--site-emoji-font,) -apple-system, system-ui, "SF Pro Text", sans-serif',
  "--emoji-cell-width": `${K.col}px`,
  "--emoji-cell-height": `${K.row}px`,
  "--emoji-header-height": `${K.grid - K.label}px`,
  "--emoji-list-padding": `${K.left}px`,
  "--emoji-section-gap": `${K.gap}px`,
  "--emoji-section-min-width": "150px",
} as React.CSSProperties;
const SHEET: React.CSSProperties = {
  background: C.sheet,
  boxShadow: `inset 0 0 0 0.34px ${ld("rgb(0 0 0 / 0.35)", "rgb(255 255 255 / 0.12)")}, inset 0 1px 0 0.7px ${ld("rgb(255 255 255 / 0.6)", "rgb(255 255 255 / 0.08)")}`,
};

function EmojiKeyboard({ onPick, onDelete, className }: { onPick: (s: EmojiSelection) => void; onDelete?: () => void; className?: string }) {
  const sheet = React.useRef<HTMLDivElement>(null);
  useSmoothCorners(sheet, {
    topLeft: { radius: 30, smoothing: 0.6 },
    topRight: { radius: 30, smoothing: 0.6 },
    bottomLeft: { radius: 60, smoothing: 0.6 },
    bottomRight: { radius: 60, smoothing: 0.6 },
  });
  return (
    <div ref={sheet} data-emoji-keyboard="" className={cn("relative h-full w-full", className)} style={SHEET}>
      <EmojiPicker.Root
        onSelect={(selection) => onPick(selection)}
        categories={KEYBOARD_CATEGORIES}
        frequent={30}
        emojiVersion={MAX_VERSION}
        searchLimit={60}
        className="absolute inset-0 flex flex-col overflow-clip"
        style={KEYBOARD_SIZES}
      >
        <EmojiPicker.Search className="absolute top-[10.7px] right-[9px] left-[9px] flex h-[40px] items-center rounded-[18px]" style={{ background: C.search }}>
          <EmojiPicker.SearchInput aria-label="Search Emoji" placeholder="Search Emoji" className="h-full w-full rounded-[18px] bg-transparent pr-4 pl-[44px] text-[17px] tracking-[-0.01em] outline-none placeholder:text-[#838589] dark:placeholder:text-[#98989f]">
            <EmojiPicker.SearchClear className="absolute top-1/2 right-[10px] flex size-[20px] -translate-y-1/2 items-center justify-center rounded-full bg-[#a5a7ac] text-white dark:bg-[#6c6c70] dark:text-[#2b2b2d]" />
          </EmojiPicker.SearchInput>
          <SFMagnifyingglass size={17} className="pointer-events-none absolute top-[11.7px] left-[19.7px] text-[#838589] dark:text-[#98989f]" />
        </EmojiPicker.Search>
        <EmojiPicker.Viewport className="absolute inset-x-0 [scrollbar-width:none]" style={{ top: K.label, height: K.grid - K.label + K.rows * K.row }}>
          <EmojiPicker.List orientation="horizontal" rows={K.rows} renderEmptyState={({ status }) => status === "empty" && <div className="absolute top-[60px] w-[396px] text-center text-[15px] text-[#8e8e93] dark:text-[#8d8d93]">No Emoji Found</div>}>
            {() => (
              <EmojiPicker.ListSection>
                <EmojiPicker.ListSectionTitle className="pl-[9.8px] text-[12.25px] leading-[16px] font-semibold tracking-[-0.015em] whitespace-nowrap text-[#8b8d92] uppercase dark:text-[#8d8d93]" />
                <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className={cn(CELL, "rounded-[10px] active:bg-black/[0.06] focus-visible:bg-black/[0.06] data-focused:bg-black/[0.06] dark:active:bg-white/[0.1] dark:focus-visible:bg-white/[0.1] dark:data-focused:bg-white/[0.1]")} />}</EmojiPicker.ListItems>
              </EmojiPicker.ListSection>
            )}
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
        <EmojiPicker.CategoryNav className="absolute top-[278.7px] flex h-[30px]" style={{ left: TAB.first, gap: TAB.pitch - 30, color: C.icon }}>
          {() => <EmojiPicker.CategoryNavTab className="relative flex size-[30px] shrink-0 items-center justify-center rounded-full data-active:bg-[#bfc1c8] data-active:text-[#3c3c41] dark:data-active:bg-[#5a5a5e] dark:data-active:text-white" />}
        </EmojiPicker.CategoryNav>
        <button type="button" aria-label="Delete" onClick={onDelete} className="absolute top-[278.7px] flex h-[30px] w-[30px] items-center justify-center text-[#1c1c1e] dark:text-white" style={{ left: 377.2 - 15 }}>
          <SFDeleteLeft size={22} />
        </button>
      </EmojiPicker.Root>
    </div>
  );
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const segment = (text: string) => (segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : [text]);

const BUFO: Contact = { name: "Bufo", avatar: <img src={avatarFor("Bufo")} alt="" className="size-full bg-[#e6e6eb] object-contain dark:bg-[#3a3a3c]" /> };

export function AppleScene({ scale = 0.68 }: { scale?: number }) {
  return (
    <IPhoneFrame scale={scale} className="mx-auto">
      <IMessageScreen contact={BUFO} />
    </IPhoneFrame>
  );
}
