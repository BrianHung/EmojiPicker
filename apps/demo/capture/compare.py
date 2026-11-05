import sys
from PIL import Image, ImageChops, ImageDraw, ImageFont

name = sys.argv[1]
ref = Image.open(f"ref/{name}.png").convert("RGB")
ours = Image.open(f"out/{name}.png").convert("RGB")
w, h = max(ref.width, ours.width), max(ref.height, ours.height)
pad, label = 24, 48
canvas = Image.new("RGB", (w * 3 + pad * 4, h + label + pad), "white")
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
d = ImageDraw.Draw(canvas)
a = Image.new("RGB", (w, h), "white"); a.paste(ref, (0, 0))
b = Image.new("RGB", (w, h), "white"); b.paste(ours, (0, 0))
diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 - min(255, v * 3))
for i, (img, t) in enumerate([(a, f"Real ({ref.width//2}x{ref.height//2})"), (b, f"Ours ({ours.width//2}x{ours.height//2})"), (diff.convert("RGB"), "Difference")]):
    x = pad + i * (w + pad)
    d.text((x, 10), t, fill="black", font=font)
    canvas.paste(img, (x, label))
tag = sys.argv[2] if len(sys.argv) > 2 else ""
out = f"out/{name}-compare{tag}.png"
canvas.save(out)
print(out)
