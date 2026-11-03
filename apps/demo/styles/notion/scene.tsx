// Notion style, in situ: a page (light). The page icon opens the Notion style picker
// (Emoji / Icons / Upload) to change it, and the body is a real Tiptap editor where
// ":" plus a few letters opens Notion-style emoji suggestions at the caret.
// Notion's page metrics: warm ink #37352f, 40px/1.2 bold title, 16px/1.5 body,
// a 78px icon, 96px side padding on a wide page.
import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Emoji } from "@brianhung/emoji-picker";
import { notion } from "../../examples/notion";
import { EmojiSuggestion, EmojiSuggestionMenu } from "../../examples/tiptap/emoji-suggestion";
import { SceneFrame, ScenePicker } from "../kit";

const W = 760;
const H = 600;
const THEME = "light";

const INK = "#37352f";
const MUTED = "rgba(55, 53, 47, 0.5)";
const FONT = "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif";

const CONTENT = `
<p>Three days, one cabin, zero laptops (mostly). Type <code>:</code> and a few letters to add an emoji, like :tada or :tent.</p>
<h3>Packing list</h3>
<ul><li><p>Hiking boots 🥾</p></li><li><p>Board games 🎲</p></li><li><p>Snacks for the drive</p></li></ul>
<p></p>`;

// Notion's inline menu: a 10px-radius white card with its layered shadow, 28px rows,
// the highlighted row in an 8% ink wash. (Overrides the menu's default shadcn look.)
const MENU = [
  "w-[260px] rounded-[10px] border-0 bg-white p-1 text-[14px] text-[#37352f] [font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,'Apple_Color_Emoji',Arial,sans-serif]",
  "shadow-[0_0_0_1px_rgb(15_15_15/0.05),0_3px_6px_rgb(15_15_15/0.1),0_9px_24px_rgb(15_15_15/0.2)]",
  "[&>li]:h-7 [&>li]:gap-2 [&>li]:rounded-[6px] [&>li]:px-2",
  "[&>li[data-highlighted]]:bg-[rgba(55,53,47,0.08)] [&>li[data-highlighted]]:text-[#37352f]",
  "[&_span]:[font-family:inherit] [&_span]:text-[14px] [&_b]:font-semibold",
].join(" ");

export function NotionScene() {
  const [icon, setIcon] = React.useState("1f3d5-fe0f"); // 🏕️
  const title = "Team offsite";
  const editor = useEditor({
    extensions: [StarterKit, EmojiSuggestion],
    content: CONTENT,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        "aria-label": "Page content",
        class: [
          "outline-none text-[16px] leading-[1.5] text-[#37352f] caret-[#37352f]",
          "[&_p]:my-[2px] [&_p]:py-[3px] [&_p]:px-[2px]",
          "[&_h3]:mt-4 [&_h3]:mb-px [&_h3]:px-[2px] [&_h3]:py-[3px] [&_h3]:text-[1.25em] [&_h3]:leading-[1.3] [&_h3]:font-semibold",
          "[&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-[26px] [&_li]:pl-[2px] [&_li>p]:my-px [&_li>p]:py-[3px]",
          "[&_code]:rounded-[4px] [&_code]:bg-[rgba(135,131,120,0.15)] [&_code]:px-[0.3em] [&_code]:py-[0.2em] [&_code]:font-mono [&_code]:text-[85%] [&_code]:text-[#eb5757]",
          // Notion's hint on the empty last line.
          "[&>p:last-child:has(>br:only-child)]:before:pointer-events-none [&>p:last-child:has(>br:only-child)]:before:float-left [&>p:last-child:has(>br:only-child)]:before:h-0 [&>p:last-child:has(>br:only-child)]:before:text-[rgba(55,53,47,0.5)] [&>p:last-child:has(>br:only-child)]:before:content-['Type_“:”_for_emoji…']",
        ].join(" "),
      },
    },
  });
  return (
    <SceneFrame
      width={W}
      height={H}
      theme={THEME}
      label="Notion style page"
      appStyle={notion}
      className="flex flex-col rounded-[12px] bg-white shadow-2xl ring-1 ring-[rgba(55,53,47,0.16)]"
      style={{ color: INK, fontFamily: FONT }}
    >
      <TopBar icon={icon} title={title} />
      <div className="min-h-0 flex-1 overflow-y-auto px-24 pt-12 pb-16 [scrollbar-width:thin]">
        <div className="group/header">
          <div className="-ml-0.5 flex h-[78px] w-[78px] items-center">
            <ScenePicker
              appStyle={notion}
              theme={THEME}
              label="Change icon"
              title="Change icon"
              onSelect={(s) => setIcon(s.unified)}
              font={FONT}
              triggerClassName="flex size-[78px] cursor-pointer items-center justify-center rounded-[4px] outline-none hover:bg-[rgba(55,53,47,0.08)] focus-visible:ring-2 focus-visible:ring-[#2383e2] data-[state=open]:bg-[rgba(55,53,47,0.08)]"
            >
              <Emoji unified={icon} size={78} className="text-[78px] leading-[1.1]" />
            </ScenePicker>
          </div>
          <div className="mt-1 flex h-7 items-center gap-1 text-[14px] opacity-0 transition-opacity group-hover/header:opacity-100 group-focus-within/header:opacity-100" style={{ color: MUTED }} aria-hidden>
            <span className="rounded-[4px] px-1.5 py-1 hover:bg-[rgba(55,53,47,0.08)]">🖼 Add cover</span>
            <span className="rounded-[4px] px-1.5 py-1 hover:bg-[rgba(55,53,47,0.08)]">💬 Add comment</span>
          </div>
          <h1 className="mt-1 mb-2 px-[2px] pt-[3px] text-[40px] leading-[1.2] font-bold" style={{ color: INK }}>
            {title}
          </h1>
        </div>
        {editor ? (
          <>
            <EditorContent editor={editor} />
            <EmojiSuggestionMenu editor={editor} className={MENU} />
          </>
        ) : null}
      </div>
    </SceneFrame>
  );
}

function TopBar({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex h-[45px] shrink-0 items-center gap-1 px-3 text-[14px]" aria-hidden>
      <span className="flex h-6 items-center gap-1.5 rounded-[4px] px-1.5" style={{ color: MUTED }}>
        Team space
      </span>
      <span style={{ color: "rgba(55,53,47,0.35)" }}>/</span>
      <span className="flex h-6 items-center gap-1.5 rounded-[4px] px-1.5" style={{ color: INK }}>
        <Emoji unified={icon} size={16} className="text-[16px] leading-none" />
        {title}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <span className="px-2" style={{ color: MUTED }}>
          Edited just now
        </span>
        <span className="flex h-7 items-center rounded-[4px] px-2" style={{ color: INK }}>
          Share
        </span>
        <span className="flex size-7 items-center justify-center" style={{ color: INK }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <path d="m10 2.8 2.2 4.5 5 .7-3.6 3.5.8 5L10 14.2l-4.4 2.3.8-5L2.8 8l5-.7L10 2.8Z" />
          </svg>
        </span>
        <span className="flex size-7 items-center justify-center" style={{ color: INK }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="4.5" cy="10" r="1.4" />
            <circle cx="10" cy="10" r="1.4" />
            <circle cx="15.5" cy="10" r="1.4" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export default NotionScene;
