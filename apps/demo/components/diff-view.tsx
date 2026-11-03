// Loaded on demand (React.lazy): @pierre/diffs brings its own highlighter.
import { MultiFileDiff } from "@pierre/diffs/react";

export default function DiffView({ oldFile, newFile, dark }: { oldFile: { name: string; contents: string }; newFile: { name: string; contents: string }; dark: boolean }) {
  return (
    <MultiFileDiff
      oldFile={oldFile}
      newFile={newFile}
      className="block text-[12.5px]"
      options={{ diffStyle: "unified", themeType: dark ? "dark" : "light", theme: { light: "pierre-light", dark: "pierre-dark" }, overflow: "scroll", disableBackground: false, disableFileHeader: true }}
    />
  );
}
