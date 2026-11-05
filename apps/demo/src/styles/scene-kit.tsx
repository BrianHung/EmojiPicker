import * as React from "react";
import { Emoji, useEmojiStatus, useEmojiStore, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { avatarFor } from "@/lib/people";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { copyEmoji } from "@/components/site/picked";
import { tokensOf, type Style, type StylePickerProps } from "./style";

export const ld = (light: string, dark: string) => `light-dark(${light}, ${dark})`;

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

export const SITE_FRAME = { width: 1000, height: 720 } as const;

export type SceneFrameProps = {
  width?: number;
  height?: number;
  label: string;
  appStyle?: Style;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export function SceneFrame({ width = SITE_FRAME.width, height = SITE_FRAME.height, label, appStyle, className, style, children }: SceneFrameProps) {
  const { ref, scale } = useFitScale(width);
  return (
    <div ref={ref} className="mx-auto w-full" style={{ maxWidth: width }}>
      <div style={{ width: width * scale, height: height * scale }}>
        <div
          role="region"
          aria-label={label}
          data-style={appStyle?.id}
          className={cn("relative overflow-hidden rounded-xl border shadow-2xl", className)}
          style={{ ...tokensOf(appStyle), width, height, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "0 0", ...style }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function useCompact(breakpoint = 640) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [compact, setCompact] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setCompact(el.clientWidth < breakpoint);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [breakpoint]);
  return { ref, compact };
}

export type MobileFrameProps = Omit<SceneFrameProps, "width" | "height"> & { height?: number };

export function MobileFrame({ height = 640, label, appStyle, className, style, children }: MobileFrameProps) {
  return (
    <div role="region" aria-label={label} data-style={appStyle?.id} className={cn("relative mx-auto flex w-full max-w-[430px] flex-col overflow-hidden", className)} style={{ ...tokensOf(appStyle), height, ...style }}>
      {children}
    </div>
  );
}

export function FitViewport({ width, children }: { width: number; children: React.ReactNode }) {
  const [zoom, setZoom] = React.useState(1);
  React.useLayoutEffect(() => {
    const update = () => setZoom(Math.min(1, (window.innerWidth - 16) / width));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width]);
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
  appStyle: Style;
  onSelect: (selection: EmojiSelection) => void;
  children: React.ReactNode;
  label: string;
  triggerClassName?: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  pickerClassName?: string;
  font?: string;
  sheet?: boolean;
};

export function ScenePicker({ appStyle: style, onSelect, children, label, triggerClassName, side = "bottom", align = "start", open, onOpenChange, title, pickerClassName, font, sheet }: ScenePickerProps) {
  if (sheet)
    return (
      <PickerSheet appStyle={style} onSelect={onSelect} label={label} title={title} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange} font={font}>
        {children}
      </PickerSheet>
    );
  return (
    <EmojiPopover.Root open={open} onOpenChange={onOpenChange}>
      <EmojiPopover.Trigger aria-label={label} title={title} className={triggerClassName}>
        {children}
      </EmojiPopover.Trigger>
      <EmojiPopover.Content side={side} align={align} aria-label={`${style.label} style emoji picker`} style={{ fontFamily: font }}>
        <FitViewport width={style.size.width}>
          <style.Picker onSelect={(s) => (onSelect(s), copyEmoji(s))} autoFocus className={pickerClassName} />
        </FitViewport>
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}

export type PickerSheetProps = {
  appStyle: Style;
  onSelect: (selection: EmojiSelection) => void;
  label: string;
  children?: React.ReactNode;
  title?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  font?: string;
  Picker?: React.ComponentType<StylePickerProps>;
  top?: React.ReactNode;
};

export function PickerSheet({ appStyle: style, onSelect, label, children, title, triggerClassName, open, onOpenChange, font, Picker = style.Picker, top }: PickerSheetProps) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const isOpen = open ?? uncontrolled;
  const setOpen = (next: boolean) => {
    if (open === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };
  const body = React.useRef<HTMLDivElement>(null);
  return (
    <Drawer open={isOpen} onOpenChange={setOpen} showSwipeHandle>
      {children ? (
        <DrawerTrigger aria-label={label} title={title} className={triggerClassName}>
          {children}
        </DrawerTrigger>
      ) : null}
      <DrawerContent
        data-style={style.id}
        className="border-picker-border bg-picker-background font-picker text-picker-foreground [--drawer-bleed-background:var(--emoji-picker-background)] *:data-[slot=drawer-swipe-handle]:after:bg-picker-muted/40"
        style={{ ...tokensOf(style), fontFamily: font }}
        initialFocus={(type) => (type === "touch" ? true : (body.current?.querySelector("input") ?? true))}
      >
        <DrawerTitle className="sr-only">{label}</DrawerTitle>
        <div ref={body} className="flex min-h-0 flex-col">
          {top}
          <Picker
            fluid
            onSelect={(s) => {
              onSelect(s);
              copyEmoji(s);
              setOpen(false);
            }}
            className="h-[min(420px,55dvh)] w-full rounded-none border-0 bg-transparent shadow-none backdrop-blur-none [&_[data-slot=emoji-picker-category-nav]]:min-w-0 [&_[data-slot=emoji-picker-category-nav]]:overflow-x-auto [&_[data-slot=emoji-picker-category-nav]]:[scrollbar-width:none]"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = React.useRef(0);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const latest = React.useRef(onLongPress);
  latest.current = onLongPress;
  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  React.useEffect(() => cancel, []);
  const outside = (e: React.SyntheticEvent) => !(e.currentTarget as Node).contains(e.target as Node);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 || outside(e)) return;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        start.current = null;
        latest.current();
      }, delay);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      if (outside(e)) return;
      e.preventDefault();
      cancel();
      latest.current();
    },
  };
}

export function useFontStylesheet(href: string) {
  React.useInsertionEffect(() => {
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
}

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

export function EmojiText({ text, size, className }: { text: string; size: number; className?: string }) {
  const store = useEmojiStore();
  const status = useEmojiStatus();
  return React.useMemo(() => {
    const segs = segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : [text];
    const out: React.ReactNode[] = [];
    let run = "";
    segs.forEach((seg, i) => {
      const unified = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(seg) ? toUnified(seg) : "";
      const record = unified ? (store.get(unified) ?? store.get(unified.replace(/-fe0f/g, ""))) : undefined;
      if (!record) return void (run += seg);
      if (run) out.push(run);
      run = "";
      out.push(<Emoji key={i} emoji={store.get(unified) ? unified : record.unified} size={size} className={className} title={record.shortcodes[0] ? `:${record.shortcodes[0]}:` : record.name} />);
    });
    if (run) out.push(run);
    return <>{out}</>;
  }, [text, store, status, size, className]);
}
