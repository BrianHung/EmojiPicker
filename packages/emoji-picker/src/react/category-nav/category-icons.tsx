import type * as React from "react";

const dot = (cx: number, cy: number) => <circle cx={cx} cy={cy} r={1.1} fill="currentColor" stroke="none" />;

const ICONS: Record<string, React.ReactNode> = {
  suggested: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  smileys_people: (
    <>
      <circle cx={12} cy={12} r={9} />
      {dot(9, 10)}
      {dot(15, 10)}
      <path d="M8.5 14.3a4.6 4.6 0 0 0 7 0" />
    </>
  ),
  animals_nature: (
    <>
      <path d="M7.6 9.6c0-2.6 2-4.4 4.4-4.4s4.4 1.8 4.4 4.4v3.4c0 3-2 5.3-4.4 5.3s-4.4-2.3-4.4-5.3z" />
      <path d="M8.3 6.3C6 5.5 4.1 6.6 3.8 9.1c-.3 2.3.7 4.5 2.6 5.1.9-.9 1.3-2.4 1.3-3.8M15.7 6.3c2.3-.8 4.2.3 4.5 2.8.3 2.3-.7 4.5-2.6 5.1-.9-.9-1.3-2.4-1.3-3.8" />
      {dot(10.3, 10.6)}
      {dot(13.7, 10.6)}
      <path d="M11 13.4h2l-1 1.1z" fill="currentColor" />
      <path d="M10.4 15.6c.9.6 2.3.6 3.2 0" />
    </>
  ),
  food_drink: (
    <>
      <path d="M12 8c-1.2-.9-2.4-1.2-3.6-1.1C6 7.1 4.8 9.1 4.8 11.7c0 4 2.6 8.3 4.9 8.3 1 0 1.4-.5 2.3-.5s1.3.5 2.3.5c2.3 0 4.9-4.3 4.9-8.3 0-2.6-1.2-4.6-3.6-4.8-1.2-.1-2.4.2-3.6 1.1z" />
      <path d="M12 8c0-1.6.6-2.9 1.8-3.9" />
    </>
  ),
  activities: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="m12 9.2 2.7 1.9-1 3.2h-3.4l-1-3.2z" fill="currentColor" />
      <path d="M12 9.2V6l-5.3-1.3M12 6l5.3-1.3M14.7 11.1l3-1-.4-5.4M17.7 10.1l2.9 4.7M13.7 14.3l1.8 2.5 5.1-2M15.5 16.8 12 21M10.3 14.3l-1.8 2.5L12 21M8.5 16.8l-5.1-2M9.3 11.1l-3-1 .4-5.4M6.3 10.1l-2.9 4.7" />
    </>
  ),
  travel_places: (
    <>
      <path d="M5.6 16.6H4.5a1 1 0 0 1-1-1v-2.9c0-.9.6-1.6 1.4-1.8l1.6-.4 1.7-3a2.2 2.2 0 0 1 1.9-1.1h3.8a2.2 2.2 0 0 1 1.9 1.1l1.7 3 1.6.4c.8.2 1.4.9 1.4 1.8v2.9a1 1 0 0 1-1 1h-1.1M9.4 16.6h5.2M6.6 10.5h10.8" />
      <circle cx={7.5} cy={16.6} r={1.9} />
      <circle cx={16.5} cy={16.6} r={1.9} />
    </>
  ),
  objects: (
    <>
      <path d="M9 17v-1.2c0-.9-.4-1.7-1-2.4a5.5 5.5 0 1 1 8 0c-.6.7-1 1.5-1 2.4V17z" />
      <path d="M9.6 19.3h4.8M10.6 21.3h2.8" />
    </>
  ),
  symbols: <path d="M12 19.6s-7.5-4.4-7.5-9.7A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.5 2.2c0 5.3-7.5 9.7-7.5 9.7z" />,
  flags: <path d="M5.5 21V4.6m0 0c2.8-1.3 5.2-1.3 7.2 0s4.4 1.3 7.2 0v8.6c-2.8 1.3-5.2 1.3-7.2 0s-4.4-1.3-7.2 0" />,
  custom: (
    <>
      <rect x={4} y={4} width={16} height={16} rx={4.5} />
      {dot(9.5, 10.5)}
      {dot(14.5, 10.5)}
      <path d="M9 14.4c1.7 1.4 4.3 1.4 6 0" />
    </>
  ),
};

/** The built-in glyph for a category, filling its tab. */
export function DefaultCategoryIcon({ category }: { category: string }) {
  return (
    <svg
      data-default-icon=""
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      {ICONS[category] ?? ICONS.smileys_people}
    </svg>
  );
}
