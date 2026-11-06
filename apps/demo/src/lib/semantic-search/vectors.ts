export type VectorIndex = {
  ids: string[];
  dims: number;
  scales: Float32Array;
  vectors: Int8Array;
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
  return { ids, dims, scales, vectors };
}

export function rank({ ids, dims, scales, vectors }: VectorIndex, query: Float32Array, { limit }: { limit: number }): { unified: string; score: number }[] {
  const scored = ids.map((unified, i) => {
    let dot = 0;
    const base = i * dims;
    for (let d = 0; d < dims; d++) dot += vectors[base + d]! * query[d]!;
    return { unified, score: dot * scales[i]! };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
