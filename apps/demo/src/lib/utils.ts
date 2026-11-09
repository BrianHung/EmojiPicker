import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const PICKER_COLORS = ["background", "foreground", "muted", "subtle", "border", "input", "input-border", "panel", "hover", "selected", "accent", "ring"].map((c) => `picker-${c}`);

const twMerge = extendTailwindMerge({
  extend: {
    theme: { color: PICKER_COLORS, font: ["picker"], radius: ["picker"], shadow: ["picker"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
