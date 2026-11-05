import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { OgVideo } from "./og-video";
import "@/globals.css";

function Frame() {
  const [t, setT] = useState(0);
  useEffect(() => {
    Object.assign(window, { setOgTime: (s: number) => flushSync(() => setT(s)) });
  }, []);
  return <OgVideo t={t} />;
}

createRoot(document.getElementById("root")!).render(<Frame />);
