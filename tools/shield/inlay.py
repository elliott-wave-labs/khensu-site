"""Inlay textures for suñůlink.shield: the khensu.nu mark in stone, from the stone photographs.

The mark sits in a 100-unit box inside a 120-unit square (24 mm on the shield), the same layout as the
mark's SVG. Writes, per tier, a colour map and a glTF metallic-roughness map (G roughness, B metal):

  uv run --with pillow --with numpy python tools/shield/inlay.py
"""

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

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


def square(cx, cy, h):
    m = Image.new("L", (SIZE * SS,) * 2, 0)
    ImageDraw.Draw(m).rectangle([u(cx - h), u(cy - h), u(cx + h), u(cy + h)], fill=255)
    return m


# The Triangulum chart, in the page space of Triangulum_IAU.svg. North is up, east is left.
# The triangle is the real one on that chart: β and γ close together, α the long point.
BETA, GAMMA, ALPHA = (221.1, 174.7), (202.0, 187.4), (261.4, 237.8)
EPSILON = (236.7, 194.8)
# The yellow disc above the boundary is the open cluster NGC 752, not a Bayer star.
NGC752 = (249.45, 149.16, 14.73)
# The red oval is M33, the Triangulum galaxy.
M33 = (304.1, 216.4, 314.7, 230.4)
# (x, y, diameter) of the other stars on the same view. No names on these.
CHART_STARS = [
    (224.5, 309.1, 11.45), (362.9, 160.7, 11.23), (221.1, 174.7, 8.39), (261.4, 237.8, 7.43),
    (388.5, 123.5, 6.5), (202.0, 187.4, 6.24), (412.9, 297.5, 5.57), (365.5, 225.2, 5.39),
    (377.9, 330.0, 5.18), (249.5, 307.7, 5.18), (367.1, 289.6, 5.16), (393.1, 323.0, 5.17),
    (349.0, 260.0, 5.05), (224.3, 141.3, 5.0), (202.8, 183.0, 4.89), (212.8, 229.1, 4.85),
    (219.1, 280.1, 4.83), (226.0, 318.6, 4.67), (252.9, 148.5, 4.66), (158.2, 174.9, 4.57),
    (424.4, 245.1, 4.54), (168.3, 158.6, 4.52), (365.1, 209.6, 4.51), (343.2, 243.3, 4.44),
    (208.6, 334.9, 4.43), (205.1, 193.2, 4.4), (172.6, 234.6, 4.36), (195.4, 247.8, 4.34),
    (154.8, 179.6, 4.23), (401.9, 233.4, 4.2), (385.0, 202.7, 4.12), (418.5, 294.1, 4.12),
    (236.7, 194.8, 4.1), (176.0, 209.9, 4.05), (387.9, 332.3, 4.04), (202.1, 290.1, 4.04),
    (327.9, 139.7, 4.02), (219.1, 127.4, 3.99), (286.6, 171.1, 3.97), (234.3, 280.4, 3.92),
    (161.0, 144.5, 3.92), (255.1, 307.8, 3.86), (202.3, 281.4, 3.82), (356.7, 136.7, 3.82),
    (271.6, 201.4, 3.82), (375.1, 278.4, 3.81), (165.0, 177.1, 3.77), (270.8, 322.8, 3.77),
    (249.8, 258.6, 3.75), (163.0, 285.7, 3.75), (245.0, 337.2, 3.72), (303.8, 147.0, 3.71),
    (171.2, 231.4, 3.71), (159.4, 127.7, 3.71), (270.1, 140.1, 3.68), (290.2, 231.5, 3.66),
    (210.1, 300.5, 3.65), (345.5, 339.8, 3.64), (145.3, 291.2, 3.64), (392.7, 176.4, 3.63),
]
STAR_STONES = ["labradorite", "kyanite", "lapis", "onyx", "moldavite", "bloodstone", "tourmaline"]
FONT_ROMAN = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_ITALIC = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"


def _inside(p, tri):
    def side(a, b):
        return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])

    d1, d2, d3 = side(tri[0], tri[1]), side(tri[1], tri[2]), side(tri[2], tri[0])
    return (d1 >= 0 and d2 >= 0 and d3 >= 0) or (d1 <= 0 and d2 <= 0 and d3 <= 0)


def _chart_map():
    """Centre the chart on the α β γ triangle. Returns page-point -> mark-point.

    The triangle's centroid sits on the mark's centre, so the triangle and its point mirror
    overlap in a hexagon there. Stars past the bloodstone ring are dropped.
    """
    xs = [p[0] for p in CHART_STARS] + [NGC752[0], M33[0], M33[2]]
    ys = [p[1] for p in CHART_STARS] + [NGC752[1], M33[1], M33[3]]
    scale = 1.6 * 72.0 / max(max(xs) - min(xs), max(ys) - min(ys))
    tri = (BETA, GAMMA, ALPHA)
    cx = sum(p[0] for p in tri) / 3
    cy = sum(p[1] for p in tri) / 3

    def mark(x, y):
        return (50 + (x - cx) * scale, 50 + (y - cy) * scale)

    return mark


def triangulum_chart():
    """Stones in the chart's shape.

    Each star outside the triangle is its own stone, with no name. M33 is a red tourmaline
    oval. NGC 752 is a round pyrite, labeled. The α β γ triangle is one pyrite sliver, filled,
    with α β γ δ ε laser-etched down its length. Those letters are Greek Bayer names.
    """
    mark = _chart_map()
    tri = [BETA, GAMMA, ALPHA]
    n = SIZE * SS
    tri_mask = Image.new("L", (n, n), 0)
    etch = Image.new("L", (n, n), 0)
    corners = [mark(*p) for p in tri]
    cx = sum(p[0] for p in corners) / 3
    cy = sum(p[1] for p in corners) / 3
    shape = [(cx + (x - cx) * 1.14, cy + (y - cy) * 1.14) for x, y in corners]
    ImageDraw.Draw(tri_mask).polygon([c for p in shape for c in (u(p[0]), u(p[1]))], fill=255)

    stars = []
    for x, y, d in CHART_STARS:
        if _inside((x, y), tri):
            continue
        if any((x - q[0]) ** 2 + (y - q[1]) ** 2 < 20 for q in (ALPHA, BETA, GAMMA, EPSILON)):
            continue
        if (x - NGC752[0]) ** 2 + (y - NGC752[1]) ** 2 < (NGC752[2] / 2) ** 2:
            continue
        mx, my = mark(x, y)
        if (mx - 50) ** 2 + (my - 50) ** 2 > 40 ** 2:
            continue
        name = STAR_STONES[(int(x * 3) + int(y * 5)) % len(STAR_STONES)]
        stars.append((name, mx, my, max(0.45, d * (mark(x + 1, y)[0] - mx) * 0.48)))

    yx, yy = mark(NGC752[0], NGC752[1])
    yr = NGC752[2] * (mark(NGC752[0] + 1, NGC752[1])[0] - yx) * 0.5
    m33 = [mark(M33[0], M33[1]), mark(M33[2], M33[3])]

    draw = ImageDraw.Draw(etch)
    roman = ImageFont.truetype(FONT_ROMAN, max(18, int(PX * 0.85)))
    italic = ImageFont.truetype(FONT_ITALIC, max(18, int(PX * 0.95)))
    small = ImageFont.truetype(FONT_ROMAN, max(14, int(PX * 0.55)))

    def along(y, x_shift=0.0):
        edges = [(BETA, GAMMA), (GAMMA, ALPHA), (ALPHA, BETA)]
        xs = []
        for p, q in edges:
            if abs(p[1] - q[1]) < 1e-6:
                continue
            if (p[1] - y) * (q[1] - y) <= 0:
                t = (y - p[1]) / (q[1] - p[1])
                if 0 <= t <= 1:
                    xs.append(p[0] + t * (q[0] - p[0]))
        mid = (sum(p[0] for p in tri) / 3) if len(xs) < 2 else (min(xs) + max(xs)) / 2
        return mark(mid + x_shift, y)

    stroke = max(1, int(PX * 0.04))
    for ch, at, face in (
        ("β", along(183.2), roman),
        ("γ", along(188.6, -6.2), roman),
        ("δ", along(188.6, 6.4), roman),
        ("ε", along(198.5), italic),
        ("α", along(214.0), italic),
    ):
        draw.text((u(at[0]), u(at[1])), ch, fill=255, font=face, anchor="mm", stroke_width=stroke, stroke_fill=255)
    label_at = (yx + yr + 1.2, yy)
    if (label_at[0] - 50) ** 2 + (label_at[1] - 50) ** 2 < 42 ** 2:
        draw.text((u(label_at[0]), u(label_at[1])), "NGC 752", fill=255, font=small, anchor="lm")

    etch = etch.filter(ImageFilter.GaussianBlur(radius=0.5))
    return tri_mask, etch, stars, (yx, yy, yr), m33


def paste_in(canvas, img, mask, cx, cy, r):
    s = int(2 * r * PX)
    layer = Image.new("RGB", canvas.size)
    layer.paste(img.resize((s, s), Image.LANCZOS), (int(u(cx - r)), int(u(cy - r))))
    canvas.paste(layer, (0, 0), mask)


def tinted(dark, light):
    g = ImageOps.grayscale(photo("tourmaline", 256))
    return ImageOps.autocontrast(ImageOps.colorize(g, dark, light), cutoff=2)


def platinum(cx, cy, r0, r1):
    """Polished platinum: a domed line lit by a studio environment, brushed along its length."""
    n = SIZE * SS
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    dx, dy = xs - u(cx), ys - u(cy)
    d = np.hypot(dx, dy) / PX
    rx, ry = dx / (d * PX + 1e-6), dy / (d * PX + 1e-6)
    t = np.clip((d - r0) / (r1 - r0), 0, 1)
    s = (t - 0.5) * 1.7
    nz = np.sqrt(np.clip(1 - s * s, 0.05, 1))
    nx, ny = rx * s, ry * s
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / norm, ny / norm, nz / norm
    # Reflect a view ray looking straight down.
    Rx, Ry, Rz = 2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1
    soft = np.clip((-0.55 * Rx - 0.75 * Ry + 0.25) * 1.3, 0, 1) ** 1.6
    strip = np.exp(-(((Ry + 0.25) / 0.16) ** 2)) * 0.55
    floor = np.clip(Rz, 0, 1) * 0.18
    env = np.clip(0.16 + soft * 0.7 + strip + floor, 0, 1)
    L = np.array([-0.45, -0.6, 0.66]) / np.linalg.norm([-0.45, -0.6, 0.66])
    spec = np.clip(Rx * L[0] + Ry * L[1] + Rz * L[2], 0, 1) ** 60
    theta = np.arctan2(dy, dx)
    rng = np.random.default_rng(7)
    lines = rng.normal(0, 1, 4096).astype(np.float32)
    brushed = lines[((theta + np.pi) / (2 * np.pi) * 4095).astype(int) % 4096] * 0.035
    seam = 1 - 0.55 * np.exp(-((t / 0.07) ** 2)) - 0.55 * np.exp(-(((1 - t) / 0.07) ** 2))
    v = np.clip((env + brushed) * seam, 0, 1)
    dark = np.array([78, 80, 86], np.float32)
    light = np.array([244, 244, 241], np.float32)
    rgb = dark + (light - dark) * v[..., None] + spec[..., None] * np.array([255, 252, 246], np.float32) * 0.9
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def rot(im):
    """The point mirror through the mark's centre: x and y both flip."""
    return im.transpose(Image.Transpose.ROTATE_180)


def rotate_matched(im):
    """Two halves of one slab, the right half turned end for end, so the stone has the mirror's symmetry."""
    a = np.asarray(im).copy()
    h = a.shape[1] // 2
    a[:, h:] = a[::-1, ::-1][:, h:]
    return Image.fromarray(a, im.mode)


def build(tier):
    N = SIZE * SS
    color = Image.new("RGB", (N, N), (40, 40, 44))
    orm = Image.new("RGB", (N, N), (0, 38, 0))  # polished stone: roughness 0.15, not metal

    # The ground: black onyx rim, labradorite field, bloodstone ring, each rotate-matched.
    paste_in(color, photo("onyx", 1024), disc(50, 50, 53), 50, 50, 53)
    inner = disc(50, 50, 47.5)
    paste_in(color, photo("labradorite", 1024, True), inner, 50, 50, 47.5)
    ring = ImageChops.subtract(disc(50, 50, 51), disc(50, 50, 44))
    paste_in(color, photo("bloodstone", 1024, True), ring, 50, 50, 51)
    color = rotate_matched(color)
    # The seam between the two halves is the mirror's axis, set with a platinum hairline.
    seam = Image.new("L", color.size, 0)
    ImageDraw.Draw(seam).rectangle([u(49.85), u(-3), u(50.15), u(103)], fill=255)
    seam = ImageChops.multiply(seam, disc(50, 50, 53))
    color.paste((226, 226, 222), (0, 0), seam)
    orm.paste((0, 64, 255), (0, 0), seam)

    # Everything set into the ground is drawn once, then again in the point mirror.
    fg = color.copy()
    fo = orm.copy()

    # The lapis crescent is the disc minus the circle of the mark's inner arc, with platinum on its edge.
    crescent = ImageChops.subtract(inner, disc(63.93, 50, 49.5))
    paste_in(fg, photo("lapis", 1024, True), crescent, 50, 50, 47.5)
    plat = ImageChops.multiply(ImageChops.subtract(disc(63.93, 50, 52), disc(63.93, 50, 47)), inner)
    fg.paste(platinum(63.93, 50, 47, 52), (0, 0), plat)
    fo.paste((0, 64, 255), (0, 0), plat)
    ground = ImageChops.lighter(crescent, plat)
    fm = Image.new("L", fg.size, 0)

    # Node points: blue kyanite and black onyx, with moldavite in the moldavite tier.
    ys = [32, 50, 68] if tier == "moldavite" else [40, 60]
    nodes = ["kyanite", "onyx"] + (["moldavite"] if tier == "moldavite" else [])
    for name, y in zip(nodes, ys):
        m = disc(73, y, 6.5)
        paste_in(fg, photo(name, 512), m, 73, y, 6.5)
        fm = ImageChops.lighter(fm, m)

    # The chart: one stone per star, M33 in red tourmaline, NGC 752 and the triangle in pyrite.
    tri_mask, tri_etch, stars, ngc, m33 = triangulum_chart()
    for name, sx, sy, sr in stars:
        m = disc(sx, sy, sr)
        paste_in(fg, photo(name, 256), m, sx, sy, sr)
        fm = ImageChops.lighter(fm, m)
    mx0, my0 = m33[0]
    mx1, my1 = m33[1]
    m33_mask = Image.new("L", fg.size, 0)
    box_m = [u(min(mx0, mx1)), u(min(my0, my1)), u(max(mx0, mx1)), u(max(my0, my1))]
    ImageDraw.Draw(m33_mask).ellipse(box_m, fill=255)
    # colorize only. autocontrast pulls this red back to grey.
    red = ImageOps.colorize(ImageOps.grayscale(photo("tourmaline", 256)), (90, 8, 16), (196, 32, 42))
    red = red.resize((max(1, int(box_m[2] - box_m[0])), max(1, int(box_m[3] - box_m[1]))), Image.LANCZOS)
    red_layer = Image.new("RGB", fg.size)
    red_layer.paste(red, (int(box_m[0]), int(box_m[1])))
    fg.paste(red_layer, (0, 0), m33_mask)
    ngc_mask = disc(*ngc)
    paste_in(fg, photo("pyrite", 512, True), ngc_mask, ngc[0], ngc[1], ngc[2])
    fm = ImageChops.lighter(fm, ImageChops.lighter(m33_mask, ngc_mask))

    # Where the triangle crosses its mirror is the hexagon: pyrite, rimmed in platinum, left unetched.
    hexagon = ImageChops.multiply(tri_mask, rot(tri_mask))
    rim = ImageChops.subtract(hexagon.filter(ImageFilter.MaxFilter(int(PX * 0.3) | 1)), hexagon.filter(ImageFilter.MinFilter(int(PX * 0.3) | 1)))
    pyrite = photo("pyrite", 1024, True).resize((N, N), Image.LANCZOS)
    fg.paste(pyrite, (0, 0), tri_mask)
    fo.paste((0, 50, 200), (0, 0), tri_mask)
    fm = ImageChops.lighter(fm, tri_mask)
    tri_etch = ImageChops.subtract(tri_etch, hexagon.filter(ImageFilter.MaxFilter(int(PX * 1.2) | 1)))
    # A smooth groove: dark in the cut, with a bright lip so it reads as etched metal, not ink.
    etch = np.asarray(tri_etch).astype(np.float32) / 255.0
    lip = np.asarray(tri_etch.filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 255.0
    lip = np.clip(lip - etch, 0, 1)
    rgb = np.asarray(fg).astype(np.float32)
    rgb *= (1.0 - 0.94 * etch)[..., None]
    rgb = rgb * (1.0 - 0.72 * lip)[..., None] + np.array([255, 228, 170], np.float32) * (0.72 * lip)[..., None]
    fg = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    rough = np.asarray(fo).astype(np.float32)
    rough[..., 1] = np.clip(rough[..., 1] + etch * 170, 0, 255)
    rough[..., 2] = rough[..., 2] * (1.0 - 0.75 * etch)
    fo = Image.fromarray(np.clip(rough, 0, 255).astype(np.uint8), "RGB")

    # Both crescents first, then every stone from both sides, so each twin sits on top of the other's crescent.
    inside = disc(50, 50, 44)
    for m in (ground, fm):
        m = ImageChops.multiply(m, inside)
        for f, o, k in ((rot(fg), rot(fo), rot(m)), (fg, fo, m)):
            color.paste(f, (0, 0), k)
            orm.paste(o, (0, 0), k)
    color.paste(pyrite, (0, 0), hexagon)
    orm.paste((0, 50, 200), (0, 0), hexagon)
    color.paste((232, 232, 228), (0, 0), rim)
    orm.paste((0, 64, 255), (0, 0), rim)

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
    alpha = disc(50, 50, 53).resize((SIZE, SIZE), Image.LANCZOS)
    close = color.copy()
    close.putalpha(alpha)
    close.resize((1024, 1024), Image.LANCZOS).save(ROOT / "stones" / f"inlay-{tier}.png", optimize=True)
    print("wrote", tier)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for tier in ("standard", "moldavite"):
        build(tier)
