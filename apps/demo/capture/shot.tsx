// One style picker, alone, for side-by-side captures: /shot.html?style=slack&theme=dark&search=1
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MotionGlobalConfig } from "motion/react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, useEmojiStore } from "@brianhung/emoji-picker";
import { TEAM_EMOJI } from "@/lib/custom-emoji";
import { SCENES, StylePicker, styleById } from "@/styles";
import { AppleScene, IMessageScreen, type IMessageMode, type Message } from "@/styles/apple/scene";
import { OgImage } from "./og-image";
import { OgVideo } from "./og-video";
import "@/globals.css";

// Captures compare final frames: no animation (?anim=1 keeps them, for flow recordings).
MotionGlobalConfig.skipAnimations = new URLSearchParams(location.search).get("anim") !== "1";

const params = new URLSearchParams(location.search);
const appStyle = styleById(params.get("style") ?? "apple");
const view = params.get("view");

const dark = params.get("theme") === "dark";
document.documentElement.classList.toggle("dark", dark);
document.body.style.background = params.get("bg") ?? (dark ? "#1a1d21" : "#ffffff");

// Fixtures: the frequents each reference capture showed, most used first, so the
// "Frequently used" rows compare like for like. Test-only; the examples don't use them.
const SEEDS: Record<string, string[]> = {
  // iOS 27 keyboard "Frequently Used", most used first (iOS fills its columns top to bottom):
  // the first six are also the tapback pill's recents (😂 ❤️ 😍 😒 👌 ☺️).
  imessage27: [
    "1f602", "2764-fe0f", "1f60d", "1f612", "1f44c",
    "263a-fe0f", "1f60a", "1f618", "1f62d", "1f629",
    "1f495", "1f614", "1f60f", "1f601", "1f633",
    "1f44d", "270c-fe0f", "1f609", "1f60c", "1f481",
    "1f648", "1f60e", "1f3b6", "1f440", "1f611",
    "1f634", "1f604", "1f61c", "1f60b", "1f44f",
  ],
  linear: ["1f44d", "1f44c", "1f64f", "1f602", "2764-fe0f", "1f440", "2705", "1f642", "1f603", "1f604", "1f600", "1f914", "1f605", "26a0-fe0f", "1f615", "274c", "1f64c", "1f389"],
  discord: ["1f44d", "1f496", "1f440", "2764-fe0f", "1f605", "1f389", "1f914", "1f60e", "1f60a", "263a-fe0f", "1f680", "1f602", "1fae1", "1f44b", "2705", "1f525", "1f60d", "1f62e-200d-1f4a8", "1f972"],
};

function Seeded({ children }: { children: React.ReactNode }) {
  const store = useEmojiStore();
  const [ready, setReady] = React.useState(false);
  React.useLayoutEffect(() => {
    const seed = SEEDS[view === "imessage27" ? "imessage27" : appStyle.id] ?? [];
    seed.forEach((u, i) => {
      for (let n = 0; n < seed.length - i; n++) store.frequents.record(u);
    });
    setReady(true);
  }, [store]);
  return ready ? children : null;
}

/** og:video frames: capture/render-og.mjs sets the time with window.setOgTime(seconds). */
function OgVideoFrame() {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    Object.assign(window, { setOgTime: (s: number) => flushSync(() => setT(s)) });
  }, []);
  return <OgVideo t={t} />;
}

function Shot() {
  if (view === "og") return <OgImage />;
  if (view === "og-video") return <OgVideoFrame />;
  if (view === "scene") {
    // One in-situ scene (styles/<id>/scene.tsx): /shot.html?view=scene&style=discord[&width=375]
    const Scene = SCENES[params.get("style") ?? "discord"];
    document.body.style.margin = "0";
    return (
      <EmojiProvider data={enUrl} renderer="native" customEmojis={TEAM_EMOJI}>
        <div style={{ padding: 24, boxSizing: "border-box", width: params.get("width") ? Number(params.get("width")) : undefined }}>
          <div data-shot="scene">{Scene ? <Scene /> : `No scene "${params.get("style")}"`}</div>
        </div>
      </EmojiProvider>
    );
  }
  if (view === "imessage27") {
    // The iOS 27.2 captures (ref/imessage27-*.png): one "Hi" from an unknown number.
    // state = reacted | pill | keyboard | menu (right-click) | selected (the pill with my
    // heart already on the message) | incoming (they react to my reply: the card, held).
    const state = params.get("state") ?? "reacted";
    document.body.style.background = "#fff";
    document.body.style.margin = "0";
    const hi: Message = { id: 1, from: "them", text: "Hi", reactions: [], time: "Today 9:22 PM" };
    const kb: Message[] =
      state === "reacted"
        ? [{ ...hi, reactions: ["263a-fe0f"] }]
        : state === "selected"
          ? [{ ...hi, reactions: ["2764-fe0f"], tapback: true }]
          : state === "incoming"
            ? [hi, { id: 2, from: "me", text: "Hey! Who's this?", reactions: ["263a-fe0f"], reactedBy: "them" }]
            : [hi];
    const mode: Record<string, IMessageMode> = { pill: "tapback", selected: "tapback", keyboard: "emoji", menu: "menu" };
    return (
      <EmojiProvider data={enUrl} renderer="native">
        <Seeded>
          <div data-shot="imessage27" style={{ display: "inline-block" }}>
            <IMessageScreen
              messages={kb}
              contact={state === "incoming" ? { name: "Jamie Appleseed", initials: "JA" } : { name: "+1 (555) 564-8583", initials: "KB" }}
              initialMode={mode[state] ?? "idle"}
              time={state === "pill" || state === "menu" ? "9:31" : "9:32"}
              incoming={state === "incoming" ? { id: 2, unified: "263a-fe0f" } : undefined}
              notice={state !== "incoming"}
            />
          </div>
        </Seeded>
      </EmojiProvider>
    );
  }
  if (view === "frame") {
    // The hero: Device Hub frame around the default conversation.
    document.body.style.background = params.get("bg") ?? "#292827";
    return (
      <EmojiProvider data={enUrl} renderer="native">
        <div data-shot="frame" style={{ display: "inline-block", padding: 24 }}>
          <AppleScene scale={Number(params.get("scale") ?? 1)} />
        </div>
      </EmojiProvider>
    );
  }
  return (
    <EmojiProvider data={enUrl} renderer={appStyle.renderer ?? "native"}>
      <div style={{ padding: 24, display: "inline-block" }}>
        <div data-shot={appStyle.id} style={{ display: "inline-block" }}>
          <Seeded>
            <StylePicker layout={appStyle.layout} search={params.get("search") !== "0"} searchResults={params.get("results") === "grouped" ? "grouped" : "ranked"} onSelect={(s) => ((window as unknown as { picked: unknown[] }).picked ??= []).push(s)} autoFocus />
          </Seeded>
        </div>
      </div>
    </EmojiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Shot />);
