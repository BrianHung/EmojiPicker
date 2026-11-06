import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { useListBoxSection } from "react-aria/useListBox";
import type { EmojiItem, EmojiSection } from "@brianhung/emoji-picker-core";
import { flag, renderElement, resolve, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { Cell } from "./cell";
import { ItemContext, SectionContext, TemplateContext, useCells, useSection } from "./contexts";
import { VirtualBranch } from "./virtualizer";

export type SectionState = { section: EmojiSection; collapsed: boolean };

export type SectionProps = Omit<PartElementProps<SectionState, HTMLElement>, "children"> & {
  children?: React.ReactNode;
};

export type SectionTitleProps = PartElementProps<SectionState, HTMLElement>;

export type ItemsProps = {
  children?: (emoji: EmojiItem) => React.ReactNode;
};

export type SectionActionsState = SectionState & {
  toggle: () => void;
  toggleProps: { "aria-expanded": boolean };
};

export type SectionActionsProps = PartElementProps<SectionActionsState>;

// Markers: List reads their props, and renders the items and the actions itself
export function Items(_: ItemsProps): null {
  return null;
}

export function SectionActions(_: SectionActionsProps): null {
  return null;
}

type Parts = { title?: React.ReactElement; items?: React.ReactElement<ItemsProps>; actions?: React.ReactElement<SectionActionsProps> };
const PartsContext = React.createContext<Parts>({});

const isElement = <P,>(child: React.ReactNode, type: React.JSXElementConstructor<P>): child is React.ReactElement<P> => React.isValidElement(child) && child.type === type;

function collectParts(children: React.ReactNode): Parts {
  const parts: Parts = {};
  React.Children.forEach(children, (child) => {
    if (isElement(child, SectionTitle)) parts.title = child;
    else if (isElement(child, Items)) parts.items = child;
    else if (isElement(child, SectionActions)) parts.actions = child;
  });
  return parts;
}

export const partsOf = (node: React.ReactNode): Parts => (isElement(node, Section) ? collectParts(node.props.children) : {});

export const defaultSection = () => (
  <Section>
    <SectionTitle />
    <Items />
  </Section>
);

export function SectionView({ section }: { section: EmojiSection }) {
  const template = React.useContext(TemplateContext);
  const { headingProps, groupProps } = useListBoxSection({ heading: section.header ? section.name : undefined, "aria-label": section.header ? undefined : section.name });
  const value = React.useMemo(() => ({ section, groupProps, headingProps }), [section, groupProps, headingProps]);
  return <SectionContext.Provider value={value}>{template(section)}</SectionContext.Provider>;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(function Section({ children, style, ...props }, ref) {
  const cells = useCells("Section");
  const { section, groupProps } = useSection("Section");
  const parts = collectParts(children);
  return (
    <PartsContext.Provider value={parts}>
      {renderElement(
        "section",
        {
          ...groupProps,
          id: cells.sectionDomId(section.id),
          "data-slot": SLOTS.section,
          "data-category": section.category,
          "data-collapsed": flag(section.collapsed),
          ...props,
          style: (s: SectionState) => ({ height: "100%", ...resolve(style, s) }),
          ref,
          children: <VirtualBranch parent={section.id} />,
        },
        { section, collapsed: section.collapsed },
      )}
    </PartsContext.Provider>
  );
});

export const SectionTitle = React.forwardRef<HTMLElement, SectionTitleProps>(function SectionTitle({ children, style, ...props }, ref) {
  const { section, headingProps } = useSection("SectionTitle");
  const { headers } = useCells("SectionTitle");
  const element = React.useRef<HTMLElement | null>(null);
  const register = React.useCallback(
    (el: HTMLElement | null) => {
      if (element.current) headers.delete(element.current);
      element.current = el;
      if (el) headers.add(el);
    },
    [headers],
  );
  const refs = React.useMemo(() => mergeRefs<HTMLElement>(register, ref), [register, ref]);
  return renderElement(
    "header",
    {
      ...headingProps,
      "data-slot": SLOTS.sectionTitle,
      "data-collapsed": flag(section.collapsed),
      ...props,
      style: (s: SectionState) => ({ height: "var(--ep-header)", ...resolve(style, s) }),
      ref: refs,
      children: children ?? section.name,
    },
    { section, collapsed: section.collapsed },
  );
});

export function SectionHeader() {
  const { title } = React.useContext(PartsContext);
  return title ?? <SectionTitle />;
}

export function ItemView({ item }: { item: EmojiItem }) {
  const template = React.useContext(PartsContext).items?.props.children;
  return <ItemContext.Provider value={item}>{template ? template(item) : <Cell />}</ItemContext.Provider>;
}
