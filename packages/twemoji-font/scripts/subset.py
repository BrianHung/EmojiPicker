import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.otlLib.builder import buildLigatureSubstSubtable
from fontTools.ttLib import TTFont

FE0F = 0xFE0F
# WebKit looks up U+1F408 when it meets VS16; the rest is the picker's own UI: SkinTone's hands and the default frequents
FIRST_SCREEN = [0x1F408, 0x270B, *range(0x1F3FB, 0x1F400), 0x2764, 0x1F44D, 0x1F44E, 0x1F602, 0x203C, 0x2753]
ZERO_WIDTH = {0x200D, FE0F, 0x20E3, *range(0xE0020, 0xE0080)}


def strip(seq):
    return tuple(c for c in seq if c != FE0F)


def parse(text):
    return tuple(ord(c) for c in text)


def unicode_range(cps):
    runs = []
    for c in sorted(cps):
        if runs and c == runs[-1][1] + 1:
            runs[-1][1] = c
        else:
            runs.append([c, c])
    return ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in runs)


NAMES = {
    0: "Copyright 2019 Twitter, Inc and other contributors",
    3: "{version};Twemoji-Regular",
    5: "Version {version}",
    8: "Brian Hung",
    9: "Twitter, Inc and other contributors",
    10: "Twemoji {version} graphics as a COLRv0 color font. Twitter and the Twemoji contributors do not endorse this font.",
    11: "https://github.com/BrianHung/emoji-components",
    12: "https://github.com/jdecked/twemoji",
    13: "The graphics are licensed under CC-BY 4.0.",
    14: "https://creativecommons.org/licenses/by/4.0/",
}


def system_font(patched, version):
    font = TTFont(patched)
    for id, text in NAMES.items():
        font["name"].setName(text.format(version=version), id, 3, 1, 0x409)
    font["OS/2"].fsType = 0
    return font


def main(src, order_path, out, target, version):
    font = TTFont(src)
    cmap = font.getBestCmap()
    cp_of = {g: c for c, g in cmap.items()}
    colr = font["COLR"].ColorLayers
    lookup = next(l for l in font["GSUB"].table.LookupList.Lookup if l.LookupType == 4)

    ligatures = {}
    for st in lookup.SubTable:
        for first, ligs in st.ligatures.items():
            for lig in ligs:
                ligatures[(first, *lig.Component)] = lig.LigGlyph

    sequences = {}
    for cp, g in cmap.items():
        if g in colr:
            sequences.setdefault(g, set()).add((cp,))
    for names, g in ligatures.items():
        sequences.setdefault(g, set()).add(tuple(cp_of[n] for n in names))
    glyph_for = {strip(seq): g for g, seqs in sequences.items() for seq in seqs}

    order = json.loads(Path(order_path).read_text())
    for _, texts in order:
        for seq in map(parse, texts):
            g = glyph_for.get(strip(seq))
            if g and all(c in cmap for c in seq):
                sequences[g].add(seq)
    for g, seqs in sequences.items():
        seqs |= {strip(seq) for seq in seqs}
        for seq in seqs:
            if len(seq) > 1:
                ligatures.setdefault(tuple(cmap[c] for c in seq), g)
    lookup.SubTable = [buildLigatureSubstSubtable(ligatures)]
    lookup.SubTableCount = 1

    hmtx = font["hmtx"]
    for cp in ZERO_WIDTH & cmap.keys():
        hmtx[cmap[cp]] = (0, 0)
    hmtx[cmap[0x20]] = (font["head"].unitsPerEm // 4, 0)

    glyf = font["glyf"]
    cost_of = {}

    def cost(g):
        if g not in cost_of:
            cost_of[g] = {layer.name: len(glyf[layer.name].compile(glyf)) for layer in colr[g]}
        return cost_of[g]

    starts = {}
    for g, seqs in sequences.items():
        for seq in seqs:
            if len(seq) > 1:
                starts.setdefault(seq[0], set()).add(g)

    def base(g):
        return min(sequences[g], key=len)[0]

    owner, chunks = {}, []
    chunk_group = None

    def add(chunk, g):
        # a face whose unicode-range has a codepoint must shape every sequence that starts with it
        pending = [g]
        while pending:
            h = pending.pop()
            if h in chunk["glyphs"]:
                continue
            chunk["glyphs"].add(h)
            owner.setdefault(h, chunk)
            chunk["cost"].update(cost(h))
            for c in {c for seq in sequences[h] for c in seq} - chunk["unicodes"]:
                chunk["unicodes"].add(c)
                pending.extend(starts.get(c, ()))
                if c in cmap and cmap[c] in sequences:
                    pending.append(cmap[c])

    chunks.append({"glyphs": set(), "unicodes": set(), "cost": {}})
    for cp in FIRST_SCREEN:
        add(chunks[0], cmap[cp])
    for group, texts in order:
        glyphs = [g for t in texts if (g := glyph_for.get(strip(parse(t)))) and g not in owner]
        if group is None or not glyphs:
            continue
        size = sum(chunks[-1]["cost"].values())
        if size >= target or (group != chunk_group and size >= target / 8):
            chunks.append({"glyphs": set(), "unicodes": set(), "cost": {}})
        chunk_group = group
        for g in glyphs:
            add(chunks[-1], g)
    for g in sorted(set(sequences) - owner.keys()):
        add(owner.get(cmap.get(base(g)), chunks[-1]), g)

    # line metrics come from the first face covering U+0020, else from the fallback font
    chunks[0]["unicodes"].add(0x20)

    patched = Path(src).with_suffix(".patched.ttf")
    font.save(patched)
    system_font(patched, version).save(Path(out) / "Twemoji.ttf")
    subsets = []
    for i, chunk in enumerate(chunks):
        unicodes = chunk["unicodes"]
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_closure = False
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.notdef_outline = True
        options.glyph_names = False
        options.hinting = False
        subsetter = subset.Subsetter(options)
        subsetter.populate(glyphs=chunk["glyphs"], unicodes=unicodes)
        part = TTFont(patched)
        subsetter.subset(part)
        file = f"twemoji-{i}.woff2"
        part.flavor = "woff2"
        part.save(Path(out) / file)
        # Chromium fetches every face whose range meets the text; VS16 shapes without being in range, except before a keycap
        keeps_vs16 = i == 0 or any(FE0F in seq[:-1] and seq[seq.index(FE0F) + 1] != 0x200D for g in chunk["glyphs"] for seq in sequences[g])
        subsets.append({"file": file, "range": unicode_range(unicodes if keeps_vs16 else unicodes - {FE0F}), "glyphs": len(chunk["glyphs"])})
    print(json.dumps(subsets))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5])
