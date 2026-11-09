import * as React from "react";
import type { MDXComponents } from "mdx/types";
import parts from "virtual:api-reference";
import { cn } from "@/lib/utils";
import { Demo } from "@/components/site/demo";
import { AttrTable, DefList, H2, H3, PackageManagers, type PropRow, PropsTable, Step, Steps, TabPanel, TabPanels } from "@/components/site/docs";
import { components, slug, type HeadingProps } from "@/components/site/mdx";

const Subsection = ({ id, children }: HeadingProps) => <H3 id={id ?? slug(children)}>{children}</H3>;

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

// One part's API: its props, then its own data attributes and CSS variables
function PartApi({ part, props }: { part: string; props?: PropRow[] }) {
  const reference = parts[part];
  if (!reference && !props) throw new Error(`No API reference for ${part}`);
  return (
    <>
      {props?.length ? <PropsTable rows={props} /> : null}
      {reference?.attributes.length ? <AttrTable type head={["Data attribute", "Type", "Description"]} rows={reference.attributes} /> : null}
      {reference?.variables.length ? <AttrTable head={["CSS variable", "Default", "Description"]} rows={reference.variables} /> : null}
    </>
  );
}

export const homeComponents: MDXComponents = {
  ...components,
  h2: ({ id, children }: HeadingProps) => <H2 id={id ?? slug(children)}>{children}</H2>,
  h3: Subsection,
  h4: ({ children }) => <h4 className="mt-2 text-[13px] font-medium text-muted-foreground">{children}</h4>,
  Section,
  Demo,
  PartApi,
  PropsTable,
  AttrTable,
  DefList,
  Steps,
  Step,
  TabPanels,
  TabPanel,
  PackageManagers,
};
