"""One-shot: generate favicon/PWA icons for TourGuideWeb from the Murmure icon.
Source: TourGuideApp/branding/murmure-icon-1024.png
"""
import base64
import io
import os

from PIL import Image

SRC = os.path.join("..", "TourGuideApp", "branding", "murmure-icon-1024.png")
OUT = "public"

src = Image.open(SRC).convert("RGBA")
print("source", src.size, src.mode)


def resized(size: int) -> Image.Image:
    return src.resize((size, size), Image.LANCZOS)


# PNG variants
for name, size in [
    ("favicon-32.png", 32),
    ("apple-touch-icon-180.png", 180),
    ("favicon-192.png", 192),
    ("favicon-512.png", 512),
]:
    resized(size).save(os.path.join(OUT, name), "PNG")
    print("wrote", name, size)

# Multi-size .ico (16/32/48)
resized(48).save(
    os.path.join(OUT, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)
print("wrote favicon.ico")

# favicon.svg — wrap a crisp 256px raster as a data URI so the reference
# resolves and scales acceptably at tab sizes (true vector source unavailable).
buf = io.BytesIO()
resized(256).save(buf, "PNG")
b64 = base64.b64encode(buf.getvalue()).decode("ascii")
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" '
    'viewBox="0 0 512 512">'
    f'<image width="512" height="512" href="data:image/png;base64,{b64}"/>'
    "</svg>\n"
)
with open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(svg)
print("wrote favicon.svg", f"{len(svg)//1024}KB")
