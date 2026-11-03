// Linear style, in situ, all dark. Two frames:
// 1. An issue page: the description is a Tiptap editor with Linear's inline ":" menu
//    (B), the smiley under it opens the Linear style reaction picker (C) and adds
//    Linear pills, comments carry pills, and the comment composer has `:` autocomplete.
// 2. A team overview header (A): the icon tile opens Linear's 412px Icons | Emojis
//    popover to set the team's icon (Icons is shown, disabled).
//
// Measured with DevTools on Linear web (dark, issue page, 1400×813 window), Nov 2026.
// The frame crops that window at x=293, so frame x = window x − 293 (y unchanged):
// panel inset 8.5 on a darker sidebar; content column at x=62 (window 355), 596 wide;
// title 24/32 600 at y=112.3; description 15/24 450 at y=168.3; reaction buttons
// 28×28 at x=56/84, y=218.3; divider y=312; "Activity" 15/23 600 at y=335.3;
// activity line 12/16.8 500 at y≈382; composer 612×83 at x=54 (window 347).
//
// On a phone it is Linear's narrow layout, measured the same way in a 390px-wide frame
// of the issue page: no inset panel; a 44px bar (0.5px rule, padding 0 12 0 8, 28px
// round buttons); a right-aligned row of 28px round copy buttons at y=51.5; content
// 14px in; title at y=89.8; property chips (24px, 6px apart) at y=145.8; description
// text at y=201.8; reaction buttons at x=8, y=251.8; "Activity" at y=368.8 beside a
// 32px Unsubscribe; the composer card 6px in at y=449. Pickers open as bottom sheets.
import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Emoji, EmojiPopover, useEmojiStatus, useEmojiStore } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { linear } from "./picker";
import { StyleAutocomplete } from "@/styles/variants";
import { useAutocompleteInput } from "@/components/emoji-autocomplete";
import { StylePicker, type PickerLayout } from "@/styles/style-picker";
import { EmojiSuggestion, EmojiSuggestionMenu } from "@/components/tiptap/emoji-suggestion";
import { Avatar, EmojiText, FitViewport, MobileFrame, PickerSheet, SceneFrame, ScenePicker, themed, toggleReaction, useCompact, useFontStylesheet, type Reaction } from "@/styles/scene-kit";

const W = 1000;
const H = 800;
const THEME = "dark";

const C = {
  window: "lch(3.2 0.5 272)",
  panel: "lch(5.52 0.4 272)",
  panelBorder: "lch(11 1 272)",
  title: "lch(100 0 272)",
  text: "lch(90.451 1.2 272)",
  muted: "lch(61.803 1.2 272)",
  card: "lch(9.232 0.85 272)",
  cardBorder: "lch(16.793 1.93 272)",
  button: "lch(13.861 1.139 272)",
  divider: "lch(13 1.5 272)",
  hover: "lch(11 1 272)",
  chip: "lch(10.149 0.689 272)",
};
const FONT = "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
// Linear's popups (measured): lch(12.72) fill, 0.5px lch(25.68) border, three soft shadows.
const POPUP_SHADOW = "shadow-[0_3px_8px_lch(0_0_0/0.125),0_2px_5px_lch(0_0_0/0.125),0_1px_1px_lch(0_0_0/0.125)]";

// (B) The inline ":" menu in Linear's editors, the same as its composer autocomplete
// (re-measured Nov 2026): above the caret, 190.6px wide, radius 10, 4px
// list padding, twelve 34px rows with the highlight inset 4px (radius 6), a 15px emoji
// at x=14 and 8px to the 13px/450 ":code:". (Overrides the shared Tiptap menu's default look.)
const INLINE_MENU = [
  `w-[190.6px] rounded-[10px] border-[0.5px] border-[lch(25.68_1.93_272)] bg-[lch(12.72_0.85_272)] p-1 text-[lch(100_0_272)] ${POPUP_SHADOW}`,
  "[font-family:'Inter_Variable',Inter,-apple-system,sans-serif] [color-scheme:dark]",
  "[&>li]:h-[34px] [&>li]:gap-2 [&>li]:rounded-[6px] [&>li]:px-[10px]",
  "[&>li[data-highlighted]]:bg-[lch(18_1_272)] [&>li[data-highlighted]]:text-[lch(100_0_272)]",
  "[&_[data-emoji]]:w-[15px] [&_[data-emoji]]:text-[15px] [&_span]:[font-family:inherit] [&_span]:text-[13px] [&_span]:[font-weight:450] [&_b]:[font-weight:inherit]",
].join(" ");
// Linear's body text: 15px/24px at weight 450 with slight negative tracking.
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

/** The issue's state, shared by the desktop and phone layouts. */
function useIssue() {
  const [icon, setIcon] = React.useState("1f41b"); // 🐛
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
    <SceneFrame width={W} height={H} theme={THEME} label="Linear style issue" appStyle={linear} className="rounded-xl shadow-2xl" style={{ background: C.window, color: C.text, fontFamily: FONT, fontFeatureSettings: "'cv01', 'ss03'" }}>
      <div className="absolute inset-[8.5px] right-[8.5px] flex flex-col overflow-hidden rounded-[8px]" style={{ background: C.panel, border: `0.5px solid ${C.panelBorder}` }}>
        <Breadcrumb icon={icon} />
        <div className="flex min-h-0 flex-1">
          {/* Main column: content starts 53.5px from the panel's left edge. */}
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-10 [scrollbar-width:none]">
            <div className="relative ml-[53.5px] w-[596px] pt-[59.8px]">
              <ScenePicker
                appStyle={linear}
                theme={THEME}
                label="Set icon"
                title="Set icon"
                onSelect={(s) => setIcon(s.unified)}
                pickerClassName={POPUP_SHADOW}
                triggerClassName="absolute top-[59.8px] -left-10 flex size-8 cursor-pointer items-center justify-center rounded-[6px] outline-none hover:bg-(--hover) focus-visible:ring-2 focus-visible:ring-[#5e6ad2] data-[state=open]:bg-(--hover)"
              >
                <Emoji emoji={icon} size={20} className="text-[20px] leading-none" />
              </ScenePicker>
              <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.16px]" style={{ color: C.title }}>
                Emoji popover clips under the toolbar
              </h1>
              <Description />
              {/* Reaction row: pills, then add reaction (opens the picker) and attach. */}
              <div className="mt-[26px] -ml-1.5 flex h-7 items-center gap-1">
                <Pills reactions={reactions} onToggle={(u) => setReactions((r) => toggleReaction(r, u))} />
                <AddReaction onSelect={(u) => setReactions((r) => toggleReaction(r, u))} />
                <span className="flex size-7 items-center justify-center rounded-full border-[0.5px] border-transparent" style={{ color: C.text }} aria-hidden>
                  <Paperclip />
                </span>
              </div>
              <div className="mt-[27.7px] flex h-6 items-center gap-1.5 text-[13px] font-medium" style={{ color: C.muted }}>
                <PlusIcon /> Add sub-issues
              </div>
              <div className="mt-[14.3px] h-px" style={{ background: C.divider }} />
              <div className="mt-[22.3px] flex h-[23px] items-center">
                <h2 className="text-[15px] leading-[23px] font-semibold" style={{ color: C.title }}>
                  Activity
                </h2>
                <div className="ml-auto flex items-center gap-3 text-[13px] font-medium" style={{ color: C.muted }}>
                  Unsubscribe
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

/** Linear's narrow (phone) issue view. */
function MobileIssueFrame({ issue }: { issue: ReturnType<typeof useIssue> }) {
  const { icon, setIcon, reactions, setReactions, comments, toggleComment, send, scroller } = issue;
  const round = "flex size-7 items-center justify-center rounded-full border-[0.5px]";
  return (
    <MobileFrame theme={THEME} label="Linear style issue" appStyle={linear} height={680} style={{ background: C.panel, color: C.text, fontFamily: FONT, fontFeatureSettings: "'cv01', 'ss03'" }}>
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
        {/* Copy link / ID / branch, then a split button, right-aligned under the bar. */}
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
          <div className="mt-[10.3px] flex items-start gap-2">
            <h1 className="min-w-0 flex-1 text-[24px] leading-8 font-semibold tracking-[-0.16px]" style={{ color: C.title }}>
              Emoji popover clips under the toolbar
            </h1>
            <ScenePicker
              appStyle={linear}
              theme={THEME}
              label="Set icon"
              title="Set icon"
              sheet
              onSelect={(s) => setIcon(s.unified)}
              triggerClassName="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]"
            >
              <Emoji emoji={icon} size={20} className="text-[20px] leading-none" />
            </ScenePicker>
          </div>
          {/* Status, priority, assignee, labels: 24px chips, 6px apart. */}
          <div className="mt-6 ml-1.5 flex h-6 items-center gap-1.5 text-[12px] leading-3 font-medium" aria-hidden>
            <span className="flex h-6 items-center gap-1.5 rounded-full border-[0.5px] pr-2 pl-1.5" style={{ background: C.chip, borderColor: C.cardBorder }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="lch(61.8 1.2 272)" strokeWidth="1.5" />
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

function Properties() {
  const row = "flex h-8 items-center gap-2.5 rounded-[6px] px-2 -mx-2 text-[13px] font-medium";
  return (
    <aside className="w-[281.5px] shrink-0 pt-4 pr-4 pl-[16px]" style={{ borderLeft: `0.5px solid ${C.divider}`, color: C.text }} aria-label="Properties">
      <div className="mb-1 flex h-8 items-center text-[13px] font-medium" style={{ color: C.muted }}>
        Properties
      </div>
      <div className={row}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="6" stroke="lch(61.8 1.2 272)" strokeWidth="1.5" />
        </svg>
        Todo
      </div>
      <div className={row} style={{ color: C.muted }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
          <rect x="1" y="8" width="3" height="4" rx="1" opacity=".5" />
          <rect x="5.5" y="5" width="3" height="7" rx="1" opacity=".5" />
          <rect x="10" y="2" width="3" height="10" rx="1" opacity=".5" />
        </svg>
        Set priority
      </div>
      <div className={row} style={{ color: C.muted }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <circle cx="7" cy="7" r="6" strokeDasharray="2 1.6" />
          <circle cx="7" cy="5.6" r="1.8" />
          <path d="M3.8 11c.7-1.4 1.8-2.1 3.2-2.1s2.5.7 3.2 2.1" />
        </svg>
        Assign
      </div>
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
      <div className={row} style={{ color: C.muted }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <path d="M2 4.5 7 2l5 2.5v5L7 12 2 9.5v-5Z" />
        </svg>
        Add to project
      </div>
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

/** Linear's 28px round add-reaction button: opens the Linear style picker (a sheet on a phone). */
function AddReaction({ onSelect, sheet = false }: { onSelect: (unified: string) => void; sheet?: boolean }) {
  return (
    <ScenePicker
      appStyle={linear}
      theme={THEME}
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
    <article className={cn("rounded-[8px] px-4 py-3", !compact && "-ml-2 w-[612px]")} style={{ background: C.card, border: `0.5px solid ${C.cardBorder}`, boxShadow: "0 0.5px 1px 1px lch(0 0 0 / 0.3)" }}>
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
  const { value, setText, autocomplete, inputProps } = useAutocompleteInput<HTMLTextAreaElement>({ limit: 12 });
  const submit = () => {
    const text = value.trim();
    if (text) onSend(text);
    setText("");
  };
  return (
    <div className={cn("relative", !compact && "mt-4 -ml-2 w-[612px]")}>
      <StyleAutocomplete appStyle={linear} autocomplete={autocomplete} className="absolute bottom-full left-4 mb-1 max-w-[calc(100%-32px)]" />
      <div className="relative h-[83px] rounded-[8px] px-4 py-3" style={{ background: C.card, border: `0.5px solid ${C.cardBorder}`, boxShadow: "0 0.5px 1px 1px lch(0 0 0 / 0.3)" }}>
        <textarea
          {...inputProps}
          rows={1}
          aria-label="Leave a comment"
          placeholder="Leave a comment..."
          className={cn("block h-6 w-full resize-none bg-transparent outline-none placeholder:text-(--ph)", BODY)}
          style={{ color: "lch(90.826 1.425 272)", "--ph": C.muted } as React.CSSProperties}
          onKeyDown={(e) => {
            if (autocomplete.onKeyDown(e)) return;
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {/* Send: 24×24 round at window (916.6, 460) → 18.4px from the right, 14.5px from the bottom. */}
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

// Icons in Linear's 14–16px line style (currentColor).
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


/** (B) The description: a Tiptap editor with Linear's inline ":" emoji menu. */
function Description({ compact = false }: { compact?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit, EmojiSuggestion],
    content: "<p>The reaction picker opens below the fold when the editor scrolls. Try :s</p>",
    immediatelyRender: true,
    // On a phone the editor reaches the edges, its text 14px in (10px above, 16 below).
    editorProps: { attributes: { "aria-label": "Issue description", class: cn("outline-none [&_p]:m-0 caret-[lch(90.451_1.2_272)]", compact ? "mt-[22px] -mx-[14px] px-[14px] pt-2.5 pb-4" : "mt-6", BODY) } },
  });
  if (!editor) return null;
  return (
    <div style={{ color: C.text }}>
      <EditorContent editor={editor} />
      <EmojiSuggestionMenu editor={editor} className={INLINE_MENU} limit={12} side="top" />
    </div>
  );
}

// (A) Linear's team/document icon popover: 412×411, radius 6, an "Icons | Emojis" tab row
// (31.5px, 13px/500, 2px accent underline), a 401×28 search at (5.5, 36), 12px/22px
// section titles at x=10.5 and 14 columns of 28px cells from x=10.5.
const TEAM_PICKER: PickerLayout = {
  ...linear.layout,
  root: "h-[379.5px] w-[412px] bg-transparent font-picker text-picker-foreground [--emoji-size:20px] [--emoji-cell-size:28px] [--emoji-image-size:20px] [--emoji-header-height:28px] [--emoji-list-padding:10.5px]",
  columns: 14,
  header: "h-7 bg-picker-background pt-1.5 pr-1.5 pl-[10.5px] text-[12px] leading-[22px] font-medium text-picker-muted",
  searchRow: "border-b border-(--linear-divider) px-[5.5px] pt-[4.5px] pb-1",
  input: "h-7 w-full rounded-[8px] bg-picker-background py-1.5 pr-7 pl-[9px] text-[13px] outline-none placeholder:text-picker-subtle",
  scrollbar: "[scrollbar-width:thin]",
};

const ACCENT = "lch(52.418 61.103 288.421)";

/** Linear's tab row over the team icon picker; the Icons tab is shown but disabled. */
const TEAM_TABS = (
  <div role="tablist" className="flex h-[31.5px] shrink-0 items-stretch pr-2 pl-1.5" style={{ borderBottom: "1px solid lch(21.36 1.93 272)" }}>
    <button type="button" role="tab" aria-selected={false} disabled className="flex h-full cursor-default items-center px-2 py-[7px] text-[13px] font-medium" style={{ color: "lch(64.714 1.425 272)" }}>
      Icons
    </button>
    <button type="button" role="tab" aria-selected className="flex h-full items-center px-2 py-[7px] text-[13px] font-medium outline-none" style={{ color: "lch(91.178 1.425 272)", boxShadow: `inset 0 -1px 0 ${ACCENT}, 0 1px 0 ${ACCENT}` }}>
      Emojis
    </button>
  </div>
);

function TeamIconPopover({ value, onChange, sheet = false }: { value: string; onChange: (unified: string) => void; sheet?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const t = themed(THEME);
  const tile = <Emoji emoji={value} size={18} className="text-[18px] leading-none" />;
  if (sheet)
    return (
      <PickerSheet
        appStyle={linear}
        layout={TEAM_PICKER}
        top={TEAM_TABS}
        theme={THEME}
        label="Change team icon"
        title="Change icon"
        onSelect={(s) => onChange(s.unified)}
        font={FONT}
        triggerClassName="flex size-8 cursor-pointer items-center justify-center rounded-[6px] bg-[lch(13.861_1.139_272)] outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]"
      >
        {tile}
      </PickerSheet>
    );
  return (
    <EmojiPopover.Root open={open} onOpenChange={setOpen}>
      <EmojiPopover.Trigger
        aria-label="Change team icon"
        title="Change icon"
        className="flex size-8 cursor-pointer items-center justify-center rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]"
        style={{ background: "lch(13.861 1.139 272)" }}
      >
        {tile}
      </EmojiPopover.Trigger>
      <EmojiPopover.Content side="bottom" align="start" aria-label="Linear style icon picker" className={t.className} style={{ ...t.style, fontFamily: FONT }}>
        <FitViewport width={412}>
          <div data-style="linear" className={cn("flex h-[411px] w-[412px] flex-col overflow-hidden rounded-[6px] border-[0.5px] border-picker-border bg-picker-background text-picker-foreground", POPUP_SHADOW)}>
            {TEAM_TABS}
            <StylePicker
              layout={TEAM_PICKER}
              onSelect={(s) => {
                onChange(s.unified);
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

/** (A) A team overview header: the icon tile and a 24px/600 title. */
function TeamFrame({ compact }: { compact: boolean }) {
  const [icon, setIcon] = React.useState("1f680"); // 🚀
  if (compact)
    return (
      <MobileFrame theme={THEME} label="Linear style team header" appStyle={linear} height={150} style={{ background: C.panel, color: C.text, fontFamily: FONT, fontFeatureSettings: "'cv01', 'ss03'" }}>
        <div className="flex h-11 shrink-0 items-center gap-2 pr-3 pl-[14px] text-[13px] leading-4 font-medium" style={{ borderBottom: `0.5px solid ${C.divider}` }} aria-hidden>
          <span>Teams</span>
          <Chevron />
          <span>Atlas</span>
        </div>
        <div className="px-[14px] pt-6">
          <div className="flex items-center gap-3">
            <TeamIconPopover value={icon} onChange={setIcon} sheet />
            <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.16px]" style={{ color: C.title }}>
              Atlas
            </h1>
          </div>
          <p className={cn("mt-3", BODY)} style={{ color: C.muted }}>
            Platform team · tap the icon to change it
          </p>
        </div>
      </MobileFrame>
    );
  return (
    <SceneFrame width={W} height={196} theme={THEME} label="Linear style team header" appStyle={linear} className="rounded-xl shadow-2xl" style={{ background: C.window, color: C.text, fontFamily: FONT, fontFeatureSettings: "'cv01', 'ss03'" }}>
      <div className="absolute inset-[8.5px] flex flex-col overflow-hidden rounded-[8px]" style={{ background: C.panel, border: `0.5px solid ${C.panelBorder}` }}>
        <div className="flex h-11 shrink-0 items-center gap-2 pr-3 pl-[21px] text-[13px] leading-4 font-medium" style={{ borderBottom: `0.5px solid ${C.divider}` }} aria-hidden>
          <span>Teams</span>
          <Chevron />
          <span>Atlas</span>
        </div>
        <div className="ml-[53.5px] w-[596px] pt-8">
          <div className="flex items-center gap-3">
            <TeamIconPopover value={icon} onChange={setIcon} />
            <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.16px]" style={{ color: C.title }}>
              Atlas
            </h1>
          </div>
          <p className={cn("mt-3", BODY)} style={{ color: C.muted }}>
            Platform team · click the icon to change it
          </p>
        </div>
      </div>
    </SceneFrame>
  );
}

export function LinearScene() {
  useFontStylesheet("https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap");
  const { ref, compact } = useCompact();
  const issue = useIssue();
  return (
    <div ref={ref} className={cn("flex w-full flex-col", compact ? "gap-4" : "gap-6")}>
      {compact ? <MobileIssueFrame issue={issue} /> : <IssueFrame issue={issue} />}
      <TeamFrame compact={compact} />
    </div>
  );
}

