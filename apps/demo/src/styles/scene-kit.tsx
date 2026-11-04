import * as React from "react";
import { Emoji, useEmojiStatus, useEmojiStore, type EmojiSelection } from "@brianhung/emoji-picker";
import { EmojiPopover } from "@brianhung/emoji-picker/floating-ui";
import { avatarFor } from "@/lib/people";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { StylePicker, useStyleTokens, type PickerLayout, type Style } from "./style-picker";

/** A color for the site's light and dark themes. */
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

export type SceneFrameProps = {
  width: number;
  height: number;
  /** Accessible name of the region ("Discord style channel"). */
  label: string;
  /** The app style whose tokens the scene's own markup uses. */
  appStyle?: Style;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** An app window at its real pixel size, scaled down (not reflowed) to fit narrow containers. */
export function SceneFrame({ width, height, label, appStyle, className, style, children }: SceneFrameProps) {
  const { ref, scale } = useFitScale(width);
  useStyleTokens(appStyle?.id, appStyle?.layout.tokens);
  return (
    <div ref={ref} className="mx-auto w-full" style={{ maxWidth: width }}>
      <div style={{ width: width * scale, height: height * scale }}>
        <div
          role="region"
          aria-label={label}
          data-style={appStyle?.id}
          className={cn("relative overflow-hidden", className)}
          style={{ width, height, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "0 0", ...style }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Whether the scene's container is narrower than `breakpoint`, where scenes switch to the app's mobile layout. */
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
  useStyleTokens(appStyle?.id, appStyle?.layout.tokens);
  return (
    <div
      role="region"
      aria-label={label}
      data-style={appStyle?.id}
      className={cn("relative mx-auto flex w-full max-w-[430px] flex-col overflow-hidden", className)}
      style={{ height, ...style }}
    >
      {children}
    </div>
  );
}

/** Shrinks a portaled popup that is wider than the viewport. */
export function FitViewport({ width, children }: { width: number; children: React.ReactNode }) {
  const [zoom, setZoom] = React.useState(1);
  React.useLayoutEffect(() => {
    const update = () => setZoom(Math.min(1, (window.innerWidth - 16) / width));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width]);
  // The popover mounts hidden while it measures, so the picker's autofocus can miss.
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
  /** Font for the portaled popover, which otherwise inherits the site's. */
  font?: string;
  sheet?: boolean;
};

/** A trigger that opens the app style's picker in a popover, or a bottom sheet with `sheet`. */
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
          <StylePicker layout={style.layout} onSelect={onSelect} autoFocus className={pickerClassName} />
        </FitViewport>
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}

export type PickerSheetProps = {
  appStyle: Style;
  onSelect: (selection: EmojiSelection) => void;
  label: string;
  /** Omit to drive the sheet with `open`. */
  children?: React.ReactNode;
  title?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  font?: string;
  layout?: PickerLayout;
  top?: React.ReactNode;
};

/** The app style's picker in a full-width bottom sheet. Picking closes it. */
export function PickerSheet({ appStyle: style, onSelect, label, children, title, triggerClassName, open, onOpenChange, font, layout = style.layout, top }: PickerSheetProps) {
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
        style={{ fontFamily: font }}
        // Keyboard opens into search; a tap doesn't raise the phone's keyboard.
        initialFocus={(type) => (type === "touch" ? true : (body.current?.querySelector("input") ?? true))}
      >
        <DrawerTitle className="sr-only">{label}</DrawerTitle>
        <div ref={body} className="flex min-h-0 flex-col">
          {top}
          <StylePicker
            layout={layout}
            fluid
            onSelect={(s) => {
              onSelect(s);
              setOpen(false);
            }}
            className="h-[min(420px,55dvh)] w-full rounded-none border-0 bg-transparent shadow-none backdrop-blur-none [&_[data-slot=category-nav]]:min-w-0 [&_[data-slot=category-nav]]:overflow-x-auto [&_[data-slot=category-nav]]:[scrollbar-width:none]"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Press and hold, or right click: spread onto a message to open its reactions. */
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
  // React bubbles events from portals; those aren't presses on the message.
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

/** Loads a Google Fonts stylesheet once. */
export function useFontStylesheet(href: string) {
  React.useInsertionEffect(() => {
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
}

/** The person's Bufo, or initials on a flat color. */
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

/** Message text with each emoji drawn by <Emoji>, so the provider's renderer applies. */
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
      out.push(<Emoji key={i} emoji={store.get(unified) ? unified : record.unified} size={size} className={className} title={record.shortcodes[0] ? `:${record.shortcodes[0]}:` : record.name} />);
    });
    if (run) out.push(run);
    return <>{out}</>;
  }, [text, store, status, size, className]);
}
