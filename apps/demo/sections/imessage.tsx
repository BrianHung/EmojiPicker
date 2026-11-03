// iOS 27.2 Messages on an iPhone 18 Pro (402×874 pt), measured from simulator captures
// (apps/demo/capture/ref/imessage27-*.png, 3x) and timed from the screen recording
// (imessage27-recording.mp4). Long-press / double-click / right-click a bubble for the
// tapback pill and its "thought bubble"; the smiley opens the emoji keyboard as a bottom
// sheet (shadcn Drawer, portalled into the screen). The page's hero wraps it in a Device
// Hub iPhone frame.
import * as React from "react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { useSmoothCorners } from "@lisse/react";
import { Emoji, EmojiPicker, useEmojiStatus, useEmojiStore, useFrequentEmoji, type CategoryOption, type EmojiRecord, type EmojiSelection } from "@brianhung/emoji-picker";
import { cn } from "../components/code";
import { useAutocompleteInput } from "../components/emoji-autocomplete";
import { Drawer, DrawerContent, DrawerTitle } from "../components/ui/drawer";
import { skinById } from "../examples";
import * as I from "../examples/icons";
import { SkinAutocomplete } from "../examples/variants";
import { IPhoneFrame } from "./iphone-frame";
// Apple's own symbols where iOS uses one (SF Symbols 7 via sf-symbols-lib, one import per icon).
import { SFCar } from "sf-symbols-lib/monochrome/SFCar";
import { SFChevronLeft } from "sf-symbols-lib/monochrome/SFChevronLeft";
import { SFChevronRight } from "sf-symbols-lib/monochrome/SFChevronRight";
import { SFClock } from "sf-symbols-lib/monochrome/SFClock";
import { SFDeleteLeft } from "sf-symbols-lib/monochrome/SFDeleteLeft";
import { SFFaceSmiling } from "sf-symbols-lib/monochrome/SFFaceSmiling";
import { SFFlag } from "sf-symbols-lib/monochrome/SFFlag";
import { SFLightbulb } from "sf-symbols-lib/monochrome/SFLightbulb";
import { SFLockFill } from "sf-symbols-lib/monochrome/SFLockFill";
import { SFMagnifyingglass } from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import { SFPlus } from "sf-symbols-lib/monochrome/SFPlus";
import { SFSoccerball } from "sf-symbols-lib/monochrome/SFSoccerball";
import { SFWifi } from "sf-symbols-lib/monochrome/SFWifi";
import { SFXmark } from "sf-symbols-lib/monochrome/SFXmark";

const apple = skinById("apple");

export type IMessageMode = "idle" | "tapback" | "emoji";
export type Message = { id: number; from: "me" | "them"; text: string; reactions: string[]; time?: string };
/** A message as drawn: only the last bubble in a run from one sender has a tail. */
type Shown = Message & { tail: boolean };
export type Contact = { name: string; initials?: string; /** @deprecated use initials */ initial?: string; avatar?: React.ReactNode };

const W = 402;
const H = 874;
/** Sampled from the captures (sRGB). */
const C = {
  page: "#fcfcfc",
  them: "#e6e6e8",
  blue: "#0086fd",
  text: "#000",
  secondary: "#8a8a8e",
  /** The page turns 252 → 226 behind the tapback pill: 10% black. */
  dim: "rgb(0 0 0 / 0.1)",
  hairline: "rgb(0 0 0 / 0.26)",
  sheet: "#dbdee1",
  search: "#e8ebee",
  placeholder: "#838589",
  icon: "#76787d",
  tab: "#bfc1c8",
};

/**
 * Timing from imessage27-recording.mp4 (80 fps): the dim fades in over ~330 ms; the
 * thought circle appears first (~50 ms), the pill grows out of it to full width by
 * ~350 ms with a small overshoot; tapbacks fade/blur in left to right; the sheet rises
 * in ~230 ms and settles by ~350 ms; it drops in ~100 ms; the reaction pops while the
 * list opens room for it over ~250 ms.
 */
const SPRING: Transition = { type: "spring", duration: 0.42, bounce: 0.2 };
const POP: Transition = { type: "spring", duration: 0.35, bounce: 0.32 };
const ROOM: Transition = { type: "spring", duration: 0.28, bounce: 0 };
const FADE: Transition = { duration: 0.33, ease: [0.2, 0, 0, 1] };
const OUT: Transition = { duration: 0.15, ease: "easeIn" };

export const ALEX: Message[] = [
  { id: 1, from: "them", text: "are we still on for dinner tonight?", reactions: [], time: "Today 6:02 PM" },
  { id: 2, from: "me", text: "yes!! 7pm at the ramen place", reactions: ["1fa77"] },
  { id: 3, from: "them", text: "perfect, I'll grab a table 🍜", reactions: [] },
];

// ---------------------------------------------------------------------------
// Tapbacks: iOS draws these as its own glyphs; heart, thumbs and !! are close as
// emoji, "HA HA" and "?" are drawn here.

function Haha({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="flex flex-col items-center leading-[0.8] font-black tracking-[-0.05em]"
      style={{ fontSize: size * 0.56, fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui", color: "#5fd0ff", WebkitTextStroke: `${size * 0.045}px #1592f2`, paintOrder: "stroke fill" }}
    >
      <span>HA</span>
      <span>HA</span>
    </span>
  );
}

function Question({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="font-black"
      style={{
        fontSize: size * 1.18,
        lineHeight: 1,
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui",
        background: "linear-gradient(#cdb6ff, #8d63f2)",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }}
    >
      ?
    </span>
  );
}

export const TAPBACKS: { id: string; label: string }[] = [
  { id: "1fa77", label: "Heart" },
  { id: "1f44d", label: "Like" },
  { id: "1f44e", label: "Dislike" },
  { id: "haha", label: "Haha" },
  { id: "203c-fe0f", label: "Emphasize" },
  { id: "question", label: "Question" },
];

function Reaction({ id, size }: { id: string; size: number }) {
  if (id === "haha") return <Haha size={size} />;
  if (id === "question") return <Question size={size} />;
  return <Emoji unified={id} size={size} style={{ fontSize: size, lineHeight: 1 }} />;
}

// ---------------------------------------------------------------------------
// Unions of shapes drawn as one outline (the pill + thought bubble, a reaction): every
// layer paints all shapes, strokes first, then fills on top, so overlaps merge.

type Paint = { fill: string; stroke?: string; strokeWidth?: number };
type Layer = Paint & { erode?: number };

function Union({ layers, children, className, style }: { layers: Layer[]; children: (paint: Paint) => React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={cn("pointer-events-none absolute top-0 left-0 overflow-visible", className)} style={style}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ececec" />
          <stop offset="1" stopColor="#f0f0f0" />
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
          {children({ fill: l.fill === "glass" ? `url(#${id}g)` : l.fill, stroke: l.stroke, strokeWidth: l.strokeWidth })}
        </g>
      ))}
    </svg>
  );
}

/** iOS 27 glass: a hairline, a bright rim, a soft grey body. */
const GLASS: Layer[] = [{ fill: "none", stroke: "rgb(0 0 0 / 0.2)", strokeWidth: 1 }, { fill: "#fdfdfd" }, { fill: "glass", erode: 0.65 }];

/** Concave fillets where a circle hangs off a horizontal edge at `y` (the pill's bottom). */
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

// ---------------------------------------------------------------------------

type Rect = { top: number; left: number; width: number; height: number };

export function IMessageScreen({
  messages: initial = ALEX,
  contact = { name: "Alex", initials: "A" },
  initialMode = "tapback",
  scale,
  placeholder = "iMessage",
  time = "9:41",
  notice = false,
}: {
  placeholder?: string;
  messages?: Message[];
  contact?: Contact;
  initialMode?: IMessageMode;
  /** Render the bare screen scaled (no device frame). Leave unset inside IPhoneFrame or at 1:1. */
  scale?: number;
  /** Status bar clock. */
  time?: string;
  /** The unknown-sender spam notice under the conversation. */
  notice?: boolean;
}) {
  const [messages, setMessages] = React.useState(initial);
  const shown = React.useMemo<Shown[]>(() => messages.map((m, i, all) => ({ ...m, tail: i === all.length - 1 || all[i + 1]!.from !== m.from || Boolean(all[i + 1]!.time) })), [messages]);
  const [selected, setSelected] = React.useState<{ id: number; rect: Rect } | null>(null);
  const [mode, setMode] = React.useState<IMessageMode>("idle");
  // The lifted copy covers the original until the layers have gone.
  const [covering, setCovering] = React.useState(false);
  const screen = React.useRef<HTMLDivElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const bubbles = React.useRef(new Map<number, HTMLElement>());

  const open = React.useCallback((id: number, next: IMessageMode = "tapback") => {
    const el = bubbles.current.get(id);
    const frame = screen.current;
    if (!el || !frame) return;
    const f = frame.getBoundingClientRect();
    // Page pixels → screen points: the phone may be scaled (by us or a parent).
    const k = f.width / frame.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    setSelected({ id, rect: { top: (r.top - f.top) / k, left: (r.left - f.left) / k, width: r.width / k, height: r.height / k } });
    setMode(next);
    setCovering(true);
    setCompose(false);
  }, []);
  const close = React.useCallback(() => setMode("idle"), []);
  // Compose mode: the "+" opens the same sheet as a keyboard; picks go into the composer.
  const [compose, setCompose] = React.useState(false);
  const insert = React.useRef<(text: string) => void>(() => {});
  const erase = React.useRef<() => void>(() => {});
  const modeRef = React.useRef(mode);
  modeRef.current = mode;

  // Open on the last message, so the demo explains itself.
  React.useEffect(() => {
    if (initialMode === "idle") return;
    const t = setTimeout(() => open(messages[messages.length - 1]!.id, initialMode), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One tapback per person in iOS 27: picking another replaces it, the same one removes it.
  const react = (id: number, unified: string) => {
    if (unified) setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, reactions: m.reactions.at(-1) === unified ? [] : [unified] } : m)));
    close();
  };
  const send = (text: string) => {
    setMessages((ms) => [...ms, { id: Date.now(), from: "me", text, reactions: [] }]);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
  };

  const message = selected ? shown.find((m) => m.id === selected.id) : undefined;
  const active = mode !== "idle" && selected && message;

  const body = (
    <div
      ref={screen}
      data-imessage=""
      className="relative overflow-hidden text-black antialiased select-none"
      style={{
        // The phone is light-mode iOS whatever the page theme: light-dark() tokens inside resolve to light.
        colorScheme: "light",
        width: W,
        height: H,
        background: C.page,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        // A containing block for the drawer's fixed layers: they stay inside the screen.
        contain: "layout paint",
      }}
    >
      <div ref={scroller} className="absolute inset-0 overflow-y-auto px-[16.3px] pt-[171px] pb-[110px] [scrollbar-width:none]" onScroll={() => modeRef.current === "tapback" && close()}>
        <Intro />
        <div className="flex flex-col">
          {shown.map((m, i) => (
            <React.Fragment key={m.id}>
              {m.time ? <Timestamp text={m.time} first={i === 0} /> : null}
              <Bubble
                message={m}
                gap={i === 0 || m.time ? 0 : messages[i - 1]!.from === m.from ? 2 : 8}
                hidden={Boolean((active || covering) && selected?.id === m.id)}
                ref={(el) => {
                  if (el) bubbles.current.set(m.id, el);
                  else bubbles.current.delete(m.id);
                }}
                onOpen={() => open(m.id)}
              />
            </React.Fragment>
          ))}
        </div>
        {notice ? <SpamNotice /> : null}
      </div>
      <Header contact={contact} />
      <StatusBar time={time} />
      {/* Tapping the conversation dismisses the compose keyboard. */}
      {compose ? <div className="absolute inset-0 z-[3]" onPointerDown={() => setCompose(false)} /> : null}
      <Composer onSend={send} placeholder={placeholder} emojiOpen={compose} onEmoji={() => setCompose((c) => !c)} insert={insert} erase={erase} />

      <AnimatePresence onExitComplete={() => modeRef.current === "idle" && setCovering(false)}>
        {active ? (
          <motion.div
            key="dim"
            className="absolute inset-0 z-10"
            style={{ background: C.dim }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { ...FADE, duration: 0.4 } }}
            transition={FADE}
            onPointerDown={close}
          />
        ) : null}
        {active && mode === "tapback" ? (
          <TapbackLayer key="tapback" rect={selected.rect} message={message} onReact={(u) => react(message.id, u)} onEmoji={() => setMode("emoji")} onClose={close} />
        ) : null}
        {active && mode === "emoji" ? <EmojiLayer key="emoji" rect={selected.rect} message={message} onClose={close} /> : null}
      </AnimatePresence>

      {/* Pointer dismissal is ours (the dim layer, the compose overlay, the "+"), so a tap on "+" toggles cleanly. */}
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
          initialFocus={false}
          finalFocus={false}
          // iOS sheet: 0.3 pt in from the screen edges, its top at 485.3 pt, to the bottom.
          className="top-auto! right-[0.3px]! bottom-0! left-[0.3px]! h-[388.7px]! max-h-none! border-0! bg-transparent! text-base text-black duration-[380ms] ease-[cubic-bezier(0.2,1.1,0.32,1)] after:hidden data-ending-style:duration-[140ms]"
        >
          <DrawerTitle className="sr-only">Emoji keyboard</DrawerTitle>
          <EmojiKeyboard onPick={(s) => (compose ? insert.current(s.emoji || `:${s.shortcode}:`) : message && react(message.id, s.unified))} onDelete={compose ? () => erase.current() : undefined} />
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

// ---------------------------------------------------------------------------
// Chrome: status bar, header, intro, composer.

function StatusBar({ time }: { time: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[54px]">
      <span className="absolute top-[21.7px] left-0 w-[164px] text-center text-[17.8px] leading-[22px] font-semibold tracking-[-0.01em]">{time}</span>
      {/* Dynamic Island. */}
      <span className="absolute top-[13.7px] left-[153.3px] h-[37.3px] w-[95.3px] rounded-full bg-black" />
      {/* No service: four grey dots, then wifi and battery. */}
      <span className="absolute top-[35.3px] left-[277px] flex gap-[1.7px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="size-[3.6px] rounded-full bg-[#b9b9bb]" />
        ))}
      </span>
      <SFWifi size={17} className="absolute top-[24.3px] left-[306px]" />
      <span className="absolute top-[25.5px] left-[333.3px] flex items-center">
        <span className="h-[12.3px] w-[26.3px] rounded-[4px] bg-black" />
        <span className="ml-[1px] h-[4.4px] w-[1.6px] rounded-r-[1px] bg-black" />
      </span>
    </div>
  );
}

/** White glass control: a hairline edge and a soft shadow. */
const glass = "bg-[linear-gradient(#fdfdfd,#f6f6f6)] shadow-[0_0_0_0.34px_rgb(0_0_0/0.38),0_1px_4px_rgb(0_0_0/0.025)]";

function Header({ contact }: { contact: Contact }) {
  const initials = contact.initials ?? contact.initial ?? contact.name.slice(0, 1);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-[160px] bg-[linear-gradient(#fcfcfc_70%,#fcfcfc00)]">
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
        <SFChevronRight size={10} className="text-[#a3a3a8]" />
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
    <div className="flex flex-col items-center text-[11.4px] leading-[13px] text-[#8a8a8e]">
      <span>iMessage</span>
      <span className="flex items-center gap-[3px]">
        <SFLockFill size={8} />
        Encrypted
      </span>
    </div>
  );
}

/** "Today 9:22 PM": the day in semibold. */
function Timestamp({ text, first }: { text: string; first: boolean }) {
  const match = text.match(/^(.*?)\s+(\d{1,2}:\d{2}\s?[AP]M)$/);
  return (
    <p className={cn("mb-[6.6px] text-center text-[11.2px] leading-[15px] whitespace-pre-line text-[#8a8a8e]", first ? "mt-[13px]" : "mt-[10px]")}>
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
    <div className="-ml-[1.3px] mt-[15px] flex w-[372px] flex-col items-center gap-[7.7px] text-center text-[11.4px] leading-[14.6px] font-medium tracking-[-0.012em] text-[#8a8a8e]">
      <p>If you did not expect this message from an unknown sender, it may be spam.</p>
      <span className="flex h-[23.7px] items-center rounded-full bg-[#e9e9eb] px-[9px] text-[11.6px] font-semibold tracking-[-0.01em] text-[#0a7cff]">Report Spam</span>
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

/** The composer rides up with the keyboard sheet in compose mode (its field 8 pt above the sheet). */
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
  // iMessage inserts the emoji itself; :shortcodes: typed in full are converted on send.
  const { value, setText, insertAtCaret, autocomplete, inputProps } = useAutocompleteInput<HTMLInputElement>({ limit: 6 });
  insert.current = insertAtCaret;
  // The keyboard's delete key: drop the last grapheme (an emoji is one).
  erase.current = () => setText(segment(value).slice(0, -1).join(""));
  const submit = () => {
    const text = store.replaceShortcodes(value).trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-[4] h-[96px] bg-[linear-gradient(#fcfcfc00,#fcfcfc_45%)]"
      initial={false}
      animate={{ y: emojiOpen ? -COMPOSE_LIFT : 0 }}
      transition={emojiOpen ? SPRING : { duration: 0.14, ease: "easeIn" }}
    >
      <div className="absolute inset-x-[16px] bottom-[77px] drop-shadow-[0_8px_24px_rgb(0_0_0/0.16)]">
        <Squircle radius={22}>
          <SkinAutocomplete skin={apple} autocomplete={autocomplete} className="rounded-none! border-0! shadow-none!" />
        </Squircle>
      </div>
      <button
        type="button"
        aria-label="Emoji"
        aria-expanded={emojiOpen}
        onClick={onEmoji}
        className={cn(
          "absolute top-[27.3px] left-[27.3px] flex size-[41.3px] items-center justify-center rounded-full text-[#1c1c1e] outline-none focus-visible:ring-2 focus-visible:ring-[#0086fd]",
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
          className="min-w-0 flex-1 bg-transparent text-[17px] tracking-[-0.01em] caret-[#0086fd] outline-none placeholder:text-[#bdbdc0]"
          onKeyDown={(e) => {
            if (autocomplete.onKeyDown(e)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Bubbles.

/**
 * Sets the bubble's width to its longest rendered line, so a wrapped bubble hugs its
 * text as in Messages (CSS keeps wrapped boxes at their max width). Done on the DOM:
 * the natural wrap has to be measured with no width set.
 */
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

/**
 * The tail: a small hook on the bubble's rounded bottom corner (them: left; me: mirrored).
 * Traced from the simulator at 3x, in pt from the bubble's bottom-left corner (y down):
 * it leaves the corner arc at (8.8, -4), bends in to (10.3, 1), curls to a tip at (8.4, 6.7),
 * then sweeps back up to the bottom edge at x≈21.
 */
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
      <path d="M8.8,-4.2 C10.2,-2 10.7,1 9.6,3.6 C9.1,4.8 8.3,5.8 8.4,6.5 C8.5,6.9 9.2,6.9 9.9,6.6 C13.4,5.3 16.6,2.6 20.8,0.2 L21,-8 L8,-8 Z" fill={color} />
    </svg>
  );
}

/** iOS 27 reaction: a filled circle with the emoji, a blob at its lower corner, then a dot. */
function ReactionBadge({ reactions, me }: { reactions: string[]; me: boolean }) {
  const s = me ? -1 : 1;
  // Relative to the bubble's top corner on the reaction side (them: top-right).
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
        <g fill="none" stroke={C.page} strokeWidth={2.6}>
          {shapes({ fill: "none" })}
        </g>
        <g fill={C.blue}>{shapes({ fill: C.blue })}</g>
      </svg>
      <span className="absolute flex items-center justify-center gap-[3px]" style={{ left: 32 + cx - w / 2, top: 32 + cy - 16.85, width: w, height: 33.7 }}>
        {reactions.map((u) => (
          <Reaction key={u} id={u} size={22} />
        ))}
      </span>
    </motion.span>
  );
}

function BubbleShape({ message, lifted, className }: { message: Message & { tail?: boolean }; lifted?: boolean; className?: string }) {
  const me = message.from === "me";
  const ref = React.useRef<HTMLDivElement>(null);
  useHugWidth(ref, message.text);
  const color = lifted ? "#ffffff" : me ? C.blue : C.them;
  // iOS bubbles have continuous (squircle) corners; the tail sits outside the clipped fill.
  const fill = React.useRef<HTMLSpanElement>(null);
  useSmoothCorners(fill, { radius: 20.5, smoothing: 0.6 });
  return (
    <div ref={ref} className={cn("relative max-w-[300px] px-[15.3px] py-[9.5px] text-left text-[17px] leading-[22px] tracking-[-0.02em]", me && !lifted ? "text-white" : "text-black", className)}>
      <span ref={fill} aria-hidden className="absolute inset-0" style={{ background: color, transition: "background-color 80ms" }} />
      {message.tail === false ? null : <Tail me={me} color={color} />}
      <span data-text="" className="relative">
        <MessageText text={message.text} />
      </span>
    </div>
  );
}

const Bubble = React.forwardRef<HTMLDivElement, { message: Shown; gap: number; hidden: boolean; onOpen: () => void }>(function Bubble({ message, gap, hidden, onOpen }, ref) {
  const press = React.useRef<number | undefined>(undefined);
  const me = message.from === "me";
  const reacted = message.reactions.length > 0;
  return (
    // The list opens room above a reacted bubble for its reaction.
    <motion.div className={cn("flex", me ? "justify-end" : "justify-start")} initial={false} animate={{ paddingTop: gap + (reacted ? 28 : 0) }} transition={ROOM}>
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`${me ? "You" : "They"}: ${message.text}. Long-press to react.`}
        className="relative outline-none"
        onDoubleClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpen();
        }}
        onPointerDown={() => (press.current = window.setTimeout(onOpen, 450))}
        onPointerUp={() => clearTimeout(press.current)}
        onPointerLeave={() => clearTimeout(press.current)}
        style={{ visibility: hidden ? "hidden" : undefined }}
      >
        <BubbleShape message={message} />
        {reacted ? <ReactionBadge key={message.reactions.join()} reactions={message.reactions} me={me} /> : null}
      </div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Tapback: the bubble turns white in place; a glass pill sits above it and a thought
// bubble (smiley → emoji keyboard) hangs off the pill toward the bubble's corner.

const PILL = { w: 375, h: 64, inset: 16.3, gap: 68.4 };

/** The bubble moves only if the pill would hit the header. */
const tapbackTop = (rect: Rect) => Math.max(rect.top, 100 + PILL.gap);

function TapbackLayer({ rect, message, onReact, onEmoji, onClose }: { rect: Rect; message: Message; onReact: (unified: string) => void; onEmoji: () => void; onClose: () => void }) {
  const recents = useFrequentEmoji(16)
    .filter((u) => !TAPBACKS.some((t) => t.id === u))
    .slice(0, 6);
  const items = [...TAPBACKS, ...recents.map((id) => ({ id, label: id }))];
  const top = tapbackTop(rect);
  const me = message.from === "me";
  const s = me ? -1 : 1;
  const pillX = me ? W - PILL.inset - PILL.w : PILL.inset;
  const pillY = top - PILL.gap;
  const anchor = me ? rect.left : rect.left + rect.width;
  const cx0 = Math.min(Math.max(anchor + 28.7 * s, pillX + 44), pillX + PILL.w - 44);

  // Scrolling the pill folds the thought bubble up into it (imessage27-pill-scrolled.png).
  const [p, setP] = React.useState(0);
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const R = lerp(22.3, 11.7);
  const cx = cx0 + lerp(0, -11) * s;
  const cy = lerp(top + 11.5, top - 2.7);
  const blob = { cx: cx0 + 14.7 * s, cy: top + 32.2, r: lerp(7, 0) };
  // Fills the crease between the circle and the blob.
  const neck = { cx: cx0 + 10.6 * s, cy: top + 27, r: lerp(5.5, 0) };
  const dot = { cx: cx0 + lerp(23, -3.7) * s, cy: lerp(top + 44.3, top + 14), r: 4 };

  const pill = (paint: Paint) => (
    <motion.rect
      rx={PILL.h / 2}
      initial={{ x: cx0 - 22, y: top - 10.7 - 22, width: 44, height: 44 }}
      animate={{ x: pillX, y: pillY, width: PILL.w, height: PILL.h }}
      transition={{ ...SPRING, delay: 0.06 }}
      {...paint}
    />
  );
  const thought = (paint: Paint) => (
    <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: 0.03 }} style={{ transformOrigin: `${cx0}px ${top + 11.5}px`, transformBox: "view-box" }}>
      <circle cx={cx} cy={cy} r={R} {...paint} />
      {fillets(cx, cy, R, pillY + PILL.h).map((d) => (
        <path key={d.slice(0, 12)} d={d} {...paint} strokeWidth={paint.stroke ? paint.strokeWidth : undefined} />
      ))}
      {blob.r > 0.5 ? (
        <>
          <circle {...neck} {...paint} />
          <circle {...blob} {...paint} />
        </>
      ) : null}
    </motion.g>
  );
  const dotShape = (paint: Paint) => (
    <motion.circle
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ ...POP, delay: 0.14 }}
      style={{ transformOrigin: `${dot.cx}px ${dot.cy}px`, transformBox: "view-box" }}
      {...dot}
      {...paint}
    />
  );

  return (
    <motion.div className="absolute inset-0 z-20" onPointerDown={(e) => e.target === e.currentTarget && onClose()} exit={{ opacity: 0, transition: OUT }}>
      <div className="absolute" style={{ left: rect.left, top, width: rect.width }}>
        <BubbleShape message={message} lifted />
      </div>
      <Union layers={GLASS} style={{ filter: "drop-shadow(0 2px 6px rgb(0 0 0 / 0.03))" }}>
        {(paint) => (
          <>
            {pill(paint)}
            {thought(paint)}
            {dotShape(paint)}
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
        <Grin size={23.4} className="text-[#9d9da1]" />
      </motion.button>
      {/* The tapbacks scroll inside the pill, then your recents, then the keyboard. */}
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
              key={t.id}
              type="button"
              aria-label={t.label}
              onClick={() => onReact(t.id)}
              className="flex h-[64px] w-[49px] shrink-0 items-center justify-center rounded-full"
              initial={{ scale: 0.5, opacity: 0, filter: "blur(4px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)", transition: { ...POP, delay: 0.12 + Math.min(i, 8) * 0.028 } }}
              whileTap={{ scale: 0.82 }}
              whileHover={{ scale: 1.12 }}
            >
              <Reaction id={t.id} size={28.5} />
            </motion.button>
          ))}
          <button type="button" aria-label="More emoji" onClick={onEmoji} className="flex h-[64px] w-[49px] shrink-0 items-center justify-center">
            <Grin size={24} className="text-[#a5a5aa]" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Emoji keyboard: the bubble stays (white) above the sheet; a big thought bubble with a
// close button hangs over it.

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
          <Grin size={38.5} className="text-[#bcbcbc]" />
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
        <SFXmark size={10} className="text-black [&_path]:stroke-black [&_path]:stroke-[0.6px]" />
      </motion.button>
    </motion.div>
  );
}

/** iOS keyboard order, labels and tab icons. */
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

/** The grinning face iOS 27 draws in the thought bubble (a heavier grin than SF face.smiling). */
function Grin({ size, className }: { size: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10.75" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <ellipse cx="8.6" cy="9.1" rx="1.3" ry="1.5" fill="currentColor" />
      <ellipse cx="15.4" cy="9.1" rx="1.3" ry="1.5" fill="currentColor" />
      <path d="M5.4,12.7 Q12,11.5 18.6,12.7 C18.3,16.7 15.5,19.2 12,19.2 C8.5,19.2 5.7,16.7 5.4,12.7Z" fill="currentColor" />
      <path d="M6.9,13.9 Q12,13 17.1,13.9 L16.8,15.1 Q12,14.4 7.2,15.1Z" fill="#efefef" />
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

/** Keyboard grid, measured: 46 pt columns, 38.4 pt rows, 5 rows, sections 13.8 pt apart. */
const K = { col: 46, row: 38.4, rows: 5, left: 2.9, gap: 13.8, label: 61.6, grid: 81.2, labelInset: 9.8, emoji: 31.5 };
/** Tabs: 30 pt circles, centers 37.84 pt apart from x = 29. */
const TAB = { first: 29 - 15 - 0.3, pitch: 37.84 };
/** Emoji 17 (e.g. 1faeb cracking face) has no glyph in the system fonts the page usually runs on. */
const MAX_VERSION = 16;

/** Frequently used first, then the iOS order, labels and tab icons. */
const KEYBOARD_CATEGORIES: CategoryOption[] = [{ id: "suggested", name: "Frequently Used", icon: <SFClock size={20} /> }, ...IOS_GROUPS.map((g) => ({ id: g.id, name: g.label, icon: g.icon }))];

/** The keyboard's geometry as the library's size variables. A short section still leaves room for its label (150 pt). */
const KEYBOARD_SIZES = {
  "--emoji-size": `${K.emoji}px`,
  // The screen's text font first, as iOS draws emoji on the text baseline.
  "--emoji-font-family": '-apple-system, system-ui, "SF Pro Text", sans-serif',
  "--emoji-cell-width": `${K.col}px`,
  "--emoji-cell-height": `${K.row}px`,
  "--emoji-header-height": `${K.grid - K.label}px`,
  "--emoji-list-padding": `${K.left}px`,
  "--emoji-section-gap": `${K.gap}px`,
  "--emoji-section-min-width": "150px",
} as React.CSSProperties;
const SHEET: React.CSSProperties = { background: C.sheet, boxShadow: "inset 0 0 0 0.34px rgb(0 0 0 / 0.35), inset 0 1px 0 0.7px rgb(255 255 255 / 0.6)" };

/**
 * The iOS emoji keyboard: search field, sections laid out in columns that scroll
 * sideways (frequently used first), category bar and delete key. The library's
 * picker parts with a horizontal List; styled with classes and size variables only.
 */
export function EmojiKeyboard({ onPick, onDelete, className }: { onPick: (s: EmojiSelection) => void; onDelete?: () => void; className?: string }) {
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
        searchPlaceholder="Search Emoji"
        searchLimit={60}
        className="absolute inset-0"
        style={KEYBOARD_SIZES}
      >
        <EmojiPicker.Search
          className="absolute top-[10.7px] right-[9px] left-[9px] flex h-[40px] items-center rounded-[18px] [&_[data-slot=search-clear]]:absolute [&_[data-slot=search-clear]]:right-[10px] [&_[data-slot=search-clear]]:size-[20px] [&_[data-slot=search-clear]]:rounded-full [&_[data-slot=search-clear]]:bg-[#a5a7ac] [&_[data-slot=search-clear]]:text-white"
          style={{ background: C.search }}
          inputProps={{ "aria-label": "Search Emoji", className: "h-full w-full rounded-[18px] bg-transparent pr-4 pl-[44px] text-[17px] tracking-[-0.01em] outline-none placeholder:text-[#838589]" }}
        >
          <SFMagnifyingglass size={17} className="pointer-events-none absolute top-[11.7px] left-[19.7px] text-[#838589]" />
        </EmojiPicker.Search>
        <EmojiPicker.Viewport className="absolute inset-x-0 [scrollbar-width:none]" style={{ top: K.label, height: K.grid - K.label + K.rows * K.row }}>
          <EmojiPicker.List
            orientation="horizontal"
            rows={K.rows}
            headerClassName="pl-[9.8px] text-[12.25px] leading-[16px] font-semibold tracking-[-0.015em] whitespace-nowrap text-[#8b8d92] uppercase"
            cellClassName="rounded-[10px] outline-none active:bg-black/[0.06] focus-visible:bg-black/[0.06] data-highlighted:bg-black/[0.06]"
          />
          <EmojiPicker.Empty className="absolute top-[60px] w-[396px] text-center text-[15px] text-[#8e8e93]">No Emoji Found</EmojiPicker.Empty>
        </EmojiPicker.Viewport>
        {/* Category bar. */}
        <EmojiPicker.CategoryNav
          className="absolute top-[278.7px] flex h-[30px]"
          style={{ left: TAB.first, gap: TAB.pitch - 30, color: C.icon }}
          tabClassName="flex size-[30px] shrink-0 items-center justify-center rounded-full data-active:bg-[#bfc1c8] data-active:text-[#3c3c41]"
        />
        <button type="button" aria-label="Delete" onClick={onDelete} className="absolute top-[278.7px] flex h-[30px] w-[30px] items-center justify-center text-[#1c1c1e]" style={{ left: 377.2 - 15 }}>
          <SFDeleteLeft size={22} />
        </button>
      </EmojiPicker.Root>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Renders message text, swapping emoji for <Emoji> so Twemoji applies inside messages too. */
function MessageText({ text }: { text: string }) {
  const store = useEmojiStore();
  const status = useEmojiStatus();
  const parts = React.useMemo(() => {
    const out: React.ReactNode[] = [];
    let i = 0;
    for (const seg of segment(text)) {
      const record = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(seg) ? store.get(toUnified(seg)) : undefined;
      out.push(record ? <Emoji key={i++} unified={toUnified(seg)} size={20} className="inline-block align-[-3px]" /> : seg);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, store, status]);
  return <>{parts}</>;
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const segment = (text: string) => (segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : [text]);
const toUnified = (emoji: string) => [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");

/** The page's hero mockup: the iPhone, Device Hub style, scaled to fit. */
export function IMessageDemo({ scale = 0.68 }: { scale?: number }) {
  return (
    <IPhoneFrame scale={scale} className="mx-auto">
      <IMessageScreen />
    </IPhoneFrame>
  );
}
