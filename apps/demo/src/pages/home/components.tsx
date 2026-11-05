import * as React from "react";
import type { MDXComponents } from "mdx/types";
import { Demo } from "@/components/site/demo";
import { AttrTable, H2, H3, PackageManagers, PropsTable, Step, Steps, TabPanel, TabPanels } from "@/components/site/docs";
import { components, slug, type HeadingProps } from "@/components/site/mdx";
import { cn } from "@/lib/utils";

const Subsection = ({ id, children }: HeadingProps) => <H3 id={id ?? slug(children)}>{children}</H3>;

/** An h2 and what follows. Each h3 starts a subsection, after the h2's introduction. */
function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  const nodes = React.Children.toArray(children);
  const starts = nodes.flatMap((node, i) => (React.isValidElement(node) && node.type === Subsection ? [i] : []));
  return (
    <section className={cn("flex flex-col gap-5", className)}>
      {starts.length ? (
        <>
          <div className="flex flex-col gap-3">{nodes.slice(0, starts[0])}</div>
          {starts.map((start, i) => (
            <section key={start} className="flex flex-col gap-4 [&>h3+p]:-mt-1">
              {nodes.slice(start, starts[i + 1])}
            </section>
          ))}
        </>
      ) : (
        nodes
      )}
    </section>
  );
}

/** The home page's MDX: full-size headings, sections, demos and API tables. */
export const homeComponents: MDXComponents = {
  ...components,
  h2: ({ id, children }: HeadingProps) => <H2 id={id ?? slug(children)}>{children}</H2>,
  h3: Subsection,
  h4: ({ children }) => <h4 className="mt-2 text-[13px] font-medium text-muted-foreground">{children}</h4>,
  Section,
  Demo,
  PropsTable,
  AttrTable,
  Steps,
  Step,
  TabPanels,
  TabPanel,
  PackageManagers,
};
