// Whether a screen reader can be automated on this machine. Read-only checks; the setup itself
// (`npx @guidepup/setup setup`) changes system settings and is left to the user or CI.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SETUP = "npx @guidepup/setup setup (once per machine; changes OS settings) and npx @guidepup/setup install (in apps/demo)";

/** Guidepup's screen reader assets, as `npx @guidepup/setup install` lays them out. */
function assets(id: "voiceover" | "nvda") {
  const root =
    process.env.GUIDEPUP_SCREEN_READERS_PATH ??
    (process.platform === "darwin" ? join(homedir(), "Library", "Caches", "guidepup") : join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "guidepup"));
  return existsSync(join(root, id));
}

/** A reason to skip, or null when the screen reader is ready. */
export function notReady(id: "voiceover" | "nvda"): string | null {
  if (id === "voiceover") {
    if (process.platform !== "darwin") return "VoiceOver runs on macOS only";
    let scripting = false;
    try {
      scripting = execFileSync("defaults", ["read", "com.apple.VoiceOver4/default", "SCREnableAppleScript"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "1";
    } catch {}
    if (!scripting || !existsSync("/private/var/db/Accessibility/.VoiceOverAppleScriptEnabled"))
      return `VoiceOver isn't set up for automation ("Allow VoiceOver to be controlled with AppleScript" is off). Run: ${SETUP}`;
    if (!assets("voiceover")) return `Guidepup's VoiceOver assets aren't installed. Run: ${SETUP}`;
    return null;
  }
  if (process.platform !== "win32") return "NVDA runs on Windows only";
  if (!assets("nvda")) return `Guidepup's NVDA isn't installed. Run: ${SETUP}`;
  return null;
}
