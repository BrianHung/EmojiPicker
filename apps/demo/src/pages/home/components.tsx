import * as React from "react";
import type { MDXComponents } from "mdx/types";
import parts from "virtual:api-reference";
import { cn } from "@/lib/utils";
import { Demo } from "@/components/site/demo";
import { AttrTable, DefList, H2, H3, H4, PackageManagers, type PropRow, PropsTable, Step, Steps, TabPanel, TabPanels } from "@/components/site/docs";
import { components, slug, type HeadingProps } from "@/components/site/mdx";

const Subsection = ({ id, children }: HeadingProps) => <H3 id={id ?? slug(children)}>{children}</H3>;
const Part = ({ id, children }: HeadingProps) => <H4 id={id ?? slug(children)}>{children}</H4>;

// Each heading and what follows it, up to the next one
function chunks(nodes: React.ReactNode[], heading: React.ElementType) {
  const starts = nodes.flatMap((node, i) => (React.isValidElement(node) && node.type === heading ? [i] : []));
  return { intro: starts.length ? nodes.slice(0, starts[0]) : nodes, chunks: starts.map((start, i) => ({ key: start, nodes: nodes.slice(start, starts[i + 1]) })) };
}

function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  const groups = chunks(React.Children.toArray(children), Subsection);
  return (
    <section className={cn("flex flex-col gap-5", className)}>
      {groups.chunks.length ? (
        <>
          <div className="flex flex-col gap-3">{groups.intro}</div>
          {groups.chunks.map((group) => {
            const members = chunks(group.nodes, Part);
            return (
              <section key={group.key} className="flex flex-col gap-4 [&>h3+p]:-mt-1">
                {members.intro}
                {members.chunks.map((part) => (
                  <section key={part.key} className="flex flex-col gap-4 pt-4 [&>h4+p]:-mt-1">
                    {part.nodes}
                  </section>
                ))}
              </section>
            );
          })}
        </>
      ) : (
        groups.intro
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
  h4: Part,
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
