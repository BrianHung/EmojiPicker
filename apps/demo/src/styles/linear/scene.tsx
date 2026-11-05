import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Emoji, EmojiPicker, isComposingKey, useEmojiStatus, useEmojiStore } from "@brianhung/emoji-picker-react";
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { copyEmoji } from "@/components/site/picked";
import { cn } from "@/lib/utils";
import { LINEAR_CATEGORIES, linear } from "./picker";
import { useEmojiTextField } from "@/components/emoji-text-field";
import { LinearEmojiMenu, linearEmojiOptions } from "@/experiences/linear";
import { noEmoji, SearchClear } from "@/styles/parts";
import { CELL, ROOT, tokensOf, type StylePickerProps } from "@/styles/style";
import { EmojiSuggestionMenu } from "@/components/tiptap/emoji-suggestion";
import { Avatar, EmojiText, FitViewport, ld, MobileFrame, PickerSheet, SceneFrame, ScenePicker, toggleReaction, useCompact, useFontStylesheet, type Reaction } from "@/styles/scene-kit";

const W = 1000;
const H = 800;

const C = {
  window: ld("lch(94.44 0.5 282)", "lch(2.595 0.4 272)"),
  panel: ld("lch(97.94 0.5 282)", "lch(5.52 0.4 272)"),
  panelBorder: ld("lch(89.84 0 282)", "lch(13.08 1.48 272)"),
  title: ld("lch(9.794 0 282)", "lch(100 0 272)"),
  text: ld("lch(19.588 1.25 282)", "lch(90.451 1.2 272)"),
  muted: ld("lch(39.176 1.25 282)", "lch(61.803 1.2 272)"),
  card: ld("lch(100 0 282)", "lch(9.232 0.85 272)"),
  cardBorder: ld("lch(91.9 0 282)", "lch(16.793 1.93 272)"),
  button: ld("lch(94.854 0.5 282)", "lch(14.006 0.593 272)"),
  divider: ld("lch(89.84 0 282)", "lch(18.48 1.48 272)"),
  hover: ld("lch(94.854 0.5 282)", "lch(14.006 0.593 272)"),
  chip: ld("lch(100 0 282)", "lch(10.149 0.689 272)"),
  status: ld("lch(64.64 1.25 282)", "lch(61.8 1.2 272)"),
  input: ld("lch(20 1 282)", "lch(90.826 1.425 272)"),
  placeholder: ld("lch(66 1 282)", "lch(39.452 1.425 272)"),
  tabRule: ld("lch(91.9 0 282)", "lch(21.36 1.93 272)"),
  tabMuted: ld("lch(40 1 282)", "lch(64.714 1.425 272)"),
  tabText: ld("lch(20 1 282)", "lch(91.178 1.425 272)"),
};
const FONT = "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FRAME = { color: C.text, fontFamily: FONT, fontFeatureSettings: "'cv01', 'ss03'", "--hover": C.hover, "--text": C.text } as React.CSSProperties;
const POPUP_SHADOW = "shadow-[0_6px_18px_lch(0_0_0/0.02),0_3px_9px_lch(0_0_0/0.04),0_1px_1px_lch(0_0_0/0.04)] dark:shadow-[0_3px_8px_lch(0_0_0/0.125),0_2px_5px_lch(0_0_0/0.125),0_1px_1px_lch(0_0_0/0.125)]";
const CARD_SHADOW = "shadow-[0_3px_6px_-2px_lch(0_0_0/0.02),0_1px_1px_lch(0_0_0/0.04)] dark:shadow-[0_0.5px_1px_1px_lch(0_0_0/0.3)]";

const INLINE_MENU = [
  `w-[190.6px] rounded-[10px] border-[0.5px] border-[lch(91.9_0_282)] bg-[lch(100_0_282)] p-1 text-[lch(10_0_282)] dark:border-[lch(25.68_1.93_272)] dark:bg-[lch(12.72_0.85_272)] dark:text-[lch(100_0_272)] ${POPUP_SHADOW}`,
  "[font-family:'Inter_Variable',Inter,-apple-system,sans-serif]",
  "[&>li]:h-[34px] [&>li]:gap-2 [&>li]:rounded-[6px] [&>li]:px-[10px]",
  "[&>li[data-highlighted]]:bg-[lch(95_0_282)] [&>li[data-highlighted]]:text-[lch(10_0_282)] dark:[&>li[data-highlighted]]:bg-[lch(18_1_272)] dark:[&>li[data-highlighted]]:text-[lch(100_0_272)]",
  "[&_[data-emoji]]:w-[15px] [&_[data-emoji]]:text-[15px] [&_span]:[font-family:inherit] [&_span]:text-[13px] [&_span]:[font-weight:450] [&_b]:[font-weight:inherit]",
].join(" ");
const BODY = "text-[15px] leading-6 font-[450] tracking-[-0.1px]";

type Comment = { id: number; author: string; color: string; time: string; text: string; reactions: Reaction[] };

const COMMENTS: Comment[] = [
  {
    id: 1,
    author: "Maya Lin",
    color: "#f97316",
    time: "2d ago",
    text: "Repro'd on Safari 18: the popover opens under the toolbar when the editor is scrolled. Flipping it to the top fixes it 👍",
    reactions: [
      { unified: "1f44d", count: 2, mine: true },
      { unified: "1f440", count: 1, mine: false },
    ],
  },
  { id: 2, author: "Jordan Park", color: "#22c55e", time: "1d ago", text: "Nice catch. Shipping the fix with the next release 🚀", reactions: [{ unified: "1f389", count: 3, mine: false }] },
];

function useIssue() {
  const [icon, setIcon] = React.useState("1f41b");
  const [reactions, setReactions] = React.useState<Reaction[]>([]);
  const [comments, setComments] = React.useState(COMMENTS);
  const scroller = React.useRef<HTMLDivElement>(null);
  const toggleComment = (id: number, unified: string) => setComments((cs) => cs.map((c) => (c.id === id ? { ...c, reactions: toggleReaction(c.reactions, unified) } : c)));
  const send = (text: string) => {
    setComments((cs) => [...cs, { id: Date.now(), author: "You", color: "#5e6ad2", time: "just now", text, reactions: [] }]);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
  };
  return { icon, setIcon, reactions, setReactions, comments, toggleComment, send, scroller };
}

function IssueFrame({ issue }: { issue: ReturnType<typeof useIssue> }) {
  const { icon, setIcon, reactions, setReactions, comments, toggleComment, send, scroller } = issue;
  return (
    <SceneFrame width={W} height={H} label="Linear style issue" appStyle={linear} className="rounded-xl shadow-2xl" style={{ ...FRAME, background: C.window }}>
      <div className={cn("absolute inset-[8.5px] flex flex-col overflow-hidden rounded-[12px]", CARD_SHADOW)} style={{ background: C.panel, border: `0.5px solid ${C.panelBorder}` }}>
        <Breadcrumb icon={icon} />
        <div className="flex min-h-0 flex-1">
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-10 [scrollbar-width:none]">
            <div className="relative ml-[53.5px] w-[596px] pt-[59.8px]">
              <div className="flex items-center gap-3">
                <IconPopover value={icon} onChange={setIcon} />
                <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.16px]" style={{ color: C.title }}>
                  Emoji popover clips under the toolbar
                </h1>
              </div>
              <Description />
              <div className="mt-[26px] -ml-1.5 flex h-7 items-center gap-1">
                <Pills reactions={reactions} onToggle={(u) => setReactions((r) => toggleReaction(r, u))} />
                <AddReaction onSelect={(u) => setReactions((r) => toggleReaction(r, u))} />
                <span className="flex size-7 items-center justify-center rounded-full border-[0.5px] border-transparent" style={{ color: C.text }} aria-hidden>
                  <Paperclip />
                </span>
              </div>
              <div className="mt-[27.7px] -ml-1.5 flex h-6 w-fit items-center gap-1.5 rounded-full pr-3 pl-1.5 text-[12px] font-medium" style={{ color: C.text }}>
                <PlusIcon /> Add sub-issues
              </div>
              <div className="mt-[14.3px] h-px" style={{ background: C.divider }} />
              <div className="mt-[22.3px] flex h-[23px] items-center">
                <h2 className="text-[15px] leading-[23px] font-semibold" style={{ color: C.title }}>
                  Activity
                </h2>
                <div className="ml-auto flex items-center gap-1 text-[12px] font-medium" style={{ color: C.muted }}>
                  <span className="flex h-8 items-center rounded-full px-3">Unsubscribe</span>
                  <Avatar name="You" size={20} color="#5e6ad2" fontSize={9} />
                </div>
              </div>
              <div className="mt-[23.7px] flex h-[16.8px] items-center gap-2 text-[12px] leading-[16.8px] font-medium" style={{ color: C.muted }}>
                <Avatar name="Sam Rivera" size={16} color="#8b5cf6" fontSize={7} />
                <span>
                  <span style={{ color: C.text }}>Sam Rivera</span> created the issue · 3mo ago
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {comments.map((c) => (
                  <CommentCard key={c.id} comment={c} onToggle={(u) => toggleComment(c.id, u)} />
                ))}
              </div>
              <Composer onSend={send} />
            </div>
          </div>
          <Properties />
        </div>
      </div>
    </SceneFrame>
  );
}

function MobileIssueFrame({ issue }: { issue: ReturnType<typeof useIssue> }) {
  const { icon, setIcon, reactions, setReactions, comments, toggleComment, send, scroller } = issue;
  const round = "flex size-7 items-center justify-center rounded-full border-[0.5px]";
  return (
    <MobileFrame label="Linear style issue" appStyle={linear} height={680} style={{ ...FRAME, background: C.panel }}>
      <div className="flex h-11 shrink-0 items-center pr-3 pl-2 text-[13px] font-medium" style={{ borderBottom: `0.5px solid ${C.divider}` }} aria-hidden>
        <span className={round} style={{ borderColor: "transparent" }}>
          <SidebarIcon />
        </span>
        <span className="ml-3 flex min-w-0 items-center gap-1.5">
          <Emoji emoji={icon} size={14} className="text-[14px] leading-none" />
          <span className="shrink-0">ABC-12</span>
          <span className="truncate">Emoji popover clips under the toolbar</span>
        </span>
        <span className={cn(round, "ml-1.5 shrink-0")} style={{ borderColor: "transparent", color: C.muted }}>
          <Star />
        </span>
        <span className={cn(round, "ml-1.5 shrink-0")} style={{ borderColor: "transparent", color: C.muted }}>
          <Dots />
        </span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-6 [scrollbar-width:none]">
        <div className="mt-[7.5px] flex h-7 justify-end gap-1.5 pr-px" style={{ color: C.text }} aria-hidden>
          <span className={round} style={{ background: C.chip, borderColor: C.cardBorder }}>
            <LinkIcon />
          </span>
          <span className={round} style={{ background: C.chip, borderColor: C.cardBorder }}>
            <CopyIcon />
          </span>
          <span className={round} style={{ background: C.chip, borderColor: C.cardBorder }}>
            <BranchIcon />
          </span>
          <span className="flex h-7 items-center rounded-full" style={{ background: C.chip }}>
            <span className="flex w-7 justify-center">
              <PromptIcon />
            </span>
            <span className="flex w-7 justify-center">
              <ChevronDown />
            </span>
          </span>
        </div>
        <div className="px-[14px]">
          <div className="mt-[10.3px] flex items-center gap-3">
            <IconPopover value={icon} onChange={setIcon} sheet />
            <h1 className="min-w-0 flex-1 text-[24px] leading-8 font-semibold tracking-[-0.16px]" style={{ color: C.title }}>
              Emoji popover clips under the toolbar
            </h1>
          </div>
          <div className="mt-6 ml-1.5 flex h-6 items-center gap-1.5 text-[12px] leading-3 font-medium" aria-hidden>
            <span className="flex h-6 items-center gap-1.5 rounded-full border-[0.5px] pr-2 pl-1.5" style={{ background: C.chip, borderColor: C.cardBorder }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" style={{ stroke: C.status }} strokeWidth="1.5" />
              </svg>
              <span className="font-[450]">Todo</span>
            </span>
            {[<PriorityIcon key="p" />, <AssigneeIcon key="a" />, <LabelIcon key="l" />].map((glyph, i) => (
              <span key={i} className="flex size-6 items-center justify-center rounded-full border-[0.5px]" style={{ background: C.chip, borderColor: C.cardBorder, color: C.muted }}>
                {glyph}
              </span>
            ))}
          </div>
          <Description compact />
          <div className="mt-2.5 -ml-1.5 flex flex-wrap items-center gap-1">
            <Pills reactions={reactions} onToggle={(u) => setReactions((r) => toggleReaction(r, u))} />
            <AddReaction onSelect={(u) => setReactions((r) => toggleReaction(r, u))} sheet />
            <span className={round} style={{ borderColor: "transparent", color: C.text }} aria-hidden>
              <Paperclip />
            </span>
          </div>
          <div className="mt-4 -ml-1.5 flex h-6 items-center gap-1.5 pr-3 pl-1.5 text-[12px] font-medium" style={{ color: C.muted }} aria-hidden>
            <PlusIcon /> Add sub-issues
          </div>
          <div className="mt-[26px] h-px" style={{ background: C.divider }} />
          <div className="mt-[18.3px] flex h-8 items-center">
            <h2 className="text-[15px] leading-[23px] font-semibold" style={{ color: C.title }}>
              Activity
            </h2>
            <div className="mr-2 ml-auto flex items-center gap-1 text-[12px] font-medium" style={{ color: C.muted }} aria-hidden>
              <span className="flex h-8 items-center px-3">Unsubscribe</span>
              <span className="flex size-8 items-center justify-center">
                <Avatar name="You" size={20} color="#5e6ad2" fontSize={9} />
              </span>
            </div>
          </div>
          <div className="mt-[18px] ml-2.5 flex h-[16.8px] items-center gap-2 text-[12px] leading-[16.8px] font-medium" style={{ color: C.muted }}>
            <Avatar name="Sam Rivera" size={16} color="#8b5cf6" fontSize={7} />
            <span className="truncate">
              <span style={{ color: C.text }}>Sam Rivera</span> created the issue · 3mo ago
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 px-1.5">
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} onToggle={(u) => toggleComment(c.id, u)} compact />
          ))}
          <Composer onSend={send} compact />
        </div>
      </div>
    </MobileFrame>
  );
}

function Breadcrumb({ icon }: { icon: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 pr-3 pl-[21px] text-[13px] leading-4 font-medium" style={{ color: C.text, borderBottom: `0.5px solid ${C.divider}` }} aria-hidden>
      <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-[#d97706] text-[10px] font-semibold text-white">A</span>
      <span>Atlas</span>
      <Chevron />
      <span>Issues</span>
      <Chevron />
      <span className="flex items-center gap-1.5">
        <Emoji emoji={icon} size={14} className="text-[14px] leading-none" />
        <span style={{ color: C.muted }}>ABC-12</span> Emoji popover clips under the toolbar
      </span>
      <span className="ml-1" style={{ color: C.muted }}>
        <Star />
      </span>
      <span style={{ color: C.muted }}>
        <Dots />
      </span>
    </div>
  );
}

function Prop({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex h-8 items-center">
      <span className="-ml-1.5 flex h-7 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 text-[13px] font-medium" style={muted ? { color: C.muted } : undefined}>
        {children}
      </span>
    </div>
  );
}

function Properties() {
  const row = "flex h-8 items-center gap-2.5 rounded-[6px] px-2 -mx-2 text-[13px] font-medium";
  return (
    <aside className="w-[281.5px] shrink-0 pt-4 pr-4 pl-[16px]" style={{ borderLeft: `0.5px solid ${C.divider}`, color: C.text }} aria-label="Properties">
      <div className="mb-1 flex h-8 items-center text-[13px] font-medium" style={{ color: C.muted }}>
        Properties
      </div>
      <Prop>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="6" style={{ stroke: C.status }} strokeWidth="1.5" />
        </svg>
        Todo
      </Prop>
      <Prop muted>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
          <rect x="1" y="8" width="3" height="4" rx="1" opacity=".5" />
          <rect x="5.5" y="5" width="3" height="7" rx="1" opacity=".5" />
          <rect x="10" y="2" width="3" height="10" rx="1" opacity=".5" />
        </svg>
        Set priority
      </Prop>
      <Prop muted>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <circle cx="7" cy="7" r="6" strokeDasharray="2 1.6" />
          <circle cx="7" cy="5.6" r="1.8" />
          <path d="M3.8 11c.7-1.4 1.8-2.1 3.2-2.1s2.5.7 3.2 2.1" />
        </svg>
        Assign
      </Prop>
      <div className="mt-5 mb-1 flex h-8 items-center text-[13px] font-medium" style={{ color: C.muted }}>
        Labels
      </div>
      <div className={row}>
        <span className="flex h-6 items-center gap-1.5 rounded-full border-[0.5px] px-2 text-[12px]" style={{ borderColor: C.cardBorder }}>
          <span className="size-2 rounded-full bg-[#eb5757]" />
          Bug
        </span>
        <span style={{ color: C.muted }}>
          <PlusIcon />
        </span>
      </div>
      <div className="mt-5 mb-1 flex h-8 items-center text-[13px] font-medium" style={{ color: C.muted }}>
        Project
      </div>
      <Prop muted>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <path d="M2 4.5 7 2l5 2.5v5L7 12 2 9.5v-5Z" />
        </svg>
        Add to project
      </Prop>
    </aside>
  );
}

function Pills({ reactions, onToggle }: { reactions: Reaction[]; onToggle: (unified: string) => void }) {
  const store = useEmojiStore();
  useEmojiStatus();
  return (
    <>
      {reactions.map((r) => {
        const record = store.get(r.unified);
        return (
          <button
            key={r.unified}
            type="button"
            aria-pressed={r.mine}
            aria-label={`${record?.name ?? r.unified}, ${r.count}`}
            title={record?.shortcodes[0] ? `:${record.shortcodes[0]}:` : record?.name}
            onClick={() => onToggle(r.unified)}
            className={cn("flex shrink-0 cursor-pointer items-center gap-1 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]", linear.pill.base, linear.pill.mine)}
          >
            <Emoji emoji={r.unified} size={14} className="text-[14px] leading-none" />
            <span className="font-medium">{r.count}</span>
          </button>
        );
      })}
    </>
  );
}

function AddReaction({ onSelect, sheet = false }: { onSelect: (unified: string) => void; sheet?: boolean }) {
  return (
    <ScenePicker
      appStyle={linear}
      label="Add reaction"
      title="Add reaction"
      sheet={sheet}
      onSelect={(s) => onSelect(s.unified)}
      pickerClassName={POPUP_SHADOW}
      triggerClassName="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-transparent text-(--text) outline-none hover:bg-(--hover) focus-visible:ring-2 focus-visible:ring-[#5e6ad2] data-[state=open]:bg-(--hover)"
    >
      <SmilePlus />
    </ScenePicker>
  );
}

function CommentCard({ comment, onToggle, compact = false }: { comment: Comment; onToggle: (unified: string) => void; compact?: boolean }) {
  return (
    <article className={cn("rounded-[8px] px-4 py-3", CARD_SHADOW, !compact && "-ml-2 w-[612px]")} style={{ background: C.card, border: `0.5px solid ${C.cardBorder}` }}>
      <header className="flex h-5 items-center gap-2">
        <Avatar name={comment.author} size={20} color={comment.color} fontSize={9} />
        <span className="text-[13px] font-medium" style={{ color: C.text }}>
          {comment.author}
        </span>
        <span className="text-[12px] font-medium" style={{ color: C.muted }}>
          {comment.time}
        </span>
      </header>
      <p className={cn("mt-2", BODY)} style={{ color: C.text }}>
        <EmojiText text={comment.text} size={15} className="inline-block align-[-2px]" />
      </p>
      <div className="mt-2 -ml-0.5 flex flex-wrap items-center gap-1">
        <Pills reactions={comment.reactions} onToggle={onToggle} />
        <AddReaction onSelect={onToggle} sheet={compact} />
      </div>
    </article>
  );
}

function Composer({ onSend, compact = false }: { onSend: (text: string) => void; compact?: boolean }) {
  const { value, setText, emoji, inputProps } = useEmojiTextField<HTMLTextAreaElement>({ ...linearEmojiOptions, onSelect: copyEmoji });
  const submit = () => {
    const text = value.trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <div className={cn("relative", !compact && "mt-4 -ml-2 w-[612px]")}>
      <LinearEmojiMenu {...emoji} />
      <div className={cn("relative min-h-[83px] rounded-[8px] px-4 pt-3 pb-[45px]", CARD_SHADOW)} style={{ background: C.card, border: `0.5px solid ${C.cardBorder}` }}>
        <textarea
          {...inputProps}
          rows={1}
          aria-label="Leave a comment"
          placeholder="Leave a comment..."
          className={cn("block min-h-6 w-full resize-none bg-transparent outline-none field-sizing-content placeholder:text-(--ph)", BODY)}
          style={{ color: C.input, "--ph": C.placeholder } as React.CSSProperties}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey) && !isComposingKey(e.nativeEvent)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="absolute right-[18.4px] bottom-[14.5px] flex items-center gap-2">
          <span className="flex size-6 items-center justify-center" style={{ color: C.muted }} aria-hidden>
            <Paperclip />
          </span>
          <button type="button" onClick={submit} aria-label="Send comment" className="flex size-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]" style={{ background: C.button, color: value.trim() ? C.title : C.muted }}>
            <ArrowUp />
          </button>
        </div>
      </div>
    </div>
  );
}

const line = (d: React.ReactNode, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const SmilePlus = () =>
  line(
    <>
      <path d="M14.4 8A6.4 6.4 0 1 1 8 1.6" />
      <path d="M5.4 9.6s.9 1.3 2.6 1.3 2.6-1.3 2.6-1.3M6 6.2h.01M10 6.2h.01M12.5 1.5v4M10.5 3.5h4" />
    </>,
  );
const Paperclip = () => line(<path d="m13.5 7.6-5.4 5.3a3.4 3.4 0 0 1-4.8-4.8l5.6-5.5a2.2 2.2 0 0 1 3.2 3.2L6.6 11.2a1.1 1.1 0 0 1-1.6-1.6l5-4.9" />);
const PlusIcon = () => line(<path d="M8 3v10M3 8h10" />);
const ArrowUp = () => line(<path d="M8 13V3M4 7l4-4 4 4" />, 12);
const Chevron = () => line(<path d="m6 4 4 4-4 4" />, 12);
const Star = () => line(<path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2l-3.6 1.9.7-4L2.2 6.3l4-.6L8 2Z" />);
const SidebarIcon = () =>
  line(
    <>
      <rect x="2" y="3" width="12" height="10" rx="2.5" />
      <path d="M5.5 6v4" />
    </>,
  );
const LinkIcon = () => line(<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.1-2.1a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.4 8.9a2.6 2.6 0 0 0 3.7 3.7l.6-.6" />);
const CopyIcon = () =>
  line(
    <>
      <rect x="5" y="5" width="8.5" height="8.5" rx="2" />
      <path d="M11 3.2A1.8 1.8 0 0 0 9.3 2H4a2 2 0 0 0-2 2v5.3A1.8 1.8 0 0 0 3.2 11" />
    </>,
  );
const BranchIcon = () =>
  line(
    <>
      <circle cx="4.5" cy="3.5" r="1.5" />
      <circle cx="11.5" cy="12.5" r="1.5" />
      <path d="M4.5 5v8M4.5 7.5c0 2.5 2 3 4 3h1.5" />
    </>,
  );
const PromptIcon = () => line(<path d="M2.5 4h9M2.5 7.5h6M2.5 11h4M10 9.5l3.5 2-3.5 2" />);
const ChevronDown = () => line(<path d="m4 6 4 4 4-4" />, 12);
const PriorityIcon = () => line(<path d="M3 8h1.5M7.25 8h1.5M11.5 8H13" strokeWidth={1.6} />);
const AssigneeIcon = () =>
  line(
    <>
      <circle cx="8" cy="8" r="6" strokeDasharray="2 1.6" />
      <circle cx="8" cy="6.6" r="1.8" />
      <path d="M4.8 12c.7-1.4 1.8-2.1 3.2-2.1s2.5.7 3.2 2.1" />
    </>,
  );
const LabelIcon = () => line(<path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h6.6l3.4 4-3.4 4H4a1.5 1.5 0 0 1-1.5-1.5v-5Z" />);
const Dots = () =>
  line(
    <>
      <circle cx="3.5" cy="8" r=".6" fill="currentColor" />
      <circle cx="8" cy="8" r=".6" fill="currentColor" />
      <circle cx="12.5" cy="8" r=".6" fill="currentColor" />
    </>,
  );


function Description({ compact = false }: { compact?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>The reaction picker opens below the fold when the editor scrolls. Try :s</p>",
    immediatelyRender: true,
    editorProps: { attributes: { "aria-label": "Issue description", class: cn("outline-none [&_p]:m-0 caret-[lch(19.588_1.25_282)] dark:caret-[lch(90.451_1.2_272)]", compact ? "mt-[22px] -mx-[14px] px-[14px] pt-2.5 pb-4" : "mt-6", BODY) } },
  });
  if (!editor) return null;
  return (
    <div style={{ color: C.text }}>
      <EditorContent editor={editor} />
      <EmojiSuggestionMenu editor={editor} className={INLINE_MENU} limit={12} side="top" />
    </div>
  );
}

function IconPicker({ onSelect, autoFocus = false, fluid = false, searchResults, className }: StylePickerProps) {
  return (
    <EmojiPicker.Root
      columns={fluid ? "fit" : 13}
      frequent={18}
      categories={LINEAR_CATEGORIES}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="linear"
      style={tokensOf(linear)}
      className={cn(ROOT, "h-[379.5px] w-[412px] bg-transparent font-picker text-picker-foreground [--emoji-cell-size:28px] [--emoji-header-height:28px] [--emoji-image-size:20px] [--emoji-list-padding:10.5px] [--emoji-size:20px]", className)}
    >
      <EmojiPicker.Search className="relative flex shrink-0 items-center border-b border-(--linear-divider) px-[5.5px] pt-[4.5px] pb-1">
        <EmojiPicker.Search.Input placeholder="Search emoji…" autoFocus={autoFocus} className="h-7 w-full rounded-[8px] bg-picker-background py-1.5 pr-7 pl-[9px] text-[13px] outline-none placeholder:text-picker-subtle">
          <SearchClear />
        </EmojiPicker.Search.Input>
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className="relative min-h-0 flex-1 [scrollbar-width:thin]">
        <EmojiPicker.List className="outline-none" renderEmptyState={noEmoji}>
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className="flex h-7 items-center bg-picker-background pt-1.5 pr-1.5 pl-[10.5px] text-[12px] leading-[22px] font-medium text-picker-muted" />
              <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={cn(CELL, "rounded-[8px] hover:bg-picker-hover data-focus-visible:bg-picker-selected data-[highlighted]:bg-picker-selected")} />}</EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}

const ACCENT = "lch(52.418 61.103 288.421)";

const ICON_TABS = (
  <div role="tablist" className="flex h-[31.5px] shrink-0 items-stretch pr-2 pl-1.5" style={{ borderBottom: `1px solid ${C.tabRule}` }}>
    <button type="button" role="tab" aria-selected={false} disabled className="flex h-full cursor-default items-center px-2 py-[7px] text-[13px] font-medium" style={{ color: C.tabMuted }}>
      Icons
    </button>
    <button type="button" role="tab" aria-selected className="flex h-full items-center px-2 py-[7px] text-[13px] font-medium outline-none" style={{ color: C.tabText, boxShadow: `inset 0 -1px 0 ${ACCENT}, 0 1px 0 ${ACCENT}` }}>
      Emojis
    </button>
  </div>
);

function IconPopover({ value, onChange, sheet = false }: { value: string; onChange: (unified: string) => void; sheet?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const tile = <Emoji emoji={value} size={18} className="text-[18px] leading-none" />;
  if (sheet)
    return (
      <PickerSheet
        appStyle={linear}
        Picker={IconPicker}
        top={ICON_TABS}
        label="Change issue icon"
        title="Change icon"
        onSelect={(s) => onChange(s.unified)}
        font={FONT}
        triggerClassName="flex size-8 cursor-pointer items-center justify-center rounded-[6px] bg-[lch(94.854_0.5_282)] outline-none dark:bg-[lch(13.861_1.139_272)] focus-visible:ring-2 focus-visible:ring-[#5e6ad2]"
      >
        {tile}
      </PickerSheet>
    );
  return (
    <EmojiPopover.Root open={open} onOpenChange={setOpen}>
      <EmojiPopover.Trigger
        aria-label="Change issue icon"
        title="Change icon"
        className="flex size-8 cursor-pointer items-center justify-center rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]"
        style={{ background: C.button }}
      >
        {tile}
      </EmojiPopover.Trigger>
      <EmojiPopover.Content side="bottom" align="start" aria-label="Linear style icon picker" style={{ fontFamily: FONT }}>
        <FitViewport width={412}>
          <div data-style="linear" style={tokensOf(linear)} className={cn("flex h-[411px] w-[412px] flex-col overflow-hidden rounded-[6px] border-[0.5px] border-picker-border bg-picker-background text-picker-foreground", POPUP_SHADOW)}>
            {ICON_TABS}
            <IconPicker
              onSelect={(s) => {
                onChange(s.unified);
                copyEmoji(s);
                setOpen(false);
              }}
              autoFocus
            />
          </div>
        </FitViewport>
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}

export function LinearScene() {
  useFontStylesheet("https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap");
  const { ref, compact } = useCompact();
  const issue = useIssue();
  return (
    <div ref={ref} className="w-full">
      {compact ? <MobileIssueFrame issue={issue} /> : <IssueFrame issue={issue} />}
    </div>
  );
}

