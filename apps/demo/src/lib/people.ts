const bufo = (file: string) => `https://all-the.bufo.zone/${file}`;

const AVATARS: Record<string, string> = {
  Bufo: bufo("bufo-wave.gif"),
  Maya: bufo("bufo-tada.png"),
  Jordan: bufo("bufo-offers-coffee.png"),
  Sam: bufo("bufo-nerd.png"),
  Priya: bufo("bufo-chefkiss.png"),
  You: bufo("bufo-cowboy.png"),
};

export const avatarFor = (name: string): string | undefined => AVATARS[name.split(" ")[0]!];
