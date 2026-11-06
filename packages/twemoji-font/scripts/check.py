import json
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

TABLES = {"COLR", "CPAL", "GSUB", "OS/2", "cmap", "glyf", "head", "hhea", "hmtx", "loca", "maxp", "name", "post"}
METRICS = [("head", "unitsPerEm"), ("hhea", "ascent"), ("hhea", "descent"), ("hhea", "lineGap"), ("OS/2", "sTypoAscender"), ("OS/2", "sTypoDescender"), ("OS/2", "sTypoLineGap"), ("OS/2", "usWinAscent"), ("OS/2", "usWinDescent")]


def main(ttf, web, order_path, version, svg_dir):
    svgs = {p.stem for p in Path(svg_dir).glob("*.svg")}
    font = TTFont(ttf)
    errors = [f"missing {t}" for t in sorted(TABLES - set(font.keys()))]
    name = font["name"]
    for id, text in {1: "Twemoji", 2: "Regular", 5: f"Version {version}"}.items():
        if name.getDebugName(id) != text:
            errors.append(f"name {id}: {name.getDebugName(id)!r}")
    errors += [f"name {id} missing" for id in (0, 9, 13, 14) if not name.getDebugName(id)]
    if font["OS/2"].fsType != 0:
        errors.append(f"fsType {font['OS/2'].fsType}")
    reference = TTFont(web)
    errors += [f"{t}.{a}: {getattr(font[t], a)} != {getattr(reference[t], a)}" for t, a in METRICS if getattr(font[t], a) != getattr(reference[t], a)]

    colr = font["COLR"].ColorLayers
    if len(colr) != len(svgs):
        errors.append(f"{len(colr)} color glyphs for {len(svgs)} SVGs")
    cmap = font.getBestCmap()
    if not any(t.format == 12 and t.platformID == 3 and t.platEncID == 10 for t in font["cmap"].tables):
        errors.append("no Windows UCS-4 cmap")
    ligatures = {}
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for st in lookup.SubTable if lookup.LookupType == 4 else ():
            for first, ligs in st.ligatures.items():
                for lig in ligs:
                    ligatures[(first, *lig.Component)] = lig.LigGlyph

    def shape(seq):
        if not all(c in cmap for c in seq):
            return None
        glyphs = tuple(cmap[c] for c in seq)
        return glyphs[0] if len(glyphs) == 1 else ligatures.get(glyphs)

    reached, shaped = set(), 0
    sequences = [tuple(map(ord, t)) for _, texts in json.loads(Path(order_path).read_text()) for t in texts]
    hexname = lambda seq: "-".join(f"{c:x}" for c in seq)
    for seq in sequences:
        if not {hexname(seq), hexname(c for c in seq if c != 0xFE0F)} & svgs:
            continue
        for variant in {seq, tuple(c for c in seq if c != 0xFE0F) or seq}:
            g = shape(variant)
            if g in colr:
                reached.add(g)
                shaped += 1
            else:
                errors.append(f"{' '.join(f'{c:04X}' for c in variant)} does not shape to a color glyph")
    unreachable = set(colr) - reached - set(cmap.values()) - set(ligatures.values())
    errors += [f"{g} unreachable" for g in sorted(unreachable)]

    for e in errors[:50]:
        print(e, file=sys.stderr)
    if errors:
        sys.exit(f"{ttf}: {len(errors)} errors")
    print(f"{Path(ttf).name}: {len(font.getGlyphOrder())} glyphs, {len(colr)} color glyphs, {len(ligatures)} ligatures, {shaped} sequences shape")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
