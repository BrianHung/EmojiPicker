import glob, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

style = sys.argv[1]
w, h = (int(v) for v in sys.argv[2].split("x"))
bg = sys.argv[3] if len(sys.argv) > 3 else "white"
steps = sys.argv[4].split(",") if len(sys.argv) > 4 else []
d = f"frames/{style}"
n = len(glob.glob(f"{d}/real-*.png"))
W, H, pad, top = w * 2, h * 2, 32, 72
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 30)
small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
fg = "black" if bg == "white" else "white"
os.makedirs(f"{d}/sbs", exist_ok=True)
for i in range(n):
    c = Image.new("RGB", (W * 2 + pad * 3, H + top + pad), bg)
    dr = ImageDraw.Draw(c)
    for j, (name, label) in enumerate([("real", f"Real {style.capitalize()}"), ("ours", "Ours (@brianhung/emoji-picker)")]):
        im = Image.open(f"{d}/{name}-{i}.png").convert("RGB").resize((W, H), Image.LANCZOS)
        x = pad + j * (W + pad)
        dr.text((x, 20), label, fill=fg, font=font)
        c.paste(im, (x, top))
    if i < len(steps):
        dr.text((W * 2 + pad * 2 - 360, 24), steps[i], fill=fg, font=small)
    c.save(f"{d}/sbs/{i:02d}.png")
mp4, gif = f"out/{style}-side-by-side.mp4", f"out/{style}-side-by-side.gif"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1.25", "-i", f"{d}/sbs/%02d.png", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=25", "-c:v", "libx264", "-pix_fmt", "yuv420p", mp4], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1.25", "-i", f"{d}/sbs/%02d.png", "-vf", "scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse", gif], check=True)
print(mp4, gif)
