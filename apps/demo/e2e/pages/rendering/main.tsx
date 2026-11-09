import { createRoot } from "react-dom/client";
import { RenderingPicker } from "./picker";
import "@/globals.css";

createRoot(document.getElementById("root")!).render(
  <main className="flex flex-col gap-4 p-6">
    <RenderingPicker onSelect={() => {}} />
  </main>,
);
