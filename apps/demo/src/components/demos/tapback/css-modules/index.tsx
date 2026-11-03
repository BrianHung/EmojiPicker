import { EmojiPicker, Tapback, type EmojiSelection } from "@brianhung/emoji-picker";
import type * as React from "react";
import styles from "./index.module.css";

function ExpandButton({ children: _, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <Tapback onSelect={onSelect} components={{ ExpandButton }} className={styles.root} reactionsClassName={styles.reactions}>
      <EmojiPicker.Search className={styles.search} inputProps={{ className: styles.input }} />
      <EmojiPicker.Viewport className={styles.viewport}>
        <EmojiPicker.List cellClassName={styles.cell} headerClassName={styles.header} />
      </EmojiPicker.Viewport>
    </Tapback>
  );
}
