// One example picker, alone, for side-by-side captures: /shot.html?skin=slack&theme=dark&search=1
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MotionGlobalConfig } from "motion/react";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider, useEmojiStore } from "@brianhung/emoji-picker";
import { SkinPicker, skinById } from "../examples";
import { IMessageDemo, IMessageScreen, type IMessageMode, type Message } from "../sections/imessage";
import { GROK_COLUMNS, GrokEmojiMenu, grokSearch } from "../examples/grok";
import { useAutocompleteInput } from "../components/emoji-autocomplete";
import { SCENES } from "../styles";
import { TEAM_EMOJI } from "../lib/custom-emoji";
import "../styles.css";

// Captures compare final frames: no animation (?anim=1 keeps them, for flow recordings).
MotionGlobalConfig.skipAnimations = new URLSearchParams(location.search).get("anim") !== "1";

const params = new URLSearchParams(location.search);
const skin = skinById(params.get("skin") ?? "apple");
const view = params.get("view");
const imessageMode = (params.get("mode") ?? "tapback") as IMessageMode;

// The conversation in the iOS reference screenshots.
const GOOGLE: Message[] = [
  { id: 1, from: "them", text: "G-028350 is your Google verification code. Don't share your code with anyone.", reactions: [], time: "Text Message • RCS\nSat, Aug 15 at 11:16 PM" },
  { id: 2, from: "them", text: "G-111678 is your Google verification code. Don't share your code with anyone.", reactions: [], time: "Thu, Sep 17 at 1:37 AM" },
  { id: 3, from: "them", text: "G-802555 is your Google verification code. Don't share your code with anyone.", reactions: [], time: "Friday 2:16 PM" },
  { id: 4, from: "them", text: "G-387495 is your Google verification code. Don't share your code with anyone.", reactions: [], time: "Today 4:30 PM" },
];
const GoogleG = (
  <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden>
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.5 6.6-16.1Z" />
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7A22 22 0 0 0 24 46Z" />
    <path fill="#FBBC05" d="M11.7 28.1a13.2 13.2 0 0 1 0-8.4V14H4.3a22 22 0 0 0 0 19.8l7.4-5.7Z" />
    <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A22 22 0 0 0 4.3 14l7.4 5.7c1.7-5.2 6.6-8.9 12.3-8.9Z" />
  </svg>
);
const dark = params.get("theme") === "dark";
document.documentElement.classList.toggle("dark", dark);
document.body.style.background = params.get("bg") ?? (dark ? "#1a1d21" : "#ffffff");

// Fixtures: the frequents each reference capture showed, most used first, so the
// "Frequently used" rows compare like for like. Test-only; the examples don't use them.
const SEEDS: Record<string, string[]> = {
  // Recents from the iOS screenshots: the tapback row's (😂, ❤️) and the keyboard grid, row by row.
  "imessage-tapback": ["1f602", "2764-fe0f"],
  "imessage-emoji": [
    "1f9e0", "1f47b", "1f440", "1f6ac", "1f9ad", "1fac3", "1f37a", "1f43c",
    "1f914", "1f633", "1f629", "1f480", "1f62f", "1f62d", "1fae1", "1f42d",
    "1f479", "1f644", "1f937-200d-2642-fe0f", "1f60e", "1f64f", "2764-fe0f", "270a", "1f62b",
    "1f937", "1f602", "2b50", "1f978", "1f44f", "1f441-fe0f", "1f44d", "1f647",
  ],
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
    const seed = SEEDS[view === "imessage27" ? "imessage27" : view === "imessage" ? `imessage-${imessageMode}` : skin.id] ?? [];
    seed.forEach((u, i) => {
      for (let n = 0; n < seed.length - i; n++) store.frequents.record(u);
    });
    setReady(true);
  }, [store]);
  return ready ? children : null;
}

/** Grok Bot's composer with ":smi" typed, as in the reference capture. */
function GrokShot() {
  const { autocomplete, inputProps, setText } = useAutocompleteInput<HTMLInputElement>({ limit: 30, columns: GROK_COLUMNS, matchBy: "search" });
  React.useEffect(() => setText(params.get("q") ?? ":smi"), [setText]);
  return (
    <div style={{ padding: 24, background: "#141414", display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <div data-shot="grok" style={{ display: "inline-block", minHeight: 184 }}>
        <GrokEmojiMenu autocomplete={autocomplete} />
      </div>
      <input {...inputProps} aria-label="Message" onKeyDown={(e) => autocomplete.onKeyDown(e)} style={{ width: 294, height: 40, borderRadius: 20, background: "#1f1f1f", color: "#f5f5f5", border: 0, padding: "0 16px", outline: "none" }} />
    </div>
  );
}

function Shot() {
  if (view === "scene") {
    // One in-situ scene (styles/<id>/scene.tsx): /shot.html?view=scene&skin=discord[&width=375]
    const entry = SCENES[params.get("skin") ?? "discord"];
    const Scene = entry?.Scene;
    document.body.style.margin = "0";
    return (
      <EmojiProvider data={enUrl} renderer="native" customEmojis={TEAM_EMOJI}>
        <div style={{ padding: 24, boxSizing: "border-box", width: params.get("width") ? Number(params.get("width")) : undefined }}>
          <div data-shot="scene">{Scene ? <Scene /> : `No scene "${params.get("skin")}"`}</div>
        </div>
      </EmojiProvider>
    );
  }
  if (view === "grok") {
    document.body.style.background = "#141414";
    return (
      <EmojiProvider data={enUrl} renderer="native" search={grokSearch}>
        <GrokShot />
      </EmojiProvider>
    );
  }
  if (view === "imessage27") {
    // The iOS 27.2 captures (ref/imessage27-*.png): one "Hi" from an unknown number.
    // state = reacted | pill | keyboard.
    const state = params.get("state") ?? "reacted";
    document.body.style.background = "#fff";
    document.body.style.margin = "0";
    const kb: Message[] = [{ id: 1, from: "them", text: "Hi", reactions: state === "reacted" ? ["263a-fe0f"] : [], time: "Today 9:22 PM" }];
    return (
      <EmojiProvider data={enUrl} renderer="native">
        <Seeded>
          <div data-shot="imessage27" style={{ display: "inline-block" }}>
            <IMessageScreen
              messages={kb}
              contact={{ name: "+1 (555) 564-8583", initials: "KB" }}
              initialMode={state === "pill" ? "tapback" : state === "keyboard" ? "emoji" : "idle"}
              time={state === "pill" ? "9:31" : "9:32"}
              notice
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
          <IMessageDemo scale={Number(params.get("scale") ?? 1)} />
        </div>
      </EmojiProvider>
    );
  }
  if (view === "imessage") {
    document.body.style.background = "#fff";
    return (
      <EmojiProvider data={enUrl} renderer="native">
        <Seeded>
          <div data-shot="imessage" style={{ display: "inline-block" }}>
            <IMessageScreen messages={GOOGLE} contact={{ name: "Google", avatar: GoogleG }} initialMode={imessageMode} placeholder="Text Message • RCS" />
          </div>
        </Seeded>
      </EmojiProvider>
    );
  }
  return (
    <EmojiProvider data={enUrl} renderer={skin.renderer ?? "native"}>
      <div style={{ padding: 24, display: "inline-block" }}>
        <div data-shot={skin.id} style={{ display: "inline-block" }}>
          <Seeded>
            <SkinPicker layout={skin.layout} search={params.get("search") !== "0"} searchResults={params.get("results") === "grouped" ? "grouped" : "ranked"} onSelect={(s) => ((window as unknown as { picked: unknown[] }).picked ??= []).push(s)} autoFocus />
          </Seeded>
        </div>
      </div>
    </EmojiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Shot />);
