import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Emoji } from "@brianhung/emoji-picker-react";
import { notion } from "./picker";
import { useTiptapEmojiTypeahead } from "@/hooks/emoji-tiptap";
import { NotionEmojiMenu, notionEmojiOptions } from "@/experiences/notion";
import { cn } from "@/lib/utils";
import { ld, MobileFrame, SceneFrame, ScenePicker, useCompact } from "@/styles/scene-kit";
import { copyEmoji } from "@/components/site/picked";


const INK = ld("#2c2c2b", "#f0efed");
const MUTED = "#7d7a75";
const SLASH = ld("rgba(55,53,47,0.35)", "rgb(255 255 255 / 0.2)");
const FONT = "var(--site-text-emoji,) ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif";

const CONTENT = `
<p>Three days, one cabin, zero laptops (mostly). Type <code>:</code> and a few letters to add an emoji, like :tada or :tent.</p>
<h3>Packing list</h3>
<ul><li><p>Hiking boots 🥾</p></li><li><p>Board games 🎲</p></li><li><p>Snacks for the drive</p></li></ul>
<p></p>`;

export function NotionScene() {
  const { ref, compact } = useCompact();
  const [icon, setIcon] = React.useState("1f3d5-fe0f");
  const title = "Team offsite";
  const editor = useEditor({
    extensions: [StarterKit],
    content: CONTENT,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        "aria-label": "Page content",
        class: [
          "outline-none text-[16px] leading-[1.5] text-[#2c2c2b] caret-[#2c2c2b] dark:text-[#f0efed] dark:caret-[#f0efed]",
          "[&_p]:my-[2px] [&_p]:py-[3px] [&_p]:px-[2px]",
          "[&_h3]:mt-4 [&_h3]:mb-px [&_h3]:px-[2px] [&_h3]:py-[3px] [&_h3]:text-[1.25em] [&_h3]:leading-[1.3] [&_h3]:font-semibold",
          "[&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-[26px] [&_li]:pl-[2px] [&_li>p]:my-px [&_li>p]:py-[3px]",
          "[&_code]:rounded-[4px] [&_code]:bg-[rgba(135,131,120,0.15)] [&_code]:px-[0.3em] [&_code]:py-[0.2em] [&_code]:font-mono [&_code]:text-[85%] [&_code]:text-[#eb5757]",
          "[&>p:last-child:has(>br:only-child)]:before:pointer-events-none [&>p:last-child:has(>br:only-child)]:before:float-left [&>p:last-child:has(>br:only-child)]:before:h-0 [&>p:last-child:has(>br:only-child)]:before:text-[light-dark(rgba(55,53,47,0.5),rgb(255_255_255/0.28))] [&>p:last-child:has(>br:only-child)]:before:content-['Type_“:”_for_emoji…']",
        ].join(" "),
      },
    },
  });
  const emoji = useTiptapEmojiTypeahead(editor, { ...notionEmojiOptions, onSelect: copyEmoji });
  const page = (
    <>
      {compact ? <MobileTopBar icon={icon} title={title} /> : <TopBar icon={icon} title={title} />}
      <div className={cn("min-h-0 flex-1 overflow-y-auto pb-16 [scrollbar-width:thin]", compact ? "px-6 pt-8" : "px-24 pt-12")}>
        <div className="group/header">
          <div className="ml-[2px] flex h-[78px] w-[78px] items-center">
            <ScenePicker
              appStyle={notion}
              label="Change icon"
              title="Change icon"
              onSelect={(s) => setIcon(s.unified)}
              font={FONT}
              sheet={compact}
              triggerClassName="flex size-[78px] cursor-pointer items-center justify-center rounded-[4px] outline-none hover:bg-[rgba(33,27,23,0.051)] focus-visible:ring-2 focus-visible:ring-[#2383e2] data-popup-open:bg-[rgba(33,27,23,0.051)] dark:hover:bg-white/[0.054] dark:data-popup-open:bg-white/[0.054]"
            >
              <Emoji emoji={icon} size={78} className="text-[78px] leading-[1.1]" />
            </ScenePicker>
          </div>
          <div className={cn("mt-2 flex h-7 items-center gap-1 text-[14px] opacity-0 transition-opacity group-hover/header:opacity-100 group-focus-within/header:opacity-100", compact && "hidden")} style={{ color: MUTED }} aria-hidden>
            <span className="rounded-[4px] px-1.5 py-1 hover:bg-[rgba(33,27,23,0.051)] dark:hover:bg-white/[0.054]">🖼 Add cover</span>
            <span className="rounded-[4px] px-1.5 py-1 hover:bg-[rgba(33,27,23,0.051)] dark:hover:bg-white/[0.054]">💬 Add comment</span>
          </div>
          <h1 className="mt-1 mb-2 px-[2px] text-[40px] leading-[1.2] font-bold" style={{ color: INK }}>
            {title}
          </h1>
        </div>
        {editor ? (
          <>
            <EditorContent editor={editor} />
            <NotionEmojiMenu {...emoji} editor={editor.view.dom} />
          </>
        ) : null}
      </div>
    </>
  );
  return (
    <div ref={ref} className="w-full">
      {compact ? (
        <MobileFrame label="Notion style page" appStyle={notion} className="bg-white dark:bg-[#191919]" style={{ color: INK, fontFamily: FONT }}>
          {page}
        </MobileFrame>
      ) : (
        <SceneFrame
          label="Notion style page"
          appStyle={notion}
          className="flex flex-col border-[rgba(55,53,47,0.16)] bg-white dark:border-white/10 dark:bg-[#191919]"
          style={{ color: INK, fontFamily: FONT }}
        >
          {page}
        </SceneFrame>
      )}
    </div>
  );
}

function MobileTopBar({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 pr-2 pl-[15px] text-[14px]" aria-hidden>
      <Emoji emoji={icon} size={18} className="text-[18px] leading-none" />
      <span className="min-w-0 truncate" style={{ color: INK }}>
        {title}
      </span>
      <div className="ml-auto flex items-center" style={{ color: INK }}>
        <span className="flex size-9 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12.5V3M6.5 6.2 10 2.8l3.5 3.4M6 9H5a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 15 9h-1" />
          </svg>
        </span>
        <span className="flex size-9 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="4.5" cy="10" r="1.4" />
            <circle cx="10" cy="10" r="1.4" />
            <circle cx="15.5" cy="10" r="1.4" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function TopBar({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 px-3 text-[14px] leading-[1.2]" aria-hidden>
      <span className="flex h-6 items-center gap-1.5 rounded-[4px] px-1.5" style={{ color: MUTED }}>
        Team space
      </span>
      <span style={{ color: SLASH }}>/</span>
      <span className="flex h-6 items-center gap-1.5 rounded-[4px] px-1.5" style={{ color: INK }}>
        <Emoji emoji={icon} size={16} className="text-[16px] leading-none" />
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

