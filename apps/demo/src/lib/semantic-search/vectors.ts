export type VectorIndex = {
  ids: string[];
  dims: number;
  scales: Float32Array;
  vectors: Int8Array;
  bits: Uint32Array;
};

const MAGIC = 0x31424d45;
const pad4 = (n: number) => (n + 3) & ~3;

export function encodeIndex(ids: string[], vectors: Float32Array[], dims: number): Uint8Array {
  const idBytes = new TextEncoder().encode(ids.join("\n"));
  const header = 16;
  const idsEnd = header + pad4(idBytes.length);
  const scalesEnd = idsEnd + ids.length * 4;
  const out = new Uint8Array(scalesEnd + ids.length * dims);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, ids.length, true);
  view.setUint32(8, dims, true);
  view.setUint32(12, idBytes.length, true);
  out.set(idBytes, header);
  const q = new Int8Array(out.buffer, scalesEnd);
  vectors.forEach((v, i) => {
    let max = 0;
    for (let d = 0; d < dims; d++) max = Math.max(max, Math.abs(v[d]!));
    const scale = max / 127 || 1;
    view.setFloat32(idsEnd + i * 4, scale, true);
    for (let d = 0; d < dims; d++) q[i * dims + d] = Math.round(v[d]! / scale);
  });
  return out;
}

export function decodeIndex(buffer: ArrayBuffer): VectorIndex {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("embeddings: not an EMB1 file");
  const count = view.getUint32(4, true);
  const dims = view.getUint32(8, true);
  const idBytes = view.getUint32(12, true);
  const ids = new TextDecoder().decode(new Uint8Array(buffer, 16, idBytes)).split("\n");
  const idsEnd = 16 + pad4(idBytes);
  const scales = new Float32Array(buffer.slice(idsEnd, idsEnd + count * 4));
  const vectors = new Int8Array(buffer, idsEnd + count * 4, count * dims);
  const words = dims / 32;
  const bits = new Uint32Array(count * words);
  for (let i = 0; i < count; i++) for (let d = 0; d < dims; d++) if (vectors[i * dims + d]! > 0) bits[i * words + (d >> 5)]! |= 1 << (d & 31);
  return { ids, dims, scales, vectors, bits };
}

const popcount = (x: number) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

type RankOptions = {
  limit: number;
  shortlist?: number;
};

export function rank(index: VectorIndex, query: Float32Array, { limit, shortlist = 0 }: RankOptions): { unified: string; score: number }[] {
  const { ids, dims, scales, vectors, bits } = index;
  let candidates: number[];
  if (shortlist > 0 && shortlist < ids.length) {
    const words = dims / 32;
    const qbits = new Uint32Array(words);
    for (let d = 0; d < dims; d++) if (query[d]! > 0) qbits[d >> 5]! |= 1 << (d & 31);
    const distance = new Uint16Array(ids.length);
    for (let i = 0; i < ids.length; i++) {
      let h = 0;
      for (let w = 0; w < words; w++) h += popcount(bits[i * words + w]! ^ qbits[w]!);
      distance[i] = h;
    }
    candidates = [...ids.keys()].sort((a, b) => distance[a]! - distance[b]!).slice(0, shortlist);
  } else {
    candidates = [...ids.keys()];
  }
  const scored = candidates.map((i) => {
    let dot = 0;
    const base = i * dims;
    for (let d = 0; d < dims; d++) dot += vectors[base + d]! * query[d]!;
    return { unified: ids[i]!, score: dot * scales[i]! };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
