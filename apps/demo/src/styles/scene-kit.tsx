// Shared pieces for the in-situ scenes: a fixed-size app frame that scales down to
// fit, a popover that keeps the app's theme when it portals out of the frame, and
// small helpers (fonts, avatars).
import * as React from "react";
import { Emoji, EmojiPopover, useEmojiStatus, useEmojiStore, type EmojiSelection } from "@brianhung/emoji-picker";
import { avatarFor } from "@/lib/people";
import { cn } from "@/lib/utils";
import { StylePicker, useStyleTokens, type Style } from "./style-picker";

export type SceneTheme = "light" | "dark";

/** The width the frame gets: its container's, capped at the scene's own width. */
function useFitScale(width: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return { ref, scale };
}

export type SceneFrameProps = {
  width: number;
  height: number;
  /** The app's own theme, forced regardless of the site's. */
  theme: SceneTheme;
  /** Accessible name of the region ("Discord style channel"). */
  label: string;
  /** The app style whose tokens (pills, popups) the scene's own markup uses. */
  appStyle?: Style;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * A cropped app window at its real pixel size. On narrow screens it scales down
 * (transform, so the inside keeps its measured layout) and never scrolls sideways.
 */
export function SceneFrame({ width, height, theme, label, appStyle, className, style, children }: SceneFrameProps) {
  const { ref, scale } = useFitScale(width);
  useStyleTokens(appStyle?.id, appStyle?.layout.tokens);
  return (
    <div ref={ref} className="mx-auto w-full" style={{ maxWidth: width }}>
      <div style={{ width: width * scale, height: height * scale }}>
        <div
          role="region"
          aria-label={label}
          data-scene-theme={theme}
          data-style={appStyle?.id}
          className={cn(theme === "dark" && "dark", "relative overflow-hidden", className)}
          style={{ width, height, colorScheme: theme, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "0 0", ...style }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Props for a portaled layer (popover content) so it keeps the scene's theme outside the frame. */
export const themed = (theme: SceneTheme) => ({ className: theme === "dark" ? "dark" : undefined, style: { colorScheme: theme } as React.CSSProperties });

/** Shrinks a portaled popup that is wider than the viewport (a 498px picker on a 375px phone). */
export function FitViewport({ width, children }: { width: number; children: React.ReactNode }) {
  const [zoom, setZoom] = React.useState(1);
  React.useLayoutEffect(() => {
    const update = () => setZoom(Math.min(1, (window.innerWidth - 16) / width));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width]);
  // The popover mounts hidden while it measures, so the picker's own autofocus can miss;
  // focus its search once the popover is visible (as the apps do on open).
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let frames = 0;
    let id = 0;
    const tick = () => {
      const el = ref.current;
      if (!el || el.contains(document.activeElement)) return;
      const input = el.querySelector("input");
      if (input && getComputedStyle(input).visibility === "visible") return input.focus({ preventScroll: true });
      if (++frames < 10) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div ref={ref} style={zoom < 1 ? { zoom } : undefined}>
      {children}
    </div>
  );
}

export type ScenePickerProps = {
  /** The app style whose picker opens. */
  appStyle: Style;
  theme: SceneTheme;
  onSelect: (selection: EmojiSelection) => void;
  children: React.ReactNode;
  label: string;
  triggerClassName?: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  /** Classes for the picker root (e.g. a measured shadow the style's tokens don't have yet). */
  pickerClassName?: string;
  /** Font for the portaled popover, which otherwise inherits the site's. */
  font?: string;
};

/** A trigger that opens the app style's full picker; picking closes it. */
export function ScenePicker({ appStyle: style, theme, onSelect, children, label, triggerClassName, side = "bottom", align = "start", open, onOpenChange, title, pickerClassName, font }: ScenePickerProps) {
  const t = themed(theme);
  return (
    <EmojiPopover.Root open={open} onOpenChange={onOpenChange}>
      <EmojiPopover.Trigger aria-label={label} title={title} className={triggerClassName}>
        {children}
      </EmojiPopover.Trigger>
      <EmojiPopover.Content side={side} align={align} aria-label={`${style.label} style emoji picker`} className={t.className} style={{ ...t.style, fontFamily: font }}>
        <FitViewport width={style.size.width}>
          <StylePicker layout={style.layout} onSelect={onSelect} autoFocus className={pickerClassName} />
        </FitViewport>
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}

/** Loads a Google Fonts stylesheet once (the gallery page doesn't load every app's font). */
export function useFontStylesheet(href: string) {
  React.useInsertionEffect(() => {
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
}

/** A generated avatar: the person's Bufo, or initials on a flat color. No photos of real people. */
export function Avatar({ name, size, color, src = avatarFor(name), className, fontSize }: { name: string; size: number; color: string; src?: string; className?: string; fontSize?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none", className)}
      style={{ width: size, height: size, fontSize: fontSize ?? Math.round(size * 0.4), background: color }}
    >
      {src ? <img src={src} alt="" className="size-full rounded-full bg-[#e6e6eb] object-contain" /> : initials}
    </span>
  );
}

export type Reaction = { unified: string; count: number; mine: boolean };

export function toggleReaction(list: Reaction[], unified: string): Reaction[] {
  const existing = list.find((r) => r.unified === unified);
  if (!existing) return [...list, { unified, count: 1, mine: true }];
  return list.map((r) => (r.unified === unified ? { ...r, count: r.count + (r.mine ? -1 : 1), mine: !r.mine } : r)).filter((r) => r.count > 0);
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const toUnified = (emoji: string) => [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");

/** Message text with each emoji drawn by <Emoji>, so the provider's renderer (Twemoji for Discord) applies. */
export function EmojiText({ text, size, className }: { text: string; size: number; className?: string }) {
  const store = useEmojiStore();
  const status = useEmojiStatus();
  return React.useMemo(() => {
    const segs = segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : [text];
    const out: React.ReactNode[] = [];
    let run = "";
    segs.forEach((seg, i) => {
      const unified = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(seg) ? toUnified(seg) : "";
      const record = unified ? store.get(unified) ?? store.get(unified.replace(/-fe0f/g, "")) : undefined;
      if (!record) return void (run += seg);
      if (run) out.push(run);
      run = "";
      out.push(<Emoji key={i} unified={store.get(unified) ? unified : record.unified} size={size} className={className} title={record.shortcodes[0] ? `:${record.shortcodes[0]}:` : record.name} />);
    });
    if (run) out.push(run);
    return <>{out}</>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, store, status, size, className]);
}
