import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };

const icon = (paths: React.ReactNode) =>
  function Icon({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
        {paths}
      </svg>
    );
  };

const Utensils = icon(
  <>
    <path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 21V3c-2 1.5-3 4-3 7v3h3" />
  </>,
);
export const Plus = icon(<path d="M12 5v14M5 12h14" />);
const Clock = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const Smile = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01" />
  </>,
);
const Paw = icon(
  <>
    <circle cx="11" cy="4" r="2" />
    <circle cx="18" cy="8" r="2" />
    <circle cx="20" cy="16" r="2" />
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
  </>,
);
const Leaf = icon(
  <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </>,
);
const Apple = icon(
  <>
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
    <path d="M10 2c1 .5 2 2 2 5" />
  </>,
);
const Carrot = icon(
  <>
    <path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46" />
    <path d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z" />
    <path d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z" />
  </>,
);
const Ball = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6c3 3 3.5 9.3 0 12.8M18.4 5.6c-3 3-3.5 9.3 0 12.8M3 12h18" />
  </>,
);
const Car = icon(
  <>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </>,
);
const Plane = icon(
  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
);
const Bulb = icon(
  <>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6M10 22h4" />
  </>,
);
const Heart = icon(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />);
const CheckCircle = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>,
);
const Symbols = icon(
  <>
    <path d="M5 4h6M8 4v6" />
    <path d="M14 14l6 6M20 14l-6 6" />
    <circle cx="17" cy="7" r="3" />
    <path d="M4 20l6-6M4 14h.01M10 20h.01" />
  </>,
);
const Flag = icon(
  <>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </>,
);
export const Grid = icon(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>,
);
export const Burger = icon(
  <>
    <path d="M4 10.5a8 6 0 0 1 16 0Z" />
    <path d="M3.5 14h17" />
    <path d="M4.5 17.5h15a0 0 0 0 1 0 0 2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
    <path d="M9 7.5h.01M12 6.5h.01M15 7.5h.01" />
  </>,
);
const Football = icon(
  <>
    <ellipse cx="12" cy="12" rx="10" ry="6.5" transform="rotate(-45 12 12)" />
    <path d="m9.5 14.5 5-5M10.5 11.5l2 2M12 10l2 2M7 17l-2.2-2.2M17 7l2.2 2.2" />
  </>,
);
const Peace = icon(
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 2.5v19M12 12l-6.7 6.7M12 12l6.7 6.7" />
  </>,
);
/** Slack's tab: a sticker square with a smile. */
export const Sticker = icon(
  <>
    <path d="M15.5 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h7l8-8V6a3 3 0 0 0-3-3Z" />
    <path d="M13 21v-3.5a4 4 0 0 1 4-4H21M8.5 14s1.2 1.5 3 1.5M9 9h.01M15 9h.01" />
  </>,
);
/** iOS keyboard: dog face (Animals & Nature). */
export const DogFace = icon(
  <>
    <path d="M7.5 6.5 4 4.5c-1 1.5-1.5 4 0 6.5" />
    <path d="M16.5 6.5 20 4.5c1 1.5 1.5 4 0 6.5" />
    <path d="M6 9.5C6 6.5 8.5 5 12 5s6 1.5 6 4.5v3.5a6 6 0 0 1-12 0Z" />
    <path d="M10 12h.01M14 12h.01M10.5 15.5c.8.7 2.2.7 3 0M12 14.2v1.3" />
  </>,
);
export const Search = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const Shuffle = icon(
  <>
    <path d="m18 14 4 4-4 4M18 2l4 4-4 4" />
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M2 6h1.4c1.3 0 2.5.6 3.3 1.7l.6.8M22 18h-6c-1.3 0-2.5-.6-3.3-1.7l-.6-.8" />
  </>,
);
export const SmilePlus = icon(
  <>
    <path d="M21 12a9 9 0 1 1-9-9" />
    <path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01M19 2v6M16 5h6" />
  </>,
);
export const ChevronDown = icon(<path d="m6 9 6 6 6-6" />);

export function PlusCircleFilled({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 7.5v9M7.5 12h9" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export type IconSet = Partial<Record<string, React.ComponentType<IconProps>>>;

/** Category id → icon, per product. Category ids: suggested, custom, smileys_people, animals_nature, food_drink, travel_places, activities, objects, symbols, flags. */
export const ICONS = {
  apple: { suggested: Clock, smileys_people: Smile, animals_nature: Paw, food_drink: Apple, activities: Ball, travel_places: Car, objects: Bulb, symbols: Heart, flags: Flag, custom: Grid },
  notion: { suggested: Clock, smileys_people: Smile, animals_nature: Leaf, food_drink: Carrot, activities: Ball, travel_places: Plane, objects: Bulb, symbols: CheckCircle, flags: Flag, custom: Grid },
  slack: { suggested: Clock, smileys_people: Smile, animals_nature: Leaf, food_drink: Burger, activities: Football, travel_places: Plane, objects: Bulb, symbols: Peace, flags: Flag, custom: Grid },
  instagram: { suggested: Clock, smileys_people: Smile, animals_nature: Paw, food_drink: Utensils, activities: Ball, travel_places: Car, objects: Bulb, symbols: Symbols, flags: Flag, custom: Grid },
} satisfies Record<string, IconSet>;
