const BUFO = "https://all-the.bufo.zone/";

// The first frame of a GIF, cut at the block level without decoding, so reduced motion has a still image
export function firstFrame(gif: Uint8Array): Uint8Array {
  const skipSubBlocks = (i: number) => {
    while (i < gif.length && gif[i] !== 0) i += gif[i]! + 1;
    return i + 1;
  };
  const table = (flags: number) => (flags & 0x80 ? 3 << ((flags & 7) + 1) : 0);
  let i = 13 + table(gif[10]!);
  while (i < gif.length) {
    if (gif[i] === 0x21) i = skipSubBlocks(i + 2);
    else if (gif[i] === 0x2c) {
      const end = skipSubBlocks(i + 10 + table(gif[i + 9]!) + 1);
      const out = new Uint8Array(end + 1);
      out.set(gif.subarray(0, end));
      out[end] = 0x3b;
      return out;
    } else break;
  }
  return gif;
}

export async function bufoStill(id: string): Promise<Response> {
  if (!/^bufo[a-z0-9-]*$/.test(id)) return new Response("not found", { status: 404 });
  const upstream = await fetch(`${BUFO}${id}.gif`, { cf: { cacheEverything: true, cacheTtl: 86_400 } } as RequestInit);
  if (!upstream.ok) return new Response("not found", { status: 404 });
  return new Response(firstFrame(new Uint8Array(await upstream.arrayBuffer())), { headers: { "content-type": "image/gif", "cache-control": "public, max-age=86400" } });
}
