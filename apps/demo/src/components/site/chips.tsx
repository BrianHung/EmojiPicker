import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (value: T) => void; label: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList aria-label={label} className="max-w-full flex-wrap">
        {options.map(([v, text]) => (
          <TabsTrigger key={v} value={v}>
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
