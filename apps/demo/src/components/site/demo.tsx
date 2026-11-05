import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker";
import { Chips } from "./chips";
import { CodeTabs, Preview, codeTabsOf, type CodeTab } from "./docs";
import { usePickedEmoji } from "./picked";

type Module = Record<string, React.ComponentType<{ onSelect: (selection: EmojiSelection) => void }>>;
type Adapter = "floating-ui" | "react-aria";

const DEMOS = "../demos/";
const TAILWIND = "tailwind.tsx";
const CSS_MODULES = "css-modules/index.tsx";

const modules: Record<Adapter, Record<string, Module>> = {
  "floating-ui": import.meta.glob("../demos/*/{tailwind.tsx,css-modules/index.tsx}", { eager: true }),
  // vite.config.ts: under `?react-aria`, a demo's Floating UI EmojiPopover is React Aria's.
  "react-aria": import.meta.glob("../demos/popover/{tailwind.tsx,css-modules/index.tsx}", { eager: true, query: "?react-aria" }),
};
const sources = import.meta.glob<string>("../demos/*/{tailwind.tsx,css-modules/index.*}", { eager: true, query: "?raw", import: "default" });

/** A demo's code tabs, Tailwind and CSS Modules (Base UI's), each with the file it renders. */
function variants(name: string): [CodeTab, string][] {
  const source = (file: string) => sources[`${DEMOS}${name}/${file}`];
  const tailwind = source(TAILWIND)!;
  const modulesTsx = source(CSS_MODULES);
  if (!modulesTsx) return [[{ label: "index.tsx", code: tailwind }, TAILWIND]];
  return [
    [{ label: "Tailwind", file: "index.tsx", code: tailwind }, TAILWIND],
    [
      {
        label: "CSS Modules",
        files: [
          { name: "index.tsx", code: modulesTsx },
          { name: "index.module.css", code: source("css-modules/index.module.css")!, lang: "css" },
        ],
      },
      CSS_MODULES,
    ],
  ];
}

/**
 * shadcn's ComponentPreview: `demos/<name>/` rendered live over its own source. The preview shows
 * the variant whose tab is selected; fenced code inside adds tabs. `adapters` switches the
 * demo's EmojiPopover between Floating UI and React Aria.
 */
export function Demo({ name, className, adapters, children }: { name: string; className?: string; adapters?: boolean; children?: React.ReactNode }) {
  const [, onSelect] = usePickedEmoji();
  const [adapter, setAdapter] = React.useState<Adapter>("floating-ui");
  const files = variants(name);
  const tabs = [...files.map(([tab]) => tab), ...codeTabsOf(children)];
  const [tab, setTab] = React.useState(tabs[0]!.label);
  const file = (files.find(([t]) => t.label === tab) ?? files[0]!)[1];
  const Component = Object.values(modules[adapter][`${DEMOS}${name}/${file}`]!)[0]!;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Preview className={className}>
          {adapters ? (
            <div className="absolute top-3 right-3">
              <Chips label="Popover" value={adapter} onChange={setAdapter} options={[["floating-ui", "Floating UI"], ["react-aria", "React Aria"]]} />
            </div>
          ) : null}
          <Component onSelect={onSelect} />
        </Preview>
      </div>
      <CodeTabs tabs={tabs} collapse={14} value={tab} onChange={setTab} />
    </div>
  );
}
