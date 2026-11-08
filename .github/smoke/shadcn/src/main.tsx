import { createRoot } from "react-dom/client";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import "./index.css";

createRoot(document.getElementById("root")!).render(<EmojiPickerCard onSelect={(selection) => console.log(selection.emoji)} />);
