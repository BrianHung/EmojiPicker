import * as React from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Puts `css` in one <style data-emoji-picker="id"> per document, updated in place. */
export function useStyleSheet(id: string, css: string, nonce?: string) {
  useIsoLayoutEffect(() => {
    let style = document.querySelector<HTMLStyleElement>(`style[data-emoji-picker="${id}"]`);
    if (!style) {
      style = document.createElement("style");
      style.dataset.emojiPicker = id;
      if (nonce) style.nonce = nonce;
      document.head.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }, [id, css, nonce]);
}

/** Windows high contrast drops backgrounds, so a highlighted option needs an outline to stay visible. */
export const useForcedColorsHighlight = () => useStyleSheet("forced-colors", '@media (forced-colors:active){[role="option"][data-highlighted]{outline:2px solid Highlight;outline-offset:-2px}}');
