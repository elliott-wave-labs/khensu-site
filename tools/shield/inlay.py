"""Inlay textures for suñůlink.shield: the khensu.nu mark in stone, from the stone photographs.

The mark sits in a 100-unit box inside a 120-unit square (24 mm on the shield), the same layout as the
mark's SVG. Writes, per tier, a colour map and a glTF metallic-roughness map (G roughness, B metal):

  uv run --with pillow python tools/shield/inlay.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2] / "sites/khensu-nu/public/khensu"
STONES = ROOT / "stones"
OUT = ROOT / "shell/3d"
SIZE = 2048
SS = 2  # supersampling
PX = SIZE * SS / 120  # pixels per unit


def u(v):
    return (v + 10) * PX


def disc(cx, cy, r):
    m = Image.new("L", (SIZE * SS,) * 2, 0)
    ImageDraw.Draw(m).ellipse([u(cx - r), u(cy - r), u(cx + r), u(cy + r)], fill=255)
    return m


def photo(name, size, hi=False):
    im = Image.open(STONES / ("hi" if hi else "") / f"{name}.jpg").convert("RGB")
    w, h = im.size
    c = min(w, h) * 0.72  # the polished face, without the photo's black surround
    im = im.crop(((w - c) / 2, (h - c) / 2, (w + c) / 2, (h + c) / 2))
    return im.resize((int(size), int(size)), Image.LANCZOS)


def paste_in(canvas, img, mask, cx, cy, r):
    s = int(2 * r * PX)
    layer = Image.new("RGB", canvas.size)
    layer.paste(img.resize((s, s), Image.LANCZOS), (int(u(cx - r)), int(u(cy - r))))
    canvas.paste(layer, (0, 0), mask)


def tinted(dark, light):
    g = ImageOps.grayscale(photo("tourmaline", 256))
    return ImageOps.autocontrast(ImageOps.colorize(g, dark, light), cutoff=2)


def build(tier):
    N = SIZE * SS
    color = Image.new("RGB", (N, N), (40, 40, 44))
    orm = Image.new("RGB", (N, N), (0, 38, 0))  # polished stone: roughness 0.15, not metal

    inner = disc(50, 50, 47.5)
    # Labradorite fills the disc; the lapis crescent is the disc minus the circle of the mark's inner arc.
    paste_in(color, photo("labradorite", 1024, True), inner, 50, 50, 47.5)
    crescent = ImageChops.subtract(inner, disc(63.93, 50, 49.5))
    paste_in(color, photo("lapis", 1024, True), crescent, 50, 50, 47.5)

    # Platinum line along the crescent's inner edge.
    plat = ImageChops.multiply(ImageChops.subtract(disc(63.93, 50, 52), disc(63.93, 50, 47)), disc(50, 50, 47.5))
    color.paste((229, 228, 224), (0, 0), plat)
    orm.paste((0, 64, 255), (0, 0), plat)

    # The ring in bloodstone.
    ring = ImageChops.subtract(disc(50, 50, 51), disc(50, 50, 44))
    blood = photo("bloodstone", 1024, True)
    paste_in(color, blood, ring, 50, 50, 51)

    # Node points: blue kyanite and black onyx, with moldavite in the moldavite tier.
    ys = [32, 50, 68] if tier == "moldavite" else [40, 60]
    nodes = ["kyanite", "onyx"] + (["moldavite"] if tier == "moldavite" else [])
    for name, y in zip(nodes, ys):
        paste_in(color, photo(name, 512), disc(73, y, 6.5), 73, y, 6.5)

    # Twelve tourmaline markers in the ring, in its top colours; Paraíba in the moldavite tier.
    import math

    tones = [
        ((90, 10, 40), (240, 120, 170)),  # pink
        ((10, 60, 25), (120, 220, 130)),  # green
        ((10, 40, 110), (110, 180, 255)),  # blue
        None,  # watermelon, the photograph itself
        ((110, 80, 0), (255, 220, 110)),  # canary
        ((0, 90, 90), (90, 255, 235)) if tier == "moldavite" else ((60, 20, 90), (190, 130, 240)),  # Paraíba or purple
    ]
    for i in range(12):
        a = i / 12 * 2 * math.pi - math.pi / 2
        x, y = 50 + math.cos(a) * 47.5, 50 + math.sin(a) * 47.5
        t = tones[i % len(tones)]
        img = photo("tourmaline", 256) if t is None else tinted(*t)
        paste_in(color, img, disc(x, y, 2.4), x, y, 2.4)

    color = color.resize((SIZE, SIZE), Image.LANCZOS)
    orm = orm.resize((SIZE, SIZE), Image.LANCZOS)
    color.save(OUT / f"inlay-{tier}.jpg", quality=88)
    orm.save(OUT / f"inlay-{tier}-orm.png")
    # The close-up on the buy page: the mark alone on transparency.
    alpha = disc(50, 50, 51).resize((SIZE, SIZE), Image.LANCZOS)
    close = color.copy()
    close.putalpha(alpha)
    close.resize((1024, 1024), Image.LANCZOS).save(ROOT / "stones" / f"inlay-{tier}.png", optimize=True)
    print("wrote", tier)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for tier in ("standard", "moldavite"):
        build(tier)
