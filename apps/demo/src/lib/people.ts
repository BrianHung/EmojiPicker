// The recurring people in the app scenes, and "You" (the viewer), each with one Bufo from
// the pack as their avatar: all-the-bufo art, loaded from its own host at view time.
const bufo = (file: string) => `https://all-the.bufo.zone/${file}`;

const AVATARS: Record<string, string> = {
  Bufo: bufo("bufo-wave.gif"),
  Maya: bufo("bufo-tada.png"),
  Jordan: bufo("bufo-offers-coffee.png"),
  Sam: bufo("bufo-nerd.png"),
  Priya: bufo("bufo-chefkiss.png"),
  You: bufo("bufo-cowboy.png"),
};

/** A person's avatar by first name: "Maya Lin" is Maya. */
export const avatarFor = (name: string): string | undefined => AVATARS[name.split(" ")[0]!];
