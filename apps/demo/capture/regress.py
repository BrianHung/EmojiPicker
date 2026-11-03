# Compare out/<name>.png to baseline/<name>.png: share of pixels that changed (any channel > 8).
import glob, os, sys
from PIL import Image, ImageChops
bad = 0
for b in sorted(glob.glob("baseline/*.png")):
    name = os.path.basename(b)
    o = f"out/{name}"
    A, B = Image.open(b).convert("RGB"), Image.open(o).convert("RGB")
    if A.size != B.size:
        print(f"{name:22} SIZE {A.size} -> {B.size}"); bad += 1; continue
    d = ImageChops.difference(A, B).convert("L").point(lambda v: 255 if v > 8 else 0)
    pct = 100 * sum(d.histogram()[255:]) / (A.width * A.height)
    flag = "" if pct < 0.05 else "  <-- changed"
    bad += bool(flag)
    if flag or "-v" in sys.argv: print(f"{name:22} {pct:6.2f}%{flag}")
    if flag: d.save(f"out/regress-{name}")
print("all identical" if not bad else f"{bad} changed")
