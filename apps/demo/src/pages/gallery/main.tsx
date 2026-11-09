import { createRoot } from "react-dom/client";
import enUrl from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider } from "emoji-components";
import { SiteShell, useRenderer } from "@/components/site/shell";
import { GalleryPage } from "./gallery";
import "@/globals.css";

function Gallery() {
  const renderer = useRenderer();
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Gallery</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Pickers, popovers, reaction rows, and shortcode typeahead in the style of each app. The code imports this site's style modules, so use it as a reference. To copy a component, start from the registry on the home page.
        </p>
      </div>
      <EmojiProvider data={enUrl} renderer={renderer}>
        <GalleryPage />
      </EmojiProvider>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <SiteShell page="gallery" width="wide">
    <Gallery />
  </SiteShell>,
);
