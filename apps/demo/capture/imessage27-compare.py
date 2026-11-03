# iOS 27 Messages parity: per-part bounding boxes (pt) and % changed pixels, ref vs ours,
# plus side-by-side images (real | ours | diff). Called by imessage27-parity.mjs.
#   python3 imessage27-compare.py reacted pill keyboard
# Every part is measured the same way in both images: the bounding box of the pixels in
# a region (pt) that differ from the region's corner colour, or that match a colour.
import json, sys
from PIL import Image, ImageChops, ImageDraw, ImageFont

S = 3  # px per pt

# name: (region x0,y0,x1,y1 in pt, rule)
#   rule ("bg", thr): differs from the region's top-left pixel by more than thr
#   rule ("color", (r,g,b), tol): within tol of a colour
#   rule ("ink", thr): darker than thr (text, glyphs)
#   rule ("sat", thr): saturated (emoji, blue)
COMMON = {
    "time": ((40, 15, 130, 50), ("ink", 120)),
    "island": ((130, 5, 270, 60), ("color", (0, 0, 0), 30)),
    "status-right": ((260, 15, 400, 50), ("bg", 12)),
    "back": ((5, 55, 64, 112), ("bg", 6)),
    "avatar": ((150, 55, 252, 116), ("sat", 30)),
    "name-text": ((110, 125, 275, 147), ("ink", 100)),
    "name-pill": ((90, 126, 320, 156), ("bg", 6)),
    "plus": ((15, 795, 75, 855), ("bg", 4)),
    "field": ((75, 795, 392, 858), ("bg", 4)),
    "placeholder": ((90, 812, 250, 840), ("bg", 25)),
}
STATES = {
    "reacted": {
        "imessage": ((100, 168, 300, 184.5), ("bg", 12)),
        "encrypted": ((100, 185, 300, 200), ("bg", 12)),
        "today": ((100, 205, 300, 230), ("bg", 12)),
        "bubble": ((0, 240, 43, 312), ("color", (230, 230, 232), 5)),
        "hi-text": ((20, 265, 60, 300), ("ink", 90)),
        "reaction": ((30, 220, 100, 290), ("color", (0, 134, 253), 45)),
        "spam": ((5, 310, 400, 345), ("bg", 12)),
        "report-spam": ((100, 345, 300, 382), ("bg", 4)),
    },
    "pill": {
        "pill": ((0, 152, 402, 228.5), ("bg", 6)),
        "pill-items": ((18, 168, 402, 224), ("sat", 60)),
        "bubble-white": ((0, 228, 66, 290), ("color", (255, 255, 255), 3)),
        "thought": ((62, 229, 130, 287), ("bg", 6)),
        "smiley": ((70, 228, 115, 262), ("ink", 200)),
        "spam": ((5, 276, 400, 318), ("bg", 12)),
        "report-spam": ((100, 318, 300, 354), ("bg", 4)),
    },
    "keyboard": {
        "sheet": ((0, 470, 402, 874), ("bg", 6)),
        "search": ((3, 505, 398, 528), ("color", (232, 235, 238), 3)),
        "search-text": ((15, 500, 250, 532), ("ink", 190)),
        "label-frequent": ((5, 545, 150, 565), ("ink", 190)),
        "label-smileys": ((250, 545, 402, 565), ("ink", 190)),
        "grid-frequent": ((3, 565, 282, 760), ("sat", 60)),
        "grid-smileys": ((282, 565, 402, 760), ("sat", 60)),
        "tabs": ((3, 762, 400, 800), ("bg", 25)),
        "active-tab": ((8, 760, 50, 800), ("bg", 15)),
        "big-thought": ((5, 140, 125, 231), ("bg", 8)),
        "close": ((70, 140, 105, 182), ("ink", 90)),
        "bubble-white": ((0, 228, 60, 310), ("color", (255, 255, 255), 3)),
    },
}


def bbox(img, region, rule):
    x0, y0, x1, y1 = (round(v * S) for v in region)
    crop = img.crop((x0, y0, x1, y1))
    kind = rule[0]
    if kind == "bg":
        ref = Image.new("RGB", crop.size, crop.getpixel((0, 0)))
        diff = ImageChops.difference(crop, ref)
        mask = maxchan(diff).point(lambda v: 255 if v > rule[1] else 0)
    elif kind == "color":
        ref = Image.new("RGB", crop.size, rule[1])
        mask = maxchan(ImageChops.difference(crop, ref)).point(lambda v: 255 if v <= rule[2] else 0)
    elif kind == "ink":
        mask = crop.convert("L").point(lambda v: 255 if v < rule[1] else 0)
    else:  # sat
        r, g, b = crop.split()
        hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
        lo = ImageChops.darker(ImageChops.darker(r, g), b)
        mask = ImageChops.subtract(hi, lo).point(lambda v: 255 if v > rule[1] else 0)
    box = mask.getbbox()
    if not box:
        return None
    return [round((box[0] + x0) / S, 1), round((box[1] + y0) / S, 1), round((box[2] + x0) / S, 1), round((box[3] + y0) / S, 1)]


def maxchan(img):
    r, g, b = img.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def changed(a, b, thr=24):
    m = maxchan(ImageChops.difference(a, b)).point(lambda v: 255 if v > thr else 0)
    return 100 * m.histogram()[255] / (a.width * a.height)


font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 30)


def side_by_side(state, real, ours, rows):
    diff = maxchan(ImageChops.difference(real, ours)).point(lambda v: 255 - min(255, v * 3)).convert("RGB")
    w, h = real.size
    pad, top = 40, 80
    c = Image.new("RGB", (w * 3 + pad * 4, h + top + pad), "white")
    d = ImageDraw.Draw(c)
    for i, (img, label) in enumerate([(real, "Real: iOS 27.2 simulator"), (ours, "Ours"), (diff, "Difference")]):
        x = pad + i * (w + pad)
        d.text((x, 22), f"{state} · {label}", fill="black", font=font)
        c.paste(img, (x, top))
    # Outline the parts on ours (red) and real (green).
    for name, (r_box, o_box, _) in rows.items():
        for box, x, col in ((r_box, pad, (0, 170, 0)), (o_box, pad * 2 + w, (230, 0, 0))):
            if box:
                d.rectangle([x + box[0] * S, top + box[1] * S, x + box[2] * S, top + box[3] * S], outline=col, width=2)
    return c


def main(states):
    report = {}
    sheets = []
    for state in states:
        real = Image.open(f"ref/imessage27-{state}.png").convert("RGB")
        ours = Image.open(f"out/imessage27-{state}.png").convert("RGB")
        if ours.size != real.size:
            ours = ours.resize(real.size)
        parts = {**COMMON, **STATES[state]}
        if state == "keyboard":  # the sheet covers the composer
            for k in ("plus", "field", "placeholder"):
                parts.pop(k)
        rows = {}
        for name, (region, rule) in parts.items():
            r_box, o_box = bbox(real, region, rule), bbox(ours, region, rule)
            gap = None if not (r_box and o_box) else round(max(abs(a - b) for a, b in zip(r_box, o_box)), 1)
            rows[name] = (r_box, o_box, gap)
        # Clocks differ by design: % changed is also given without the status bar.
        top_cut = 54 * S
        pct = changed(real, ours)
        pct_body = changed(real.crop((0, top_cut, real.width, real.height)), ours.crop((0, top_cut, ours.width, ours.height)))
        report[state] = {"changed": round(pct, 2), "changedBelowStatusBar": round(pct_body, 2), "parts": {k: {"real": v[0], "ours": v[1], "gap": v[2]} for k, v in rows.items()}}
        sbs = side_by_side(state, real, ours, rows)
        sbs.save(f"out/imessage27-{state}-compare.png")
        sheets.append(sbs)
    # All states stacked, at half size.
    half = [s.resize((s.width // 2, s.height // 2), Image.LANCZOS) for s in sheets]
    out = Image.new("RGB", (max(s.width for s in half), sum(s.height for s in half)), "white")
    y = 0
    for s in half:
        out.paste(s, (0, y))
        y += s.height
    out.save("out/imessage27-side-by-side.png")
    print(json.dumps(report))


main(sys.argv[1:] or ["reacted", "pill", "keyboard"])
