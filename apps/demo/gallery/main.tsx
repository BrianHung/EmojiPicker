import { createRoot } from "react-dom/client";
import enUrl from "@brianhung/emoji-picker/data/en.json?url";
import { EmojiProvider } from "@brianhung/emoji-picker";
import { SiteFooter, SiteShell, useRenderer } from "../components/site";
import { TEAM_EMOJI } from "../lib/custom-emoji";
import { GalleryPage } from "../sections/gallery";
import "../styles.css";

function Gallery() {
  const renderer = useRenderer();
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Gallery</h1>
        <p className="max-w-2xl text-base text-muted-foreground">Pickers, popovers, tapbacks and autocomplete in the style of each app.</p>
      </div>
      <EmojiProvider key={renderer} data={enUrl} renderer={renderer} customEmojis={TEAM_EMOJI}>
        <GalleryPage />
      </EmojiProvider>
      <SiteFooter />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="gallery" width="wide">
    <Gallery />
  </SiteShell>,
);
