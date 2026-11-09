import { expect, test } from "vitest";
import { firstFrame } from "../still";

const header = [...new TextEncoder().encode("GIF89a"), 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 255, 255, 255];
const loop = [0x21, 0xff, 11, ...new TextEncoder().encode("NETSCAPE2.0"), 3, 1, 0, 0, 0];
const frame = [0x21, 0xf9, 4, 0, 10, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0];

test("keeps the header and the first frame, then ends the file", () => {
  const gif = new Uint8Array([...header, ...loop, ...frame, ...frame, 0x3b]);
  expect([...firstFrame(gif)]).toEqual([...header, ...loop, ...frame, 0x3b]);
});
