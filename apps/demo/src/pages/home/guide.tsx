// Installation and Anatomy.
import * as React from "react";
import registrySource from "@/registry/emoji-picker.tsx?raw";
import { Code } from "@/components/site/code";
import { C, CodeTabs, H2, P, Step, Steps, Tabs } from "@/components/site/docs";

export const REGISTRY_URL = "https://emojis.brianhung.me/r/emoji-picker.json";

const pm = (cmd: { npm: string; pnpm: string; yarn: string; bun: string }) => [
  { label: "pnpm", code: cmd.pnpm, lang: "bash" as const },
  { label: "npm", code: cmd.npm, lang: "bash" as const },
  { label: "yarn", code: cmd.yarn, lang: "bash" as const },
  { label: "bun", code: cmd.bun, lang: "bash" as const },
];

const PROVIDER = `import { EmojiProvider } from "@brianhung/emoji-picker";
import en from "@brianhung/emoji-picker/data/en.json?url";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider data={en}>{children}</EmojiProvider>;
}`;

const USAGE = `import { EmojiPickerPopover } from "@/components/ui/emoji-picker";

<EmojiPickerPopover onSelect={(e) => react(message.id, e.unified)}>
  🙂 Add reaction
</EmojiPickerPopover>`;

const CSS = `@import "tailwindcss";
@import "@brianhung/emoji-picker/tokens.css";
@import "@brianhung/emoji-picker/theme.css";`;

const SHADCN_CSS = `@import "@brianhung/emoji-picker/tokens.css";
@import "@brianhung/emoji-picker/shadcn.css";`;

export function Installation() {
  const [mode, setMode] = React.useState<"cli" | "manual">("cli");
  return (
    <section className="flex flex-col gap-5">
      <H2 id="installation">Installation</H2>
      <Tabs
        label="Installation"
        value={mode}
        onChange={setMode}
        items={[
          { value: "cli", label: "CLI" },
          { value: "manual", label: "Manual" },
        ]}
      />
      {mode === "cli" ? (
        <Steps>
          <Step title="Run the following command.">
            <CodeTabs
              tabs={pm({
                pnpm: `pnpm dlx shadcn@latest add ${REGISTRY_URL}`,
                npm: `npx shadcn@latest add ${REGISTRY_URL}`,
                yarn: `yarn dlx shadcn@latest add ${REGISTRY_URL}`,
                bun: `bunx --bun shadcn@latest add ${REGISTRY_URL}`,
              })}
              defaultTab="npm"
            />
            <P>
              Adds <C>components/ui/emoji-picker.tsx</C> and installs <C>@brianhung/emoji-picker</C>.
            </P>
          </Step>
          <Step title="Add the provider.">
            <Code title="app/providers.tsx">{PROVIDER}</Code>
          </Step>
          <Step title="Use the component.">
            <Code title="message.tsx">{USAGE}</Code>
          </Step>
        </Steps>
      ) : (
        <Steps>
          <Step title="Install the following dependency.">
            <CodeTabs
              tabs={pm({ pnpm: "pnpm add @brianhung/emoji-picker", npm: "npm install @brianhung/emoji-picker", yarn: "yarn add @brianhung/emoji-picker", bun: "bun add @brianhung/emoji-picker" })}
              defaultTab="npm"
            />
          </Step>
          <Step title="Import the color tokens and Tailwind utilities.">
            <Code title="app/globals.css" lang="css">{CSS}</Code>
          </Step>
          <Step title="Optional: map the tokens to your shadcn/ui theme.">
            <Code title="app/globals.css" lang="css">{SHADCN_CSS}</Code>
          </Step>
          <Step title="Copy and paste the following code into your project.">
            <CodeTabs tabs={[{ label: "emoji-picker.tsx", file: "components/ui/emoji-picker.tsx", code: registrySource }]} collapse={10} />
          </Step>
          <Step title="Add the provider.">
            <Code title="app/providers.tsx">{PROVIDER}</Code>
          </Step>
        </Steps>
      )}
    </section>
  );
}

const ANATOMY = `import { EmojiProvider, EmojiPicker, EmojiPopover, Tapback, Emoji } from "@brianhung/emoji-picker";

<EmojiProvider data={en}>
  <EmojiPicker.Root>
    <EmojiPicker.CategoryNav />
    <EmojiPicker.Search>
      <EmojiPicker.SkinTone />
    </EmojiPicker.Search>
    <EmojiPicker.Viewport>
      <EmojiPicker.List />
      <EmojiPicker.Empty />
      <EmojiPicker.Loading />
      <EmojiPicker.LoadError />
    </EmojiPicker.Viewport>
    <EmojiPicker.Preview />
  </EmojiPicker.Root>

  <EmojiPopover.Root>
    <EmojiPopover.Trigger />
    <EmojiPopover.Content>
      <EmojiPicker.Root>…</EmojiPicker.Root>
    </EmojiPopover.Content>
  </EmojiPopover.Root>

  <Tapback>
    <EmojiPicker.Search />
    <EmojiPicker.Viewport>
      <EmojiPicker.List />
    </EmojiPicker.Viewport>
  </Tapback>

  <Emoji unified="1f44d-1f3fd" />
</EmojiProvider>`;

export function Anatomy() {
  return (
    <section className="flex flex-col gap-5">
      <H2 id="anatomy">Anatomy</H2>
      <P>Import the parts and assemble them.</P>
      <Code title="anatomy.tsx">{ANATOMY}</Code>
    </section>
  );
}
