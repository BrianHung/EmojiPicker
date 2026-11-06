import { createRoot } from "react-dom/client";
import en from "@brianhung/emoji-picker-core/data/en.json?url";
import { DefaultCategoryIcon, EmojiPicker, EmojiProvider, useCategoryNavigation, useEmojiLabels, useSkinTone, type SkinToneValue } from "@brianhung/emoji-picker-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "@/globals.css";

function SkinToneMenu() {
  const [tone, setTone] = useSkinTone();
  const { skinTones } = useEmojiLabels();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>{skinTones[tone]}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto">
        <DropdownMenuRadioGroup value={tone} onValueChange={(value: SkinToneValue) => setTone(value)}>
          {skinTones.map((name, i) => (
            <DropdownMenuRadioItem key={name} value={i} closeOnClick>
              {name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CategoryTabs() {
  const { categories, activeCategory, jumpToCategory } = useCategoryNavigation();
  const { categoryNavigation } = useEmojiLabels();
  return (
    <Tabs value={activeCategory} onValueChange={(id: string) => jumpToCategory(id)}>
      <TabsList aria-label={categoryNavigation} className="w-full">
        {categories.map((c) => (
          <TabsTrigger key={c.id} value={c.id} aria-label={c.name}>
            {c.icon ?? <DefaultCategoryIcon category={c.id} className="size-4" />}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

if (localStorage.getItem("demo:theme") === "dark") document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
    <h1 className="text-lg font-semibold">Swapped parts</h1>
    <EmojiProvider data={en}>
      <EmojiPicker.Root defaultCollapsedCategories={["flags"]} className="flex h-[420px] flex-col gap-2 rounded-xl border border-border bg-popover p-2 text-popover-foreground [--emoji-size:24px]">
        <div className="flex items-center gap-2">
          <EmojiPicker.Search className="flex-1">
            <EmojiPicker.Search.Input className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none" />
          </EmojiPicker.Search>
          <SkinToneMenu />
        </div>
        <CategoryTabs />
        <EmojiPicker.Viewport className="relative flex-1">
          <EmojiPicker.List renderEmptyState={({ status }) => (status === "empty" ? "No emoji found." : null)} />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </EmojiProvider>
  </main>,
);
