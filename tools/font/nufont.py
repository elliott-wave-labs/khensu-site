#!/usr/bin/env python3
"""ñü.Føňt (code: nu Font): a parametric stroke font built from skeletons.

Every glyph is a set of centreline strokes (lines, circle and ellipse arcs, filleted polylines) drawn on a
golden-ratio grid: cap height 700, x-height 350 (capitals are twice the bowl of a b), descender 216 (350 / φ),
1000 units per em. The strokes are expanded to quadratic outlines with superellipse ("capsule") ends, so nothing
is a sharp corner and nothing is fully round. The same skeletons are stroked at six weights and sheared for the
italics, which keeps every master point-compatible and lets fontTools build one variable font (wght + slnt).

House rules in the shapes: no stems where a letter can live without one. n is an upside-down horseshoe, u a
horseshoe, m two horseshoes, r a bit more than half a curve. h keeps the top half of its stem: it comes down to
the x-height and squiggles back into the shoulder, so the left side never reaches the baseline. b and d keep a
short stem and float their bubble above the baseline. `python nufont.py stems` lists the letters that still
have a stem.

Usage
  python nufont.py build [outdir]       # statics, variable TTF and WOFF2 (default: dist/)
  python nufont.py svg "khėnsu.ñü" [wght] [outfile]   # one <path> per stroke; marks get a class
  python nufont.py stems
"""
from __future__ import annotations

import json
import math
import sys
import unicodedata
from array import array
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIST = HERE / "dist"

UPM = 1000
PHI = (1 + 5**0.5) / 2
CAP = 700
XH = 350  # CAP / 2: capitals are double the bowl of a b
ASC = 700
DESC = -round(XH / PHI)  # -216
CAP_K = 2.6  # superellipse exponent for stroke ends: 2 is round, higher is squarer
SEG_DEG = 36.0  # one quadratic segment per this many degrees of arc

WEIGHTS = [
    ("Ultralight", 100, 24),
    ("Light", 300, 48),
    ("Medium", 500, 78),
    ("Bold", 700, 106),
    ("Heavy", 800, 128),
    ("Blackout", 900, 150),
]
SLANT_DEG = 11.0

# --------------------------------------------------------------------------------------------------------------
# Skeleton primitives. Each is a parametric curve on t in [0, 1] with a fixed segment count (k) per master set.
# --------------------------------------------------------------------------------------------------------------


@dataclass
class Prim:
    kind: str  # line | arc | earc | point
    data: tuple
    k: int = 0  # quadratic segments, fixed from the reference master

    def span_deg(self) -> float:
        if self.kind == "arc":
            return abs(self.data[3] - self.data[2])
        if self.kind == "earc":
            return abs(self.data[4] - self.data[3])
        return 0.0

    def eval(self, t: float):
        """Point and unit tangent at t."""
        if self.kind == "line":
            (x0, y0), (x1, y1) = self.data
            dx, dy = x1 - x0, y1 - y0
            L = math.hypot(dx, dy) or 1.0
            return (x0 + dx * t, y0 + dy * t), (dx / L, dy / L)
        if self.kind == "arc":
            (cx, cy), r, a0, a1 = self.data
            a = math.radians(a0 + (a1 - a0) * t)
            sgn = 1.0 if a1 >= a0 else -1.0
            return (cx + r * math.cos(a), cy + r * math.sin(a)), (-math.sin(a) * sgn, math.cos(a) * sgn)
        if self.kind == "earc":
            (cx, cy), a_, b_, t0, t1 = self.data
            th = math.radians(t0 + (t1 - t0) * t)
            sgn = 1.0 if t1 >= t0 else -1.0
            tx, ty = -a_ * math.sin(th) * sgn, b_ * math.cos(th) * sgn
            L = math.hypot(tx, ty) or 1.0
            return (cx + a_ * math.cos(th), cy + b_ * math.sin(th)), (tx / L, ty / L)
        (x, y), = self.data
        return (x, y), (1.0, 0.0)

    def shifted(self, dx, dy):
        if self.kind == "line":
            (x0, y0), (x1, y1) = self.data
            return Prim("line", ((x0 + dx, y0 + dy), (x1 + dx, y1 + dy)), self.k)
        if self.kind == "arc":
            (cx, cy), r, a0, a1 = self.data
            return Prim("arc", ((cx + dx, cy + dy), r, a0, a1), self.k)
        if self.kind == "earc":
            (cx, cy), a, b, t0, t1 = self.data
            return Prim("earc", ((cx + dx, cy + dy), a, b, t0, t1), self.k)
        (x, y), = self.data
        return Prim("point", ((x + dx, y + dy),), self.k)


def line(p0, p1) -> Prim:
    return Prim("line", (tuple(map(float, p0)), tuple(map(float, p1))))


def arc(c, r, a0, a1) -> Prim:
    """Circle arc from angle a0 to a1 in degrees; increasing angles run counter-clockwise."""
    return Prim("arc", (tuple(map(float, c)), float(r), float(a0), float(a1)))


def earc(c, a, b, t0, t1) -> Prim:
    return Prim("earc", (tuple(map(float, c)), float(a), float(b), float(t0), float(t1)))


def point(p) -> Prim:
    return Prim("point", (tuple(map(float, p)),))


def circle(c, r) -> list[Prim]:
    return [arc(c, r, 90, 450)]


def ellipse(c, a, b) -> list[Prim]:
    return [earc(c, a, b, 90, 450)]


def fillet_path(points, rho) -> list[Prim]:
    """A polyline whose corners are rounded with arcs of radius rho (clamped to the segment lengths).
    rho may be a list with one radius per corner."""
    prims: list[Prim] = []
    pts = [tuple(map(float, p)) for p in points]
    rhos = rho if isinstance(rho, (list, tuple)) else [rho] * (len(pts) - 2)
    cur = pts[0]
    for i in range(1, len(pts) - 1):
        p0, p1, p2 = pts[i - 1], pts[i], pts[i + 1]
        v1 = (p0[0] - p1[0], p0[1] - p1[1])
        v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1, u2 = (v1[0] / l1, v1[1] / l1), (v2[0] / l2, v2[1] / l2)
        cosang = max(-1.0, min(1.0, u1[0] * u2[0] + u1[1] * u2[1]))
        theta = math.acos(cosang)  # interior angle
        r = min(rhos[i - 1], 0.49 * l1 / math.tan(theta / 2), 0.49 * l2 / math.tan(theta / 2))
        d = r / math.tan(theta / 2)
        t1 = (p1[0] + u1[0] * d, p1[1] + u1[1] * d)
        t2 = (p1[0] + u2[0] * d, p1[1] + u2[1] * d)
        bis = (u1[0] + u2[0], u1[1] + u2[1])
        bl = math.hypot(*bis) or 1.0
        cdist = r / math.sin(theta / 2)
        c = (p1[0] + bis[0] / bl * cdist, p1[1] + bis[1] / bl * cdist)
        a1 = math.degrees(math.atan2(t1[1] - c[1], t1[0] - c[0]))
        a2 = math.degrees(math.atan2(t2[1] - c[1], t2[0] - c[0]))
        da = (a2 - a1 + 540) % 360 - 180  # the short way round
        prims.append(line(cur, t1))
        prims.append(arc(c, r, a1, a1 + da))
        cur = t2
    prims.append(line(cur, pts[-1]))
    return prims


@dataclass
class Stroke:
    prims: list[Prim]
    closed: bool = False
    wmul: float = 1.0  # width multiplier (dots are a little heavier than stems)
    tag: str = ""  # svg class, e.g. "mark dot"


@dataclass
class Metrics:
    w: float  # stroke width

    @property
    def hw(self):
        return self.w / 2

    @property
    def rv(self):  # skeleton radius of a lowercase bowl
        return (XH - self.w) / 2

    @property
    def ra(self):  # horizontal skeleton radius of a bowl: heavy weights widen so the counter stays open
        return self.rv + 0.5 * max(0.0, self.w - 78)

    @property
    def rho(self):  # fillet radius for corners
        return max(self.hw + 8, 0.14 * XH)

    @property
    def sb(self):  # sidebearing
        return 28 + 0.22 * self.w

    @property
    def mark_gap(self):
        return 0.13 * XH + 0.3 * self.w


# --------------------------------------------------------------------------------------------------------------
# Glyph recipes. Coordinates are centrelines; the left ink edge is normalised afterwards.
# --------------------------------------------------------------------------------------------------------------

GLYPHS: dict[str, "callable"] = {}
STEM_NOTES: dict[str, str] = {}


def glyph(name, stem: str | None = None):
    def deco(fn):
        GLYPHS[name] = fn
        if stem:
            STEM_NOTES[name] = stem
        return fn

    return deco


def arch(x, m: Metrics):
    """An upside-down horseshoe between x and x + 2 ra: the n."""
    a, b, cy = m.ra, m.rv, XH / 2
    return [line((x, m.hw), (x, cy)), earc((x + a, cy), a, b, 180, 0), line((x + 2 * a, cy), (x + 2 * a, m.hw))]


def bowl(x, m: Metrics, lift=0.0):
    return Stroke(ellipse((x + m.ra, XH / 2 + lift), m.ra, m.rv), closed=True)


BUBBLE_LIFT = round(0.08 * XH)  # b and d float this far above the baseline


@glyph("space")
def g_space(m):
    return []


@glyph("o")
def g_o(m):
    return [bowl(0, m)]


@glyph("n")
def g_n(m):
    return [Stroke(arch(0, m))]


@glyph("u")
def g_u(m):
    a, b, cy = m.ra, m.rv, XH / 2
    return [Stroke([line((0, XH - m.hw), (0, cy)), earc((a, cy), a, b, 180, 360), line((2 * a, cy), (2 * a, XH - m.hw))])]


@glyph("m")
def g_m(m):
    return [Stroke(arch(0, m)), Stroke(arch(2 * m.ra, m))]


@glyph("h", "the top half of a stem: it comes down to the x-height and squiggles back into the shoulder, so the left side never reaches the baseline")
def g_h(m):
    w = 2 * m.ra
    return [Stroke(fillet_path([(0, ASC - m.hw), (0, XH - m.hw), (w, XH - m.hw), (w, m.hw)], [0.45 * m.rv, m.rv]))]


@glyph("b", "a short stem from the ascender to half the x-height; the bubble floats above the baseline")
def g_b(m):
    return [Stroke([line((0, ASC - m.hw), (0, XH / 2 + BUBBLE_LIFT))]), bowl(0, m, BUBBLE_LIFT)]


@glyph("d", "mirror of b: a short stem on the right, the bubble floats")
def g_d(m):
    return [bowl(0, m, BUBBLE_LIFT), Stroke([line((2 * m.ra, ASC - m.hw), (2 * m.ra, XH / 2 + BUBBLE_LIFT))])]


@glyph("p", "a stem from the x-height into the descender; the bowl sits on the baseline")
def g_p(m):
    return [bowl(0, m), Stroke([line((0, XH - m.hw), (0, DESC + m.hw))])]


@glyph("q", "mirror of p")
def g_q(m):
    return [bowl(0, m), Stroke([line((2 * m.ra, XH - m.hw), (2 * m.ra, DESC + m.hw))])]


@glyph("a", "single-storey: a bowl and a right stroke from the x-height to the baseline")
def g_a(m):
    return [bowl(0, m), Stroke([line((2 * m.ra, XH - m.hw), (2 * m.ra, m.hw))])]


@glyph("c")
def g_c(m):
    return [Stroke([earc((m.ra, XH / 2), m.ra, m.rv, 42, 318)])]


@glyph("e")
def g_e(m):
    a = m.ra
    return [Stroke([earc((a, XH / 2), a, m.rv, 0, 318)]), Stroke([line((0, XH / 2), (2 * a, XH / 2))])]


@glyph("f", "a stem from the hook to the baseline, with a crossbar at the x-height")
def g_f(m):
    rf = 1.3 * m.rho
    return [
        Stroke([arc((rf, ASC - m.hw - rf), rf, 90, 180), line((0, ASC - m.hw - rf), (0, m.hw))]),
        Stroke([line((-0.3 * XH, XH - m.hw), (0.34 * XH, XH - m.hw))]),
    ]


@glyph("g", "single-storey: a bowl and a right stroke that descends and hooks left")
def g_g(m):
    a = m.ra
    rg = 0.8 * m.rv
    yg = DESC + m.hw + rg
    return [bowl(0, m), Stroke([line((2 * a, XH - m.hw), (2 * a, yg)), arc((2 * a - rg, yg), rg, 0, -180)])]


def dot_stroke(x, y_bottom, m: Metrics, tag="mark dot"):
    wm = 1.15 + 8 / m.w
    return Stroke([point((x, y_bottom + m.hw * wm))], wmul=wm, tag=tag)


@glyph("i", "a short stem of x-height under its dot")
def g_i(m):
    return [Stroke([line((0, XH - m.hw), (0, m.hw))]), dot_stroke(0, XH + m.mark_gap, m)]


@glyph("dotlessi", "a short stem of x-height")
def g_dotlessi(m):
    return [Stroke([line((0, XH - m.hw), (0, m.hw))])]


@glyph("j", "a stem from the x-height that descends and hooks left")
def g_j(m):
    rj = 1.3 * m.rho
    yj = DESC + m.hw + rj
    return [Stroke([line((0, XH - m.hw), (0, yj)), arc((-rj, yj), rj, 0, -180)]), dot_stroke(0, XH + m.mark_gap, m)]


@glyph("k", "a full stem; both arms meet it at 42% of the x-height")
def g_k(m):
    xk = 0.8 * XH
    yk = 0.42 * XH
    return [
        Stroke([line((0, ASC - m.hw), (0, m.hw))]),
        Stroke([line((0, yk), (xk * 0.92, XH - m.hw))]),
        Stroke([line((0.3 * xk, yk + 0.3 * (XH - yk)), (xk, m.hw))]),
    ]


@glyph("l", "a full stem that curls right at the baseline")
def g_l(m):
    rho = 1.4 * m.rho
    return [Stroke([line((0, ASC - m.hw), (0, rho + m.hw)), arc((rho, rho + m.hw), rho, 180, 270), line((rho, m.hw), (rho + 0.14 * XH, m.hw))])]


@glyph("r")
def g_r(m):
    """A bit more than half a curve: a tall quarter-ellipse that rises from the baseline and bends over."""
    b = XH - m.w
    a = 0.56 * b
    return [Stroke([earc((a, m.hw), a, b, 180, 62)])]


def s_strokes(height, m: Metrics):
    rs = (height - m.w) / 4
    a = rs + 0.4 * max(0.0, m.w - 78)
    mid = height / 2
    return [Stroke([earc((a, mid + rs), a, rs, 38, 270), earc((a, mid - rs), a, rs, 90, -142)])]


@glyph("s")
def g_s(m):
    return s_strokes(XH, m)


@glyph("t", "a stem above and below the crossbar, curling right at the baseline")
def g_t(m):
    rho = 1.4 * m.rho
    top = XH + 0.42 * (ASC - XH)
    return [
        Stroke([line((0, top - m.hw), (0, rho + m.hw)), arc((rho, rho + m.hw), rho, 180, 270), line((rho, m.hw), (rho + 0.1 * XH, m.hw))]),
        Stroke([line((-0.3 * XH, XH - m.hw), (0.36 * XH, XH - m.hw))]),
    ]


@glyph("v")
def g_v(m):
    xv = 0.95 * XH
    return [Stroke(fillet_path([(0, XH - m.hw), (xv / 2, m.hw), (xv, XH - m.hw)], m.rho))]


@glyph("w")
def g_w(m):
    xw = 1.5 * XH
    return [Stroke(fillet_path([(0, XH - m.hw), (xw / 4, m.hw), (xw / 2, 0.74 * XH), (3 * xw / 4, m.hw), (xw, XH - m.hw)], m.rho))]


@glyph("x")
def g_x(m):
    xx = 0.9 * XH
    return [Stroke([line((0, XH - m.hw), (xx, m.hw))]), Stroke([line((0, m.hw), (xx, XH - m.hw))])]


@glyph("y", "the right arm continues below the baseline and hooks left")
def g_y(m):
    xy = 0.95 * XH
    rho = 1.3 * m.rho
    yb = DESC + m.hw + rho
    x0, y0 = xy, XH - m.hw
    x1, y1 = xy / 2, m.hw
    t = (yb - y0) / (y1 - y0)
    xb = x0 + (x1 - x0) * t
    return [
        Stroke([line((0, XH - m.hw), (xy / 2, m.hw))]),
        Stroke([line((x0, y0), (xb, yb)), arc((xb - rho, yb), rho, 0, -180)]),
    ]


@glyph("z")
def g_z(m):
    xz = 0.85 * XH
    return [Stroke(fillet_path([(0, XH - m.hw), (xz, XH - m.hw), (0, m.hw), (xz, m.hw)], 0.7 * m.rho))]


# ---- capitals -------------------------------------------------------------------------------------------------

WC = round(CAP / PHI)  # 433: the ink width of H, N, U and friends


def cap_w(m: Metrics):
    return WC - m.w


def half_stadium(x0, x1, ytop, ybot):
    r = (ytop - ybot) / 2
    return [line((x0, ytop), (x1, ytop)), arc((x1, ybot + r), r, 90, -90), line((x1, ybot), (x0, ybot))]


def cap_ellipse(m: Metrics, wmul=0.8):
    a = (wmul * CAP - m.w) / 2
    b = (CAP - m.w) / 2
    return (a, CAP / 2), a, b


@glyph("A")
def g_A(m):
    ws = cap_w(m) + 60
    ya = CAP / PHI**2
    return [Stroke(fillet_path([(0, m.hw), (ws / 2, CAP - m.hw), (ws, m.hw)], 1.3 * m.rho)), Stroke([line((0.22 * ws, ya), (0.78 * ws, ya))])]


@glyph("B")
def g_B(m):
    ym = 0.53 * CAP
    return [
        Stroke([line((0, m.hw), (0, CAP - m.hw))]),
        Stroke(half_stadium(0, 0.14 * CAP, CAP - m.hw, ym)),
        Stroke(half_stadium(0, 0.17 * CAP, ym, m.hw)),
    ]


@glyph("C")
def g_C(m):
    c, a, b = cap_ellipse(m)
    return [Stroke([earc(c, a, b, 40, 320)])]


@glyph("D")
def g_D(m):
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke(half_stadium(0, 0.16 * CAP, CAP - m.hw, m.hw))]


@glyph("E")
def g_E(m):
    xe = 0.46 * CAP
    return [
        Stroke([line((0, m.hw), (0, CAP - m.hw))]),
        Stroke([line((0, CAP - m.hw), (xe, CAP - m.hw))]),
        Stroke([line((0, CAP / 2), (0.86 * xe, CAP / 2))]),
        Stroke([line((0, m.hw), (xe, m.hw))]),
    ]


@glyph("F")
def g_F(m):
    xe = 0.46 * CAP
    return [
        Stroke([line((0, m.hw), (0, CAP - m.hw))]),
        Stroke([line((0, CAP - m.hw), (xe, CAP - m.hw))]),
        Stroke([line((0, CAP / 2), (0.86 * xe, CAP / 2))]),
    ]


@glyph("G")
def g_G(m):
    c, a, b = cap_ellipse(m)
    return [Stroke([earc(c, a, b, 40, 360)]), Stroke([line((c[0] + 0.1 * a, CAP / 2), (c[0] + a, CAP / 2))])]


@glyph("H")
def g_H(m):
    w = cap_w(m)
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((w, m.hw), (w, CAP - m.hw))]), Stroke([line((0, CAP / 2), (w, CAP / 2))])]


@glyph("I")
def g_I(m):
    s = 0.15 * CAP
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((-s, CAP - m.hw), (s, CAP - m.hw))]), Stroke([line((-s, m.hw), (s, m.hw))])]


@glyph("J")
def g_J(m):
    rj = 0.2 * CAP
    yj = m.hw + rj
    return [Stroke([line((0, CAP - m.hw), (0, yj)), arc((-rj, yj), rj, 0, -180)])]


@glyph("K")
def g_K(m):
    xk = 0.52 * CAP
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((0, 0.46 * CAP), (xk, CAP - m.hw))]), Stroke([line((0.3 * xk, 0.46 * CAP + 0.3 * (CAP - 0.46 * CAP)), (xk * 1.05, m.hw))])]


@glyph("L")
def g_L(m):
    return [Stroke([line((0, CAP - m.hw), (0, m.hw))]), Stroke([line((0, m.hw), (0.44 * CAP, m.hw))])]


@glyph("M")
def g_M(m):
    wm = 0.82 * CAP
    return [
        Stroke([line((0, m.hw), (0, CAP - m.hw))]),
        Stroke([line((wm, m.hw), (wm, CAP - m.hw))]),
        Stroke(fillet_path([(0, CAP - m.hw), (wm / 2, 0.3 * CAP), (wm, CAP - m.hw)], m.rho)),
    ]


@glyph("N")
def g_N(m):
    w = cap_w(m)
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((w, m.hw), (w, CAP - m.hw))]), Stroke([line((0, CAP - m.hw), (w, m.hw))])]


@glyph("O")
def g_O(m):
    c, a, b = cap_ellipse(m)
    return [Stroke(ellipse(c, a, b), closed=True)]


@glyph("P")
def g_P(m):
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke(half_stadium(0, 0.15 * CAP, CAP - m.hw, CAP / 2))]


@glyph("Q")
def g_Q(m):
    c, a, b = cap_ellipse(m)
    return [Stroke(ellipse(c, a, b), closed=True), Stroke([line((c[0] + 0.25 * a, c[1] - 0.62 * b), (c[0] + 0.95 * a, -0.09 * CAP))])]


@glyph("R")
def g_R(m):
    xp = 0.15 * CAP
    rp = (CAP / 2 - m.hw) / 2
    return [
        Stroke([line((0, m.hw), (0, CAP - m.hw))]),
        Stroke(half_stadium(0, xp, CAP - m.hw, CAP / 2)),
        Stroke([line((xp + 0.35 * rp, CAP / 2), (xp + 1.9 * rp, m.hw))]),
    ]


@glyph("S")
def g_S(m):
    return s_strokes(CAP, m)


@glyph("T")
def g_T(m):
    wt = 0.68 * CAP
    return [Stroke([line((0, CAP - m.hw), (wt, CAP - m.hw))]), Stroke([line((wt / 2, CAP - m.hw), (wt / 2, m.hw))])]


@glyph("U")
def g_U(m):
    r = cap_w(m) / 2
    cy = r + m.hw
    return [Stroke([line((0, CAP - m.hw), (0, cy)), arc((r, cy), r, 180, 360), line((2 * r, cy), (2 * r, CAP - m.hw))])]


@glyph("V")
def g_V(m):
    wv = cap_w(m) + 60
    return [Stroke(fillet_path([(0, CAP - m.hw), (wv / 2, m.hw), (wv, CAP - m.hw)], 1.3 * m.rho))]


@glyph("W")
def g_W(m):
    ww = 0.95 * CAP
    return [Stroke(fillet_path([(0, CAP - m.hw), (ww / 4, m.hw), (ww / 2, 0.7 * CAP), (3 * ww / 4, m.hw), (ww, CAP - m.hw)], m.rho))]


@glyph("X")
def g_X(m):
    w = cap_w(m)
    return [Stroke([line((0, CAP - m.hw), (w, m.hw))]), Stroke([line((0, m.hw), (w, CAP - m.hw))])]


@glyph("Y")
def g_Y(m):
    w = cap_w(m)
    return [Stroke([line((0, CAP - m.hw), (w / 2, CAP / 2))]), Stroke([line((w, CAP - m.hw), (w / 2, CAP / 2))]), Stroke([line((w / 2, CAP / 2), (w / 2, m.hw))])]


@glyph("Z")
def g_Z(m):
    w = cap_w(m)
    return [Stroke(fillet_path([(0, CAP - m.hw), (w, CAP - m.hw), (0, m.hw), (w, m.hw)], 0.7 * m.rho))]


# ---- digits ----------------------------------------------------------------------------------------------------

DW = 0.56 * CAP


@glyph("zero")
def g_0(m):
    a = (DW - m.w) / 2
    b = (CAP - m.w) / 2
    return [Stroke(ellipse((a, CAP / 2), a, b), closed=True)]


@glyph("one")
def g_1(m):
    x0 = 0.22 * CAP
    return [Stroke([line((0, CAP - m.hw - 0.2 * CAP), (x0, CAP - m.hw))]), Stroke([line((x0, CAP - m.hw), (x0, m.hw))])]


def tangent_angle(c, r, cw: bool, target, a_lo, a_hi):
    """End angle on a circle so the tangent there points at `target` (bisection)."""
    cx, cy = c
    tx, ty = target

    def miss(a):
        ar = math.radians(a)
        px, py = cx + r * math.cos(ar), cy + r * math.sin(ar)
        tan = (math.sin(ar), -math.cos(ar)) if cw else (-math.sin(ar), math.cos(ar))
        return tan[0] * (ty - py) - tan[1] * (tx - px)

    lo, hi = a_lo, a_hi
    flo = miss(lo)
    for _ in range(40):
        mid = (lo + hi) / 2
        fm = miss(mid)
        if (fm > 0) == (flo > 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return (lo + hi) / 2


@glyph("two")
def g_2(m):
    w2 = DW - m.w
    r2 = w2 / 2
    c = (r2, CAP - m.hw - r2)
    a_end = tangent_angle(c, r2, True, (0, m.hw), -10, -80)
    ar = math.radians(a_end)
    p_end = (c[0] + r2 * math.cos(ar), c[1] + r2 * math.sin(ar))
    return [Stroke([arc(c, r2, 160, a_end), line(p_end, (0, m.hw))]), Stroke([line((0, m.hw), (w2, m.hw))])]


@glyph("three")
def g_3(m):
    r = (CAP - m.w) / 4
    return [Stroke([arc((r, CAP - m.hw - r), r, 150, -90)]), Stroke([arc((r, m.hw + r), r, 90, -140)])]


@glyph("four")
def g_4(m):
    w4 = DW - m.w
    x4 = 0.64 * w4
    y4 = 0.3 * CAP
    return [Stroke([line((x4, CAP - m.hw), (0, y4))]), Stroke([line((0, y4), (w4, y4))]), Stroke([line((x4, CAP - m.hw), (x4, m.hw))])]


@glyph("five")
def g_5(m):
    w5 = DW - m.w
    r5 = 0.56 * w5
    yc = m.hw + r5
    return [
        Stroke([line((0, CAP - m.hw), (w5, CAP - m.hw))]),
        Stroke([line((0, CAP - m.hw), (0, yc + 0.5 * r5))]),
        Stroke([arc((r5 * 0.9, yc), r5, 150, -130)]),
    ]


@glyph("six")
def g_6(m):
    r = (DW - m.w) / 2
    b = CAP - 2 * m.hw - r
    return [Stroke(circle((r, m.hw + r), r), closed=True), Stroke([earc((r, m.hw + r), r, b, 180, 60)])]


@glyph("seven")
def g_7(m):
    w7 = DW - m.w
    return [Stroke([line((0, CAP - m.hw), (w7, CAP - m.hw))]), Stroke([line((w7, CAP - m.hw), (0.28 * w7, m.hw))])]


@glyph("eight")
def g_8(m):
    rt = (CAP - m.w) / 4 * 0.92
    rb = (CAP - m.w) / 2 - rt
    return [Stroke(circle((rb, CAP - m.hw - rt), rt), closed=True), Stroke(circle((rb, m.hw + rb), rb), closed=True)]


@glyph("nine")
def g_9(m):
    r = (DW - m.w) / 2
    b = CAP - 2 * m.hw - r
    return [Stroke(circle((r, CAP - m.hw - r), r), closed=True), Stroke([earc((r, CAP - m.hw - r), r, b, 0, -120)])]


# ---- punctuation -------------------------------------------------------------------------------------------------


@glyph("period")
def g_period(m):
    return [dot_stroke(0, 0, m, tag="dot")]


@glyph("comma")
def g_comma(m):
    return [dot_stroke(0, 0, m, tag="dot"), Stroke([line((0, m.hw * 0.9), (-0.08 * XH, -0.28 * XH))])]


@glyph("colon")
def g_colon(m):
    return [dot_stroke(0, 0, m, tag="dot"), dot_stroke(0, XH - 2.5 * m.hw - 10, m, tag="dot")]


@glyph("semicolon")
def g_semicolon(m):
    return g_comma(m) + [dot_stroke(0, XH - 2.5 * m.hw - 10, m, tag="dot")]


@glyph("exclam")
def g_exclam(m):
    return [Stroke([line((0, CAP - m.hw), (0, 0.36 * CAP))]), dot_stroke(0, 0, m, tag="dot")]


@glyph("question")
def g_question(m):
    rq = 0.2 * CAP
    return [Stroke([arc((rq, CAP - m.hw - rq), rq, 180, -90), line((rq, CAP - m.hw - 2 * rq), (rq, 0.36 * CAP))]), dot_stroke(rq, 0, m, tag="dot")]


@glyph("hyphen")
def g_hyphen(m):
    return [Stroke([line((0, XH / 2), (0.5 * XH, XH / 2))])]


@glyph("endash")
def g_endash(m):
    return [Stroke([line((0, XH / 2), (0.85 * XH, XH / 2))])]


@glyph("emdash")
def g_emdash(m):
    return [Stroke([line((0, XH / 2), (1.6 * XH, XH / 2))])]


@glyph("underscore")
def g_underscore(m):
    return [Stroke([line((0, -m.hw - 20), (1.1 * XH, -m.hw - 20))])]


@glyph("parenleft")
def g_parenleft(m):
    a = 0.3 * CAP
    b = (CAP - DESC) / 2 - m.hw
    return [Stroke([earc((a, (CAP + DESC) / 2), a, b, 112, 248)])]


@glyph("parenright")
def g_parenright(m):
    a = 0.3 * CAP
    b = (CAP - DESC) / 2 - m.hw
    return [Stroke([earc((0, (CAP + DESC) / 2), a, b, 68, -68)])]


@glyph("slash")
def g_slash(m):
    return [Stroke([line((0, DESC + m.hw), (0.5 * CAP, CAP - m.hw))])]


@glyph("plus")
def g_plus(m):
    s = 0.3 * CAP
    cy = 0.46 * CAP
    return [Stroke([line((0, cy), (2 * s, cy))]), Stroke([line((s, cy - s), (s, cy + s))])]


@glyph("equal")
def g_equal(m):
    s = 0.3 * CAP
    cy = 0.46 * CAP
    return [Stroke([line((0, cy - 0.45 * s), (2 * s, cy - 0.45 * s))]), Stroke([line((0, cy + 0.45 * s), (2 * s, cy + 0.45 * s))])]


@glyph("quotesingle")
def g_quotesingle(m):
    return [Stroke([line((0, CAP - m.hw), (0, CAP - m.hw - 0.2 * CAP))])]


@glyph("quotedbl")
def g_quotedbl(m):
    d = 0.11 * CAP
    return [Stroke([line((0, CAP - m.hw), (0, CAP - m.hw - 0.2 * CAP))]), Stroke([line((d, CAP - m.hw), (d, CAP - m.hw - 0.2 * CAP))])]


@glyph("quoteright")
def g_quoteright(m):
    y = CAP - 0.2 * CAP
    return [dot_stroke(0, y, m, tag="dot"), Stroke([line((0, y + m.hw), (-0.07 * XH, y - 0.22 * XH))])]


@glyph("quoteleft")
def g_quoteleft(m):
    y = CAP - 0.2 * CAP - 0.3 * XH
    return [dot_stroke(0, y, m, tag="dot"), Stroke([line((0, y + m.hw), (0.07 * XH, CAP - m.hw))])]


@glyph("ampersand")
def g_ampersand(m):
    r = (CAP - m.w) / 4
    return [
        Stroke([arc((r, CAP - m.hw - r), r, 20, 270), line((r, CAP / 2), (1.9 * r, m.hw + 0.4 * r))]),
        Stroke(circle((r * 1.15, m.hw + r * 1.15), r * 1.15), closed=True),
        Stroke([line((2.3 * r, CAP * 0.4), (1.4 * r, m.hw + 0.1 * r))]),
    ]


@glyph("at")
def g_at(m):
    r = 0.9 * m.rv
    R = (CAP * 0.78 - m.w) / 2
    c = (R, CAP * 0.42)
    return [
        Stroke(circle((c[0], c[1]), r), closed=True),
        Stroke([line((c[0] + r, c[1] + r), (c[0] + r, c[1] - 0.4 * r)), arc((c[0] + 2 * r, c[1] - 0.4 * r), r, 180, 300)]),
        Stroke([arc(c, R, -40, 260)]),
    ]


@glyph("numbersign")
def g_numbersign(m):
    s = 0.5 * CAP
    return [
        Stroke([line((0.08 * s, 0.33 * CAP), (s, 0.33 * CAP))]), Stroke([line((0, 0.62 * CAP), (0.92 * s, 0.62 * CAP))]),
        Stroke([line((0.4 * s, m.hw), (0.52 * s, CAP - m.hw))]), Stroke([line((0.72 * s, m.hw), (0.84 * s, CAP - m.hw))]),
    ]


@glyph("percent")
def g_percent(m):
    r = 0.14 * CAP
    return [
        Stroke(circle((r, CAP - m.hw - r), r), closed=True),
        Stroke(circle((0.5 * CAP - r, m.hw + r), r), closed=True),
        Stroke([line((0.05 * CAP, m.hw), (0.45 * CAP, CAP - m.hw))]),
    ]


@glyph("asterisk")
def g_asterisk(m):
    c = (0.16 * CAP, CAP - 0.16 * CAP)
    s = 0.15 * CAP
    out = []
    for k in range(3):
        a = math.radians(90 + 60 * k)
        out.append(Stroke([line((c[0] - s * math.cos(a), c[1] - s * math.sin(a)), (c[0] + s * math.cos(a), c[1] + s * math.sin(a)))]))
    return out


@glyph("dollar")
def g_dollar(m):
    return s_strokes(CAP, m) + [Stroke([line(((CAP - m.w) / 4, CAP + 0.05 * CAP), ((CAP - m.w) / 4, -0.05 * CAP))])]


# ---- marks ---------------------------------------------------------------------------------------------------------


def mark_strokes(kind: str, cx: float, ybase: float, m: Metrics) -> list[Stroke]:
    """Diacritic strokes centred on cx with their ink bottom at ybase."""
    hw = m.hw
    if kind == "dot":
        return [dot_stroke(cx, ybase, m)]
    if kind == "dieresis":
        d = 0.2 * XH + 0.35 * m.w
        return [dot_stroke(cx - d, ybase, m, tag="mark dieresis"), dot_stroke(cx + d, ybase, m, tag="mark dieresis")]
    if kind == "tilde":
        a = 0.17 * XH
        b = max(0.5 * hw + 6, 14)
        ym = ybase + hw + b
        return [Stroke([earc((cx - a, ym), a, b, 225, 0), earc((cx + a, ym), a, b, 180, 315)], tag="mark tilde")]
    if kind == "circumflex":
        dc = 0.2 * XH
        hc = 0.13 * XH + 0.3 * m.w
        return [Stroke(fillet_path([(cx - dc, ybase + hw), (cx, ybase + hw + hc), (cx + dc, ybase + hw)], 0.7 * m.rho), tag="mark circumflex")]
    if kind == "caron":
        dc = 0.2 * XH
        hc = 0.13 * XH + 0.3 * m.w
        return [Stroke(fillet_path([(cx - dc, ybase + hw + hc), (cx, ybase + hw), (cx + dc, ybase + hw + hc)], 0.7 * m.rho), tag="mark caron")]
    if kind == "ring":
        rr = max(hw + 6, 0.08 * XH)
        return [Stroke(circle((cx, ybase + hw + rr), rr), closed=True, tag="mark ring")]
    if kind == "acute":
        return [Stroke([line((cx - 0.05 * XH, ybase + hw), (cx + 0.11 * XH, ybase + hw + 0.15 * XH))], tag="mark acute")]
    if kind == "grave":
        return [Stroke([line((cx + 0.05 * XH, ybase + hw), (cx - 0.11 * XH, ybase + hw + 0.15 * XH))], tag="mark grave")]
    if kind == "commabelow":
        y = -hw - 18
        return [dot_stroke(cx, y - m.hw * 2.5, m, tag="mark comma"), Stroke([line((cx, y - m.hw * 1.6), (cx - 0.07 * XH, y - 0.26 * XH))], tag="mark comma")]
    if kind == "cedilla":
        y = -hw - 10
        return [Stroke([line((cx, y), (cx, y - 0.1 * XH)), arc((cx - 0.07 * XH, y - 0.1 * XH - 0.07 * XH), 0.07 * XH, 0, -150)], tag="mark cedilla")]
    raise KeyError(kind)


COMPOSITES = {
    "edotaccent": ("e", "dot"), "cdotaccent": ("c", "dot"),
    "ntilde": ("n", "tilde"), "utilde": ("u", "tilde"), "etilde": ("e", "tilde"), "atilde": ("a", "tilde"), "otilde": ("o", "tilde"),
    "udieresis": ("u", "dieresis"), "edieresis": ("e", "dieresis"), "adieresis": ("a", "dieresis"), "odieresis": ("o", "dieresis"), "idieresis": ("dotlessi", "dieresis"),
    "icircumflex": ("dotlessi", "circumflex"), "ecircumflex": ("e", "circumflex"), "wcircumflex": ("w", "circumflex"), "acircumflex": ("a", "circumflex"), "ocircumflex": ("o", "circumflex"), "ucircumflex": ("u", "circumflex"),
    "scaron": ("s", "caron"), "rcaron": ("r", "caron"), "ecaron": ("e", "caron"), "ncaron": ("n", "caron"), "ccaron": ("c", "caron"), "zcaron": ("z", "caron"),
    "uring": ("u", "ring"), "aring": ("a", "ring"),
    "eacute": ("e", "acute"), "aacute": ("a", "acute"), "iacute": ("dotlessi", "acute"), "oacute": ("o", "acute"), "uacute": ("u", "acute"),
    "egrave": ("e", "grave"), "agrave": ("a", "grave"), "igrave": ("dotlessi", "grave"), "ograve": ("o", "grave"), "ugrave": ("u", "grave"),
    "tcommaaccent": ("t", "commabelow"), "scommaaccent": ("s", "commabelow"), "ccedilla": ("c", "cedilla"),
    "Edieresis": ("E", "dieresis"), "Ecircumflex": ("E", "circumflex"), "Ntilde": ("N", "tilde"), "Udieresis": ("U", "dieresis"), "Adieresis": ("A", "dieresis"), "Odieresis": ("O", "dieresis"),
    "Eacute": ("E", "acute"), "Aacute": ("A", "acute"), "Oacute": ("O", "acute"), "Uacute": ("U", "acute"), "Iacute": ("I", "acute"), "Egrave": ("E", "grave"), "Agrave": ("A", "grave"),
    "Scaron": ("S", "caron"), "Zcaron": ("Z", "caron"), "Rcaron": ("R", "caron"), "Ccaron": ("C", "caron"), "Aring": ("A", "ring"), "Ccedilla": ("C", "cedilla"), "Edotaccent": ("E", "dot"), "Acircumflex": ("A", "circumflex"), "Ocircumflex": ("O", "circumflex"),
}

CMAP = {
    "space": 0x20, "exclam": 0x21, "quotedbl": 0x22, "numbersign": 0x23, "dollar": 0x24, "percent": 0x25, "ampersand": 0x26, "quotesingle": 0x27,
    "parenleft": 0x28, "parenright": 0x29, "asterisk": 0x2A, "plus": 0x2B, "comma": 0x2C, "hyphen": 0x2D, "period": 0x2E, "slash": 0x2F,
    "zero": 0x30, "one": 0x31, "two": 0x32, "three": 0x33, "four": 0x34, "five": 0x35, "six": 0x36, "seven": 0x37, "eight": 0x38, "nine": 0x39,
    "colon": 0x3A, "semicolon": 0x3B, "equal": 0x3D, "question": 0x3F, "at": 0x40, "underscore": 0x5F,
    "endash": 0x2013, "emdash": 0x2014, "quoteleft": 0x2018, "quoteright": 0x2019,
    "dotlessi": 0x131,
    "edotaccent": 0x117, "cdotaccent": 0x10B, "ntilde": 0xF1, "utilde": 0x169, "etilde": 0x1EBD, "atilde": 0xE3, "otilde": 0xF5,
    "udieresis": 0xFC, "edieresis": 0xEB, "adieresis": 0xE4, "odieresis": 0xF6, "idieresis": 0xEF,
    "icircumflex": 0xEE, "ecircumflex": 0xEA, "wcircumflex": 0x175, "acircumflex": 0xE2, "ocircumflex": 0xF4, "ucircumflex": 0xFB,
    "scaron": 0x161, "rcaron": 0x159, "ecaron": 0x11B, "ncaron": 0x148, "ccaron": 0x10D, "zcaron": 0x17E,
    "uring": 0x16F, "aring": 0xE5,
    "eacute": 0xE9, "aacute": 0xE1, "iacute": 0xED, "oacute": 0xF3, "uacute": 0xFA, "egrave": 0xE8, "agrave": 0xE0, "igrave": 0xEC, "ograve": 0xF2, "ugrave": 0xF9,
    "tcommaaccent": 0x21B, "scommaaccent": 0x219, "ccedilla": 0xE7,
    "Edieresis": 0xCB, "Ecircumflex": 0xCA, "Ntilde": 0xD1, "Udieresis": 0xDC, "Adieresis": 0xC4, "Odieresis": 0xD6,
    "Eacute": 0xC9, "Aacute": 0xC1, "Oacute": 0xD3, "Uacute": 0xDA, "Iacute": 0xCD, "Egrave": 0xC8, "Agrave": 0xC0,
    "Scaron": 0x160, "Zcaron": 0x17D, "Rcaron": 0x158, "Ccaron": 0x10C, "Aring": 0xC5, "Ccedilla": 0xC7, "Edotaccent": 0x116, "Acircumflex": 0xC2, "Ocircumflex": 0xD4,
    "ae": 0xE6, "oe": 0x153, "eth": 0xF0, "lslash": 0x142, "oslash": 0xF8, "AE": 0xC6, "OE": 0x152, "Lslash": 0x141, "Oslash": 0xD8,
}
for ch in "abcdefghijklmnopqrstuvwxyz":
    CMAP[ch] = ord(ch)
for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    CMAP[ch] = ord(ch)


def translate(strokes: list[Stroke], dx: float, dy: float = 0.0) -> list[Stroke]:
    return [Stroke([p.shifted(dx, dy) for p in s.prims], s.closed, s.wmul, s.tag) for s in strokes]


@glyph("ae")
def g_ae(m):
    return g_a(m) + translate(g_e(m), 2 * m.ra)


@glyph("oe")
def g_oe(m):
    return g_o(m) + translate(g_e(m), 2 * m.ra)


@glyph("eth")
def g_eth(m):
    r = m.ra
    b = 0.62 * ASC
    return [
        bowl(0, m),
        Stroke([earc((r, XH / 2), r, b, 0, 78)]),
        Stroke([line((1.3 * r, XH / 2 + 0.72 * b), (2.15 * r, XH / 2 + 0.95 * b))]),
    ]


@glyph("lslash", "a full stem that curls right at the baseline, with the bar across it")
def g_lslash(m):
    return g_l(m) + [Stroke([line((-0.17 * XH, 0.42 * XH), (0.17 * XH, 0.66 * XH))])]


@glyph("oslash")
def g_oslash(m):
    a, r = m.ra, m.rv
    return g_o(m) + [Stroke([line((a - 0.85 * a, XH / 2 - 1.15 * r), (a + 0.85 * a, XH / 2 + 1.15 * r))])]


@glyph("AE")
def g_AE(m):
    ws = cap_w(m) + 60
    ya = CAP / PHI**2
    xe = ws / 2 + 0.1 * CAP
    return [Stroke([line((0, m.hw), (xe, CAP - m.hw))]), Stroke([line((0.22 * ws, ya), (xe, ya))])] + translate(g_E(m), xe)


@glyph("OE")
def g_OE(m):
    c, a, b = cap_ellipse(m, 0.7)
    return [Stroke(ellipse(c, a, b), closed=True)] + translate(g_E(m), 2 * a)


@glyph("Lslash")
def g_Lslash(m):
    return g_L(m) + [Stroke([line((-0.12 * CAP, 0.3 * CAP), (0.12 * CAP, 0.5 * CAP))])]


@glyph("Oslash")
def g_Oslash(m):
    c, a, b = cap_ellipse(m)
    return g_O(m) + [Stroke([line((c[0] - 0.75 * a, c[1] - 0.95 * b), (c[0] + 0.75 * a, c[1] + 0.95 * b))])]


# --------------------------------------------------------------------------------------------------------------
# Stroking: skeletons to quadratic outlines with a fixed point structure
# --------------------------------------------------------------------------------------------------------------

Pt = tuple[float, float, bool]  # x, y, on-curve


def quad_fit(sample, k: int) -> list[Pt]:
    """k quadratic segments through sample(t) for t in [0,1]: on, off, on, off, ..., on (2k + 1 points).
    The control point is set so the curve passes through the sampled midpoint of each segment."""
    pts: list[Pt] = []
    for i in range(k):
        p0 = sample(i / k)
        pm = sample((i + 0.5) / k)
        p2 = sample((i + 1) / k)
        c = (2 * pm[0] - (p0[0] + p2[0]) / 2, 2 * pm[1] - (p0[1] + p2[1]) / 2)
        if i == 0:
            pts.append((p0[0], p0[1], True))
        pts.append((c[0], c[1], False))
        pts.append((p2[0], p2[1], True))
    return pts


def side_points(prim: Prim, side: float, hw: float, reverse: bool) -> list[Pt]:
    """Offset curve of one primitive on one side (+1 left of travel, -1 right)."""

    def sample(t):
        if reverse:
            t = 1 - t
        p, tg = prim.eval(t)
        return (p[0] - tg[1] * hw * side, p[1] + tg[0] * hw * side)

    if prim.kind == "line":
        a, b = sample(0), sample(1)
        return [(a[0], a[1], True), (b[0], b[1], True)]
    return quad_fit(sample, prim.k)


def cap_points(p, t, n, hw, k: int) -> list[Pt]:
    """Superellipse end from p + hw*n, bulging along t, to p - hw*n; endpoints excluded."""

    def sample(u):
        th = math.pi / 2 - math.pi * u
        cs, sn = math.cos(th), math.sin(th)
        ex = math.copysign(abs(cs) ** (2 / CAP_K), cs)
        ey = math.copysign(abs(sn) ** (2 / CAP_K), sn)
        return (p[0] + hw * (t[0] * ex + n[0] * ey), p[1] + hw * (t[1] * ex + n[1] * ey))

    return quad_fit(sample, k)[1:-1]


def squircle_points(c, hw, k: int) -> list[Pt]:
    def sample(u):
        th = 2 * math.pi * u + math.pi / 2
        cs, sn = math.cos(th), math.sin(th)
        ex = math.copysign(abs(cs) ** (2 / CAP_K), cs)
        ey = math.copysign(abs(sn) ** (2 / CAP_K), sn)
        return (c[0] + hw * ex, c[1] + hw * ey)

    return quad_fit(sample, k)[:-1]


def join(a: list[Pt], b: list[Pt]) -> list[Pt]:
    """Append b to a, dropping b's first point (it coincides structurally with a's last)."""
    return a + b[1:]


CAP_SEGS = 4
DOT_SEGS = 8


def stroke_contours(s: Stroke, m: Metrics) -> list[list[Pt]]:
    hw = m.hw * s.wmul
    if len(s.prims) == 1 and s.prims[0].kind == "point":
        (c,), = (s.prims[0].data,)
        return [squircle_points(c, hw, DOT_SEGS)]
    left: list[Pt] = []
    right_rev: list[Pt] = []
    for p in s.prims:
        lp = side_points(p, +1, hw, False)
        left = join(left, lp) if left else lp
    for p in reversed(s.prims):
        rp = side_points(p, -1, hw, True)
        right_rev = join(right_rev, rp) if right_rev else rp
    if s.closed:
        return [left[:-1], right_rev[:-1]]
    p_end, t_end = s.prims[-1].eval(1.0)
    p_start, t_start = s.prims[0].eval(0.0)
    n_end = (-t_end[1], t_end[0])
    end_cap = cap_points(p_end, t_end, n_end, hw, CAP_SEGS)
    start_cap = cap_points(p_start, (-t_start[0], -t_start[1]), (t_start[1], -t_start[0]), hw, CAP_SEGS)
    return [left + end_cap + right_rev + start_cap]


def signed_area(c: list[Pt]) -> float:
    a = 0.0
    for i in range(len(c)):
        x0, y0 = c[i][0], c[i][1]
        x1, y1 = c[(i + 1) % len(c)][0], c[(i + 1) % len(c)][1]
        a += x0 * y1 - x1 * y0
    return a / 2


def orient(contours: list[list[Pt]], s: Stroke) -> list[list[Pt]]:
    """TrueType: outer contours clockwise (negative area), inner counter-clockwise."""
    if s.closed:
        a, b = contours
        outer, inner = (a, b) if abs(signed_area(a)) >= abs(signed_area(b)) else (b, a)
        if signed_area(outer) > 0:
            outer = outer[::-1]
        if signed_area(inner) < 0:
            inner = inner[::-1]
        return [outer, inner]
    return [c[::-1] if signed_area(c) > 0 else c for c in contours]


def glyph_strokes(name: str, m: Metrics) -> list[Stroke]:
    if name in COMPOSITES:
        base, mark = COMPOSITES[name]
        strokes = glyph_strokes(base, m)
        x0, x1 = skeleton_xrange(strokes, m)
        cx = (x0 + x1) / 2
        ybase = (CAP if base[0].isupper() else XH) + m.mark_gap
        if mark in ("commabelow", "cedilla"):
            ybase = 0
        return strokes + mark_strokes(mark, cx, ybase, m)
    return GLYPHS[name](m)


def skeleton_xrange(strokes, m: Metrics):
    xs = []
    for s in strokes:
        for p in s.prims:
            for i in range(9):
                pt, _ = p.eval(i / 8)
                xs.append(pt[0] - m.hw * s.wmul)
                xs.append(pt[0] + m.hw * s.wmul)
    return (min(xs), max(xs)) if xs else (0.0, 0.0)


def fix_segments(strokes_by_master: list[list[Stroke]], ref_index: int):
    """Give every primitive the segment count of the reference master so all masters stay compatible."""
    ref = strokes_by_master[ref_index]
    for si, s in enumerate(ref):
        for pi, p in enumerate(s.prims):
            k = 1 if p.kind == "line" else max(1, math.ceil(p.span_deg() / SEG_DEG - 1e-6))
            for ms in strokes_by_master:
                ms[si].prims[pi].k = k


REF_INDEX = 2  # medium


def build_glyph_masters(name: str, masters: list[Metrics], slants: list[float]):
    """Per (slant, master): (contours, advance). Contours have identical structure across all of them."""
    strokes_by_master = [glyph_strokes(name, m) for m in masters]
    fix_segments(strokes_by_master, REF_INDEX)
    out = {}
    for slant in slants:
        sh = math.tan(math.radians(slant))
        for mi, (m, strokes) in enumerate(zip(masters, strokes_by_master)):
            contours: list[list[Pt]] = []
            for s in strokes:
                contours += orient(stroke_contours(s, m), s)
            if not contours:
                out[(slant, mi)] = ([], round(0.26 * CAP + 0.3 * m.w))
                continue
            minx = min(p[0] for c in contours for p in c)
            maxx = max(p[0] for c in contours for p in c)
            dx = m.sb - minx
            contours = [[(x + dx + y * sh, y, on) for x, y, on in c] for c in contours]
            out[(slant, mi)] = (contours, round(maxx - minx + 2 * m.sb))
    return out


# --------------------------------------------------------------------------------------------------------------
# Font building
# --------------------------------------------------------------------------------------------------------------

FAMILY = "nu Font"
GLYPH_ORDER = [".notdef", "space"] + [n for n in GLYPHS if n != "space"] + list(COMPOSITES)


def notdef_contours(m: Metrics) -> list[list[Pt]]:
    hw, w = m.hw, m.w
    W = 0.5 * CAP
    outer = [(hw, hw, True), (hw, CAP - hw, True), (W - hw, CAP - hw, True), (W - hw, hw, True)]
    inner = [(hw + w, hw + w, True), (W - hw - w, hw + w, True), (W - hw - w, CAP - hw - w, True), (hw + w, CAP - hw - w, True)]
    return [outer, inner]


def tt_glyph(contours: list[list[Pt]]):
    from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
    from fontTools.ttLib.tables import ttProgram

    g = Glyph()
    g.numberOfContours = len(contours)
    coords, flags, ends = [], [], []
    for c in contours:
        for x, y, on in c:
            coords.append((round(x), round(y)))
            flags.append(1 if on else 0)
        ends.append(len(coords) - 1)
    g.coordinates = GlyphCoordinates(coords)
    g.flags = array("B", flags)
    g.endPtsOfContours = ends
    g.program = ttProgram.Program()
    g.program.fromBytecode(b"")
    return g


def build_fonts(outdir: Path):
    from fontTools.designspaceLib import AxisDescriptor, DesignSpaceDocument, InstanceDescriptor, SourceDescriptor
    from fontTools.fontBuilder import FontBuilder
    from fontTools.ttLib.tables._g_l_y_f import dropImpliedOnCurvePoints
    from fontTools import varLib

    outdir.mkdir(parents=True, exist_ok=True)
    masters = [Metrics(w) for _, _, w in WEIGHTS]
    slants = [0.0, -SLANT_DEG]
    cmap = {cp: n for n, cp in CMAP.items() if n in GLYPH_ORDER}
    keys = [(sl, mi) for sl in slants for mi in range(len(masters))]
    glyph_sets = {k: {} for k in keys}
    metric_sets = {k: {} for k in keys}
    for name in GLYPH_ORDER:
        if name == ".notdef":
            per = {}
            for sl, mi in keys:
                m = masters[mi]
                cs = [[(x + m.sb, y, on) for x, y, on in c] for c in notdef_contours(m)]
                per[(sl, mi)] = (cs, round(0.5 * CAP + 2 * m.sb))
        else:
            per = build_glyph_masters(name, masters, slants)
        glyphs = {k: tt_glyph(per[k][0]) for k in keys}
        if per[keys[0]][0]:
            dropImpliedOnCurvePoints(*glyphs.values())
        for k in keys:
            glyph_sets[k][name] = glyphs[k]
            metric_sets[k][name] = per[k][1]

    paths = {}
    total_points = 0
    for sl, mi in keys:
        wname, wght, _ = WEIGHTS[mi]
        style = f"{wname} Italic" if sl else wname
        ps = f"nuFont-{style.replace(' ', '')}"
        glyphs = glyph_sets[(sl, mi)]
        fb = FontBuilder(UPM, isTTF=True)
        fb.setupGlyphOrder(GLYPH_ORDER)
        fb.setupCharacterMap(cmap)
        fb.setupGlyf(glyphs)
        metrics = {}
        for name, g in glyphs.items():
            lsb = g.xMin if g.numberOfContours else 0
            metrics[name] = (metric_sets[(sl, mi)][name], lsb)
            total_points += len(g.coordinates) if g.numberOfContours else 0
        fb.setupHorizontalMetrics(metrics)
        ymax = max((g.yMax for g in glyphs.values() if g.numberOfContours), default=ASC)
        ymin = min((g.yMin for g in glyphs.values() if g.numberOfContours), default=DESC)
        fb.setupHorizontalHeader(ascent=ASC + 150, descent=DESC - 60, lineGap=0)
        fb.setupNameTable({
            "familyName": FAMILY,
            "styleName": style,
            "uniqueFontIdentifier": f"khensu.nu;{ps};1.0",
            "fullName": f"{FAMILY} {style}",
            "psName": ps,
            "version": "Version 1.000",
            "copyright": "Copyright 2026 Elliott Wave LLC. Shown as ñü.Føňt.",
            "manufacturer": "Elliott Wave LLC",
            "designer": "Elliott",
            "description": "ñü.Føňt: a stroke font on a golden-ratio grid with capsule ends and no stems where a letter can live without one. khensu.nu/font",
            "vendorURL": "https://khensu.nu/font",
            "licenseDescription": "Licensed under the SIL Open Font License, Version 1.1.",
            "licenseInfoURL": "https://openfontlicense.org",
            "typographicFamily": FAMILY,
            "typographicSubfamily": style,
        })
        fb.setupOS2(
            version=4,
            sTypoAscender=ASC + 150, sTypoDescender=DESC - 60, sTypoLineGap=0,
            usWinAscent=max(ASC + 200, ymax + 10), usWinDescent=max(-(DESC - 100), -ymin + 10),
            sxHeight=XH, sCapHeight=CAP, usWeightClass=wght, usWidthClass=5,
            fsType=0, achVendID="EWLL",
            fsSelection=0x80 | (0x20 if wght == 700 and not sl else 0) | (0x01 if sl else 0) | (0x40 if wght == 500 and not sl else 0),
        )
        fb.setupPost(italicAngle=-SLANT_DEG if sl else 0.0)
        fb.font["head"].macStyle = (0x01 if wght == 700 else 0) | (0x02 if sl else 0)
        out = outdir / f"{ps}.ttf"
        fb.save(str(out))
        paths[(wght, sl)] = out

    doc = DesignSpaceDocument()
    doc.addAxis(AxisDescriptor(tag="wght", name="Weight", minimum=100, default=500, maximum=900))
    doc.addAxis(AxisDescriptor(tag="slnt", name="Slant", minimum=-SLANT_DEG, default=0, maximum=0))
    for (wght, sl), p in paths.items():
        doc.addSource(SourceDescriptor(path=str(p), location={"Weight": wght, "Slant": sl}, familyName=FAMILY))
    for wname, wght, _ in WEIGHTS:
        doc.addInstance(InstanceDescriptor(familyName=FAMILY, styleName=wname, location={"Weight": wght, "Slant": 0}))
        doc.addInstance(InstanceDescriptor(familyName=FAMILY, styleName=f"{wname} Italic", location={"Weight": wght, "Slant": -SLANT_DEG}))
    vf, _, _ = varLib.build(doc)
    vpath = outdir / "nuFont-Variable.ttf"
    vf.save(str(vpath))
    from fontTools.ttLib.woff2 import compress

    compress(str(vpath), str(outdir / "nuFont-Variable.woff2"))
    for (wght, sl), p in paths.items():
        compress(str(p), str(p.with_suffix(".woff2")))
    sizes = {p.name: p.stat().st_size for p in sorted(outdir.iterdir()) if p.suffix in (".ttf", ".woff2")}
    info = {
        "family": FAMILY, "glyphs": len(GLYPH_ORDER), "masters": len(keys), "weights": [w[0] for w in WEIGHTS],
        "axes": {"wght": [100, 900], "slnt": [-SLANT_DEG, 0]}, "upm": UPM, "capHeight": CAP, "xHeight": XH, "descender": DESC,
        "pointsPerMasterAvg": round(total_points / len(keys)), "sizes": sizes,
        "stems": STEM_NOTES,
    }
    (outdir / "nufont.json").write_text(json.dumps(info, indent=1, ensure_ascii=False) + "\n")
    print(f"{len(GLYPH_ORDER)} glyphs, {len(keys)} masters, {info['pointsPerMasterAvg']} points per master")
    for k, v in sizes.items():
        print(f"{v:>9,}  {k}")


# --------------------------------------------------------------------------------------------------------------
# SVG export: one <path> per stroke so a dot can pulse on its own
# --------------------------------------------------------------------------------------------------------------


def glyph_name_for(ch: str) -> str:
    cp = ord(ch)
    for n, c in CMAP.items():
        if c == cp and n in GLYPH_ORDER:
            return n
    return ".notdef"


def contour_d(c: list[Pt], dx: float, sh: float) -> str:
    def P(p):
        return f"{p[0] + dx + p[1] * sh:.1f} {-p[1]:.1f}"

    pts = list(c)
    # rotate so the contour starts on an on-curve point
    while not pts[0][2]:
        pts = pts[1:] + pts[:1]
    d = "M" + P(pts[0])
    i = 1
    n = len(pts)
    while i <= n:
        p = pts[i % n]
        if p[2]:
            d += "L" + P(p)
            i += 1
        else:
            q = pts[(i + 1) % n]
            if q[2]:
                d += "Q" + P(p) + " " + P(q)
                i += 2
            else:  # implied on-curve midpoint
                mid = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, True)
                d += "Q" + P(p) + " " + P(mid)
                i += 1
    return d + "Z"


def interpolated_metrics(weight: int) -> Metrics:
    """Stroke width for any weight on the axis, linear between the masters like the variable font."""
    ws = [(wght, w) for _, wght, w in WEIGHTS]
    weight = max(ws[0][0], min(ws[-1][0], weight))
    for (w0, s0), (w1, s1) in zip(ws, ws[1:]):
        if w0 <= weight <= w1:
            t = (weight - w0) / (w1 - w0)
            return Metrics(s0 + (s1 - s0) * t)
    return Metrics(ws[-1][1])


def svg_runs(runs: list[tuple[str, int]], slant: float = 0.0, tracking: float = 0.0, tight: bool = True) -> str:
    """One <path> per stroke for a sequence of (text, weight) runs. Marks carry a class so they can animate alone.
    `tight` crops the viewBox to the ink plus a small margin, which suits a wordmark."""
    masters = [Metrics(w) for _, _, w in WEIGHTS]
    sh = math.tan(math.radians(slant))
    x = 0.0
    paths = []
    ys = []
    ci = 0
    for text, weight in runs:
        m = interpolated_metrics(weight)
        text = unicodedata.normalize("NFC", text)
        for ch in text:
            name = glyph_name_for(ch)
            strokes_by_master = [glyph_strokes(name, mm) for mm in masters]
            fix_segments(strokes_by_master, REF_INDEX)
            strokes = glyph_strokes(name, m)
            for s, ref in zip(strokes, strokes_by_master[REF_INDEX]):
                for p, rp in zip(s.prims, ref.prims):
                    p.k = rp.k
            per_stroke = [orient(stroke_contours(s, m), s) for s in strokes]
            if not per_stroke:
                x += 0.26 * CAP + 0.3 * m.w + tracking
                ci += 1
                continue
            minx = min(p[0] for cs in per_stroke for c in cs for p in c)
            maxx = max(p[0] for cs in per_stroke for c in cs for p in c)
            dx = x + m.sb - minx
            for s, cs in zip(strokes, per_stroke):
                d = "".join(contour_d(c, dx, sh) for c in cs)
                cls = f' class="{s.tag}"' if s.tag else ""
                paths.append(f'<path{cls} data-g="{name}" data-i="{ci}" d="{d}"/>')
                ys += [p[1] for c in cs for p in c]
            x += maxx - minx + 2 * m.sb + tracking
            ci += 1
    width = x
    if tight and ys:
        top, bottom = max(ys) + 24, min(ys) - 24
    else:
        top, bottom = ASC + 170, DESC - 30
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-top:.0f} {width:.0f} {top - bottom:.0f}" '
        f'width="{width:.0f}" height="{top - bottom:.0f}" aria-hidden="true" focusable="false"><g>' + "".join(paths) + "</g></svg>"
    )


def svg_text(text: str, weight: int = 500, slant: float = 0.0, tracking: float = 0.0) -> str:
    return svg_runs([(text, weight)], slant, tracking, tight=False)


# Wordmarks the sites inline. Weights follow the type they replace: the hero sets khėnsu at 600 and .ñü at 300.
MARKS = {
    "khensu": [("khėnsu", 600), (".ñü", 300)],
    "nufont": [("ñü.Føňt", 600)],
}


def write_marks(paths: list[Path]):
    lines = ["// Generated by tools/font/nufont.py marks. Inline SVG wordmarks in ñü.Føňt, one <path> per stroke;", "// diacritics carry class=\"mark …\" so the ė dot can pulse on its own.", "export const MARKS: Record<string, string> = {"]
    for key, runs in MARKS.items():
        svg = svg_runs(runs, tracking=-22)
        lines.append(f"  {key}: {json.dumps(svg, ensure_ascii=False)},")
    lines.append("};")
    lines.append("export const MARK_TEXT: Record<string, string> = " + json.dumps({k: "".join(t for t, _ in v) for k, v in MARKS.items()}, ensure_ascii=False) + ";")
    out = "\n".join(lines) + "\n"
    for p in paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(out)
        print("wrote", p)


def main(argv):
    if len(argv) < 2 or argv[1] == "build":
        build_fonts(Path(argv[2]) if len(argv) > 2 else DIST)
    elif argv[1] == "svg":
        weight = int(argv[3]) if len(argv) > 3 else 500
        svg = svg_text(argv[2], weight, tracking=-18)
        if len(argv) > 4:
            Path(argv[4]).write_text(svg + "\n")
        else:
            print(svg)
    elif argv[1] == "marks":
        write_marks([Path(p) for p in argv[2:]] or [DIST / "nufont-marks.ts"])
    elif argv[1] == "stems":
        for k, v in STEM_NOTES.items():
            print(f"{k}: {v}")
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv)
