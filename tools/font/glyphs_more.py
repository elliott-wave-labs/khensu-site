"""ñü.Føňt, the rest of the repertoire: the remaining ASCII and common symbols, Latin letters beyond the names,
Greek, Cyrillic, and the precomposed letters for Latin Extended-A, Vietnamese, Greek tonos and Cyrillic.
Imported by nufont.py after the core recipes; everything here registers into the same tables."""
from __future__ import annotations

import math

from nufont import (  # noqa: F401
    ASC, CAP, CMAP, COMPOSITES, DESC, DW, GLYPHS, PHI, TALL_BASES, WC, XH, Metrics, Stroke, arc, bowl, cap_ellipse, cap_w,
    circle, dot_stroke, earc, ellipse, fillet_path, glyph, half_stadium, line, point, s_strokes, translate,
)

# --------------------------------------------------------------------------------------------------------------
# ASCII that was missing, and the symbols people type
# --------------------------------------------------------------------------------------------------------------


@glyph("less")
def g_less(m):
    s = 0.3 * CAP
    cy = 0.46 * CAP
    return [Stroke(fillet_path([(1.3 * s, cy + 0.85 * s), (0, cy), (1.3 * s, cy - 0.85 * s)], 0.7 * m.rho))]


@glyph("greater")
def g_greater(m):
    s = 0.3 * CAP
    cy = 0.46 * CAP
    return [Stroke(fillet_path([(0, cy + 0.85 * s), (1.3 * s, cy), (0, cy - 0.85 * s)], 0.7 * m.rho))]


@glyph("bracketleft")
def g_bracketleft(m):
    w = 0.16 * CAP
    return [Stroke(fillet_path([(w, CAP + 0.05 * CAP), (0, CAP + 0.05 * CAP), (0, DESC + m.hw), (w, DESC + m.hw)], 0.5 * m.rho))]


@glyph("bracketright")
def g_bracketright(m):
    w = 0.16 * CAP
    return [Stroke(fillet_path([(0, CAP + 0.05 * CAP), (w, CAP + 0.05 * CAP), (w, DESC + m.hw), (0, DESC + m.hw)], 0.5 * m.rho))]


@glyph("braceleft")
def g_braceleft(m):
    r = 0.12 * CAP
    top, bot, mid = CAP + 0.05 * CAP, DESC + m.hw, (CAP + DESC) / 2
    return [Stroke([
        arc((2 * r, top - r), r, 90, 180), line((r, top - r), (r, mid + r)),
        arc((0, mid + r), r, 0, -90), arc((0, mid - r), r, 90, 0), line((r, mid - r), (r, bot + r)), arc((2 * r, bot + r), r, 180, 270),
    ])]


@glyph("braceright")
def g_braceright(m):
    r = 0.12 * CAP
    top, bot, mid = CAP + 0.05 * CAP, DESC + m.hw, (CAP + DESC) / 2
    return [Stroke([
        arc((0, top - r), r, 90, 0), line((r, top - r), (r, mid + r)),
        arc((2 * r, mid + r), r, 180, 270), arc((2 * r, mid - r), r, 90, 180), line((r, mid - r), (r, bot + r)), arc((0, bot + r), r, 0, -90),
    ])]


@glyph("backslash")
def g_backslash(m):
    return [Stroke([line((0, CAP - m.hw), (0.5 * CAP, DESC + m.hw))])]


@glyph("bar")
def g_bar(m):
    return [Stroke([line((0, CAP + 0.05 * CAP), (0, DESC + m.hw))])]


@glyph("asciicircum")
def g_asciicircum(m):
    d = 0.22 * CAP
    return [Stroke(fillet_path([(0, CAP - d), (d, CAP - m.hw), (2 * d, CAP - d)], 0.6 * m.rho))]


@glyph("asciitilde")
def g_asciitilde(m):
    a = 0.17 * CAP
    b = 0.06 * CAP
    cy = 0.46 * CAP
    return [Stroke([earc((a, cy), a, b, 225, 0), earc((3 * a, cy), a, b, 180, 315)])]


@glyph("grave")
def g_grave(m):
    return [Stroke([line((0.16 * XH, CAP - m.hw - 0.15 * XH), (0, CAP - m.hw))])]


@glyph("quotedblleft")
def g_quotedblleft(m):
    d = 0.16 * CAP
    y = CAP - 0.2 * CAP - 0.3 * XH
    one = [dot_stroke(0, y, m, tag="dot"), Stroke([line((0, y + m.hw), (0.07 * XH, CAP - m.hw))])]
    return one + translate(one, d)


@glyph("quotedblright")
def g_quotedblright(m):
    d = 0.16 * CAP
    y = CAP - 0.2 * CAP
    one = [dot_stroke(0, y, m, tag="dot"), Stroke([line((0, y + m.hw), (-0.07 * XH, y - 0.22 * XH))])]
    return one + translate(one, d)


@glyph("quotesinglbase")
def g_quotesinglbase(m):
    return [dot_stroke(0, 0, m, tag="dot"), Stroke([line((0, m.hw * 0.9), (-0.08 * XH, -0.28 * XH))])]


@glyph("quotedblbase")
def g_quotedblbase(m):
    one = g_quotesinglbase(m)
    return one + translate(one, 0.16 * CAP)


@glyph("ellipsis")
def g_ellipsis(m):
    d = 0.3 * CAP
    return [dot_stroke(0, 0, m, tag="dot"), dot_stroke(d, 0, m, tag="dot"), dot_stroke(2 * d, 0, m, tag="dot")]


@glyph("bullet")
def g_bullet(m):
    d = 0.2 * CAP
    return [Stroke([point((d / 2, 0.46 * CAP))], wmul=d / m.w, tag="dot")]


@glyph("periodcentered")
def g_periodcentered(m):
    return [dot_stroke(0, 0.46 * CAP - m.hw, m, tag="dot")]


@glyph("guilsinglleft")
def g_guilsinglleft(m):
    s = 0.13 * CAP
    cy = 0.5 * XH
    return [Stroke(fillet_path([(s, cy + s), (0, cy), (s, cy - s)], 0.5 * m.rho))]


@glyph("guilsinglright")
def g_guilsinglright(m):
    s = 0.13 * CAP
    cy = 0.5 * XH
    return [Stroke(fillet_path([(0, cy + s), (s, cy), (0, cy - s)], 0.5 * m.rho))]


@glyph("guillemotleft")
def g_guillemotleft(m):
    one = g_guilsinglleft(m)
    return one + translate(one, 0.18 * CAP)


@glyph("guillemotright")
def g_guillemotright(m):
    one = g_guilsinglright(m)
    return one + translate(one, 0.18 * CAP)


@glyph("exclamdown")
def g_exclamdown(m):
    return [dot_stroke(0, XH + 0.1 * XH, m, tag="dot"), Stroke([line((0, 0.36 * CAP + 0.1 * XH - XH * 0.1), (0, DESC * 0.75))])]


@glyph("questiondown")
def g_questiondown(m):
    rq = 0.2 * CAP
    y0 = XH * 0.95
    return [dot_stroke(rq, y0 + 0.1 * XH, m, tag="dot"), Stroke([line((rq, y0 - 0.2 * XH), (rq, DESC * 0.75 + 2 * rq)), arc((rq, DESC * 0.75 + 2 * rq - rq), rq, 0, -270)])]


@glyph("multiply")
def g_multiply(m):
    s = 0.21 * CAP
    cy = 0.46 * CAP
    return [Stroke([line((0, cy - s), (2 * s, cy + s))]), Stroke([line((0, cy + s), (2 * s, cy - s))])]


@glyph("divide")
def g_divide(m):
    s = 0.3 * CAP
    cy = 0.46 * CAP
    return [Stroke([line((0, cy), (2 * s, cy))]), dot_stroke(s, cy + 0.12 * CAP, m, tag="dot"), dot_stroke(s, cy - 0.12 * CAP - 2.6 * m.hw, m, tag="dot")]


@glyph("minus")
def g_minus(m):
    s = 0.3 * CAP
    return [Stroke([line((0, 0.46 * CAP), (2 * s, 0.46 * CAP))])]


@glyph("plusminus")
def g_plusminus(m):
    s = 0.3 * CAP
    cy = 0.5 * CAP
    return [Stroke([line((0, cy), (2 * s, cy))]), Stroke([line((s, cy - 0.7 * s), (s, cy + 0.7 * s))]), Stroke([line((0, m.hw), (2 * s, m.hw))])]


@glyph("degree")
def g_degree(m):
    r = 0.09 * CAP + 0.2 * m.w
    return [Stroke(circle((r, CAP - m.hw - r), r), closed=True)]


@glyph("copyright")
def g_copyright(m):
    R = (CAP - m.w) / 2
    c = (R, CAP / 2)
    r = 0.46 * R
    return [Stroke(circle(c, R), closed=True), Stroke([arc(c, r, 45, 315)])]


@glyph("registered")
def g_registered(m):
    R = (CAP - m.w) / 2
    c = (R, CAP / 2)
    h = 0.5 * R
    x0 = c[0] - 0.28 * R
    xp = x0 + 0.22 * R
    rp = h / 4
    return [
        Stroke(circle(c, R), closed=True),
        Stroke([line((x0, c[1] - h / 2), (x0, c[1] + h / 2))]),
        Stroke(half_stadium(x0, xp, c[1] + h / 2, c[1])),
        Stroke([line((xp + 0.3 * rp, c[1]), (xp + 1.6 * rp, c[1] - h / 2))]),
    ]


@glyph("trademark")
def g_trademark(m):
    top, bot = CAP - m.hw, CAP - 0.42 * CAP
    wt = 0.3 * CAP
    wm = 0.34 * CAP
    x1 = wt + 0.12 * CAP
    return [
        Stroke([line((0, top), (wt, top))]), Stroke([line((wt / 2, top), (wt / 2, bot))]),
        Stroke([line((x1, bot), (x1, top))]), Stroke([line((x1 + wm, bot), (x1 + wm, top))]),
        Stroke(fillet_path([(x1, top), (x1 + wm / 2, bot + 0.3 * (top - bot)), (x1 + wm, top)], 0.5 * m.rho)),
    ]


@glyph("Euro")
def g_Euro(m):
    c, a, b = cap_ellipse(m)
    return [Stroke([earc(c, a, b, 40, 320)]), Stroke([line((c[0] - a - 0.08 * CAP, CAP / 2 + 0.07 * CAP), (c[0] + 0.1 * a, CAP / 2 + 0.07 * CAP))]), Stroke([line((c[0] - a - 0.08 * CAP, CAP / 2 - 0.07 * CAP), (c[0] + 0.02 * a, CAP / 2 - 0.07 * CAP))])]


@glyph("sterling")
def g_sterling(m):
    rf = 0.16 * CAP
    x = 0.14 * CAP
    return [
        Stroke([arc((x + rf, CAP - m.hw - rf), rf, 90, 180), line((x, CAP - m.hw - rf), (x, 0.3 * CAP)), *fillet_path([(x, 0.3 * CAP), (x - 0.06 * CAP, m.hw), (0.5 * CAP, m.hw)], 0.6 * m.rho)]),
        Stroke([line((x - 0.1 * CAP, CAP / 2), (x + 0.24 * CAP, CAP / 2))]),
    ]


@glyph("yen")
def g_yen(m):
    w = cap_w(m)
    return [
        Stroke([line((0, CAP - m.hw), (w / 2, CAP / 2))]), Stroke([line((w, CAP - m.hw), (w / 2, CAP / 2))]), Stroke([line((w / 2, CAP / 2), (w / 2, m.hw))]),
        Stroke([line((0.15 * w, 0.42 * CAP), (0.85 * w, 0.42 * CAP))]), Stroke([line((0.15 * w, 0.26 * CAP), (0.85 * w, 0.26 * CAP))]),
    ]


@glyph("cent")
def g_cent(m):
    r = m.rv
    return [Stroke([earc((m.ra, XH / 2), m.ra, r, 42, 318)]), Stroke([line((m.ra, XH + 0.12 * XH), (m.ra, -0.12 * XH))])]


@glyph("section")
def g_section(m):
    rs = (CAP - m.w) / 5
    return [Stroke([arc((rs, CAP - m.hw - rs), rs, 30, 270)]), Stroke(circle((rs, CAP / 2), rs), closed=True), Stroke([arc((rs, m.hw + rs), rs, 90, -150)])]


@glyph("paragraph")
def g_paragraph(m):
    r = 0.2 * CAP
    return [Stroke([line((r, CAP - m.hw), (r, m.hw))]), Stroke([line((2 * r, CAP - m.hw), (2 * r, m.hw))]), Stroke([line((2 * r, CAP - m.hw), (r, CAP - m.hw)), arc((r, CAP - m.hw - r), r, 90, 270)])]


@glyph("dagger")
def g_dagger(m):
    s = 0.14 * CAP
    return [Stroke([line((s, CAP - m.hw), (s, DESC * 0.5))]), Stroke([line((0, CAP - 0.22 * CAP), (2 * s, CAP - 0.22 * CAP))])]


@glyph("fraction")
def g_fraction(m):
    return [Stroke([line((0, -0.05 * CAP), (0.4 * CAP, CAP + 0.02 * CAP))])]


@glyph("onesuperior")
def g_onesuperior(m):
    top, bot = CAP + 0.02 * CAP, 0.56 * CAP
    x0 = 0.1 * CAP
    return [Stroke([line((0, top - 0.1 * CAP), (x0, top))]), Stroke([line((x0, top), (x0, bot))])]


@glyph("twosuperior")
def g_twosuperior(m):
    h = 0.46 * CAP
    r2 = 0.12 * CAP
    top = CAP + 0.02 * CAP
    c = (r2, top - m.hw * 0.7 - r2)
    return [Stroke([arc(c, r2, 160, -50), line((c[0] + r2 * math.cos(math.radians(-50)), c[1] + r2 * math.sin(math.radians(-50))), (0, top - h))]), Stroke([line((0, top - h), (2 * r2, top - h))])]


@glyph("threesuperior")
def g_threesuperior(m):
    r = 0.11 * CAP
    top = CAP + 0.02 * CAP
    return [Stroke([arc((r, top - r), r, 150, -90)]), Stroke([arc((r, top - 3 * r), r, 90, -140)])]


@glyph("ordfeminine")
def g_ordfeminine(m):
    s = 0.55
    r = s * m.rv
    return [Stroke(circle((r, CAP - r - m.hw), r), closed=True), Stroke([line((2 * r, CAP - m.hw), (2 * r, CAP - 2 * r - m.hw))]), Stroke([line((0, CAP - 2.9 * r - m.hw), (2 * r, CAP - 2.9 * r - m.hw))])]


@glyph("ordmasculine")
def g_ordmasculine(m):
    r = 0.55 * m.rv
    return [Stroke(circle((r, CAP - r - m.hw), r), closed=True), Stroke([line((0, CAP - 2.9 * r - m.hw), (2 * r, CAP - 2.9 * r - m.hw))])]


@glyph("brokenbar")
def g_brokenbar(m):
    return [Stroke([line((0, CAP + 0.05 * CAP), (0, 0.34 * CAP))]), Stroke([line((0, 0.18 * CAP), (0, DESC + m.hw))])]


@glyph("logicalnot")
def g_logicalnot(m):
    s = 0.3 * CAP
    return [Stroke([line((0, 0.46 * CAP), (2 * s, 0.46 * CAP)), line((2 * s, 0.46 * CAP), (2 * s, 0.2 * CAP))])]


@glyph("macron")
def g_macron(m):
    return [Stroke([line((0, CAP - m.hw), (0.38 * XH, CAP - m.hw))])]


@glyph("dieresis")
def g_dieresis(m):
    d = 0.2 * XH + 0.35 * m.w
    return [dot_stroke(0, CAP - 0.2 * CAP, m, tag="dot"), dot_stroke(2 * d, CAP - 0.2 * CAP, m, tag="dot")]


@glyph("acute")
def g_acute(m):
    return [Stroke([line((0, CAP - m.hw - 0.15 * XH), (0.16 * XH, CAP - m.hw))])]


@glyph("cedilla")
def g_cedilla(m):
    return [Stroke([line((0.1 * XH, 0), (0.1 * XH, -0.1 * XH)), arc((0.03 * XH, -0.17 * XH), 0.07 * XH, 0, -150)])]


# --------------------------------------------------------------------------------------------------------------
# More Latin letters
# --------------------------------------------------------------------------------------------------------------


@glyph("hbar", "the h with a bar across the top of its stem")
def g_hbar(m):
    return GLYPHS["h"](m) + [Stroke([line((-0.16 * XH, 0.8 * ASC), (0.2 * XH, 0.8 * ASC))])]


@glyph("dcroat", "the d with a bar across its stem")
def g_dcroat(m):
    return GLYPHS["d"](m) + [Stroke([line((2 * m.ra - 0.18 * XH, 0.8 * ASC), (2 * m.ra + 0.2 * XH, 0.8 * ASC))])]


@glyph("tbar", "the t with a second bar")
def g_tbar(m):
    return GLYPHS["t"](m) + [Stroke([line((-0.18 * XH, 0.45 * XH), (0.22 * XH, 0.45 * XH))])]


@glyph("thorn", "a stem from the ascender into the descender with a bowl at the x-height")
def g_thorn(m):
    return [bowl(0, m), Stroke([line((0, ASC - m.hw), (0, DESC + m.hw))])]


@glyph("germandbls", "a stem from the baseline to the ascender, with the top curling into the s")
def g_germandbls(m):
    r = 0.9 * m.rho
    sx = 2 * r
    return [
        Stroke([line((0, m.hw), (0, ASC - m.hw - r)), arc((r, ASC - m.hw - r), r, 180, 0), line((2 * r, ASC - m.hw - r), (2 * r, ASC - m.hw - r - 0.08 * XH))]),
        *translate(s_strokes(XH, m), sx - (XH - m.w) / 4 + m.hw),
    ]


@glyph("eng", "an n whose right leg descends and hooks left")
def g_eng(m):
    a, b, cy = m.ra, m.rv, XH / 2
    rg = 0.9 * m.rho
    yg = DESC + m.hw + rg
    return [Stroke([line((0, m.hw), (0, cy)), earc((a, cy), a, b, 180, 0), line((2 * a, cy), (2 * a, yg)), arc((2 * a - rg, yg), rg, 0, -180)])]


@glyph("kgreenlandic")
def g_kgreenlandic(m):
    xk = 0.8 * XH
    yk = 0.42 * XH
    return [Stroke([line((0, XH - m.hw), (0, m.hw))]), Stroke([line((0, yk), (xk * 0.92, XH - m.hw))]), Stroke([line((0.3 * xk, yk + 0.3 * (XH - yk)), (xk, m.hw))])]


@glyph("Hbar")
def g_Hbar(m):
    w = cap_w(m)
    return GLYPHS["H"](m) + [Stroke([line((-0.1 * CAP, 0.78 * CAP), (w + 0.1 * CAP, 0.78 * CAP))])]


@glyph("Dcroat")
def g_Dcroat(m):
    return GLYPHS["D"](m) + [Stroke([line((-0.1 * CAP, CAP / 2), (0.14 * CAP, CAP / 2))])]


@glyph("Tbar")
def g_Tbar(m):
    wt = 0.68 * CAP
    return GLYPHS["T"](m) + [Stroke([line((wt / 2 - 0.12 * CAP, 0.4 * CAP), (wt / 2 + 0.12 * CAP, 0.4 * CAP))])]


@glyph("Thorn")
def g_Thorn(m):
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke(half_stadium(0, 0.15 * CAP, 0.8 * CAP, 0.25 * CAP))]


@glyph("Eng")
def g_Eng(m):
    w = cap_w(m)
    rg = 0.18 * CAP
    yg = DESC + m.hw + rg
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((w, yg), (w, CAP - m.hw)), ]), Stroke([line((0, CAP - m.hw), (w, m.hw))]), Stroke([arc((w - rg, yg), rg, 0, -180)])]


@glyph("Germandbls")
def g_Germandbls(m):
    return g_germandbls(m)


# --------------------------------------------------------------------------------------------------------------
# Greek
# --------------------------------------------------------------------------------------------------------------


def _ucurve(x, m: Metrics, top=None, right_to=None):
    """A u between x and x + 2 ra, with the right leg ending at `right_to` (default the x-height)."""
    a, b, cy = m.ra, m.rv, XH / 2
    top = XH - m.hw if top is None else top
    rt = top if right_to is None else right_to
    return [line((x, top), (x, cy)), earc((x + a, cy), a, b, 180, 360), line((x + 2 * a, cy), (x + 2 * a, rt))]


@glyph("alpha")
def g_alpha(m):
    a = m.ra
    rr = 0.45 * m.rho
    return [bowl(0, m), Stroke([line((2 * a, XH - m.hw), (2 * a, m.hw + rr)), arc((2 * a + rr, m.hw + rr), rr, 180, 300)])]


@glyph("beta")
def g_beta(m):
    top = XH + 0.42 * (ASC - XH)
    return [
        Stroke([line((0, DESC + m.hw), (0, top))]),
        Stroke(half_stadium(0, 0.1 * XH, top, 0.55 * XH)),
        Stroke(half_stadium(0, 0.16 * XH, 0.55 * XH, m.hw)),
    ]


@glyph("gamma")
def g_gamma(m):
    xv = 0.95 * XH
    return [Stroke(fillet_path([(0, XH - m.hw), (xv / 2, DESC + m.hw), (xv, XH - m.hw)], m.rho))]


@glyph("delta")
def g_delta(m):
    a, r = m.ra, m.rv
    return [bowl(0, m), Stroke([earc((a, m.hw + r), a, ASC - 2 * m.hw - r, 180, 40)])]


@glyph("epsilon")
def g_epsilon(m):
    rs = (XH - m.w) / 4
    return [Stroke([arc((rs, XH / 2 + rs), rs, 40, 270)]), Stroke([arc((rs, XH / 2 - rs), rs, 90, 320)])]


@glyph("zeta")
def g_zeta(m):
    return [Stroke(fillet_path([(0.05 * XH, 0.82 * ASC), (0.6 * XH, 0.82 * ASC), (0.05 * XH, 0.3 * XH), (0.55 * XH, 0.0), (0.6 * XH, DESC * 0.7)], [0.5 * m.rho, m.rho, 0.9 * m.rho]))]


@glyph("eta")
def g_eta(m):
    a, b, cy = m.ra, m.rv, XH / 2
    return [Stroke([line((0, m.hw), (0, cy)), earc((a, cy), a, b, 180, 0), line((2 * a, cy), (2 * a, DESC + m.hw))])]


@glyph("theta")
def g_theta(m):
    a = m.ra
    b = (ASC - m.w) / 2
    return [Stroke(ellipse((a, ASC / 2), a, b), closed=True), Stroke([line((0, ASC / 2), (2 * a, ASC / 2))])]


@glyph("iota")
def g_iota(m):
    rho = 1.1 * m.rho
    return [Stroke([line((0, XH - m.hw), (0, rho + m.hw)), arc((rho, rho + m.hw), rho, 180, 270), line((rho, m.hw), (rho + 0.06 * XH, m.hw))])]


@glyph("kappa")
def g_kappa(m):
    xk = 0.8 * XH
    yk = 0.42 * XH
    return [Stroke([line((0, XH - m.hw), (0, m.hw))]), Stroke([line((0, yk), (xk * 0.92, XH - m.hw))]), Stroke([line((0.3 * xk, yk + 0.3 * (XH - yk)), (xk, m.hw))])]


@glyph("lambda")
def g_lambda(m):
    return [Stroke([line((0.08 * XH, ASC - m.hw), (0.95 * XH, m.hw))]), Stroke([line((0.52 * XH, 0.52 * XH), (0, m.hw))])]


@glyph("mu")
def g_mu(m):
    a = m.ra
    return [Stroke([line((0, XH - m.hw), (0, DESC + m.hw))]), Stroke(_ucurve(0, m)), Stroke([line((2 * a, XH - m.hw), (2 * a, m.hw))])]


@glyph("nu")
def g_nu(m):
    xv = 0.95 * XH
    return [Stroke(fillet_path([(0, XH - m.hw), (xv * 0.55, m.hw), (xv, XH - m.hw)], [m.rho]))]


@glyph("xi")
def g_xi(m):
    return [Stroke(fillet_path([(0.6 * XH, 0.8 * ASC), (0.1 * XH, 0.8 * ASC), (0.1 * XH, 0.52 * XH), (0.5 * XH, 0.52 * XH), (0.05 * XH, 0.3 * XH), (0.5 * XH, 0.05 * XH), (0.55 * XH, DESC * 0.6)], 0.11 * XH))]


@glyph("omicron")
def g_omicron(m):
    return GLYPHS["o"](m)


@glyph("pi")
def g_pi(m):
    rho = 1.1 * m.rho
    return [
        Stroke([line((-0.06 * XH, XH - m.hw), (1.0 * XH, XH - m.hw))]),
        Stroke([line((0.18 * XH, XH - m.hw), (0.18 * XH, m.hw))]),
        Stroke([line((0.74 * XH, XH - m.hw), (0.74 * XH, rho + m.hw)), arc((0.74 * XH + rho, rho + m.hw), rho, 180, 270)]),
    ]


@glyph("rho")
def g_rho(m):
    return [bowl(0, m), Stroke([line((0, XH / 2), (0, DESC + m.hw))])]


@glyph("sigma")
def g_sigma(m):
    a = m.ra
    return [bowl(0, m), Stroke([line((a, XH - m.hw), (2 * a + 0.28 * XH, XH - m.hw))])]


@glyph("sigma1")
def g_sigma1(m):
    a, r = m.ra, m.rv
    end = (a + a * math.cos(math.radians(300)), XH / 2 + r * math.sin(math.radians(300)))
    return [Stroke([earc((a, XH / 2), a, r, 60, 300), line(end, (end[0] + 0.1 * XH, DESC + m.hw))])]


@glyph("tau")
def g_tau(m):
    rho = 1.1 * m.rho
    x = 0.08 * XH
    return [Stroke([line((-0.28 * XH, XH - m.hw), (0.44 * XH, XH - m.hw))]), Stroke([line((x, XH - m.hw), (x, rho + m.hw)), arc((x + rho, rho + m.hw), rho, 180, 270), line((x + rho, m.hw), (x + rho + 0.08 * XH, m.hw))])]


@glyph("upsilon")
def g_upsilon(m):
    return [Stroke(_ucurve(0, m))]


@glyph("phi")
def g_phi(m):
    a = m.ra
    return [Stroke(ellipse((a * 1.1, XH / 2), 1.1 * a, m.rv), closed=True), Stroke([line((a * 1.1, ASC - m.hw), (a * 1.1, DESC + m.hw))])]


@glyph("chi")
def g_chi(m):
    xx = 0.95 * XH
    return [Stroke([line((0, XH - m.hw), (xx, DESC + m.hw))]), Stroke([line((xx, XH - m.hw), (0, DESC * 0.35))])]


@glyph("psi")
def g_psi(m):
    a = m.ra
    return [Stroke(_ucurve(0, m)), Stroke([line((a, ASC - m.hw), (a, DESC + m.hw))])]


@glyph("omega")
def g_omega(m):
    a1 = 0.72 * m.ra
    b, cy = m.rv, XH / 2
    mid = 0.72 * XH
    return [
        Stroke([line((0, XH - m.hw), (0, cy)), earc((a1, cy), a1, b, 180, 360), line((2 * a1, cy), (2 * a1, mid))]),
        Stroke([line((2 * a1, mid), (2 * a1, cy)), earc((3 * a1, cy), a1, b, 180, 360), line((4 * a1, cy), (4 * a1, XH - m.hw))]),
    ]


@glyph("Alpha")
def g_Alpha(m):
    return GLYPHS["A"](m)


@glyph("Beta")
def g_Beta(m):
    return GLYPHS["B"](m)


@glyph("Gamma")
def g_Gamma(m):
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((0, CAP - m.hw), (0.46 * CAP, CAP - m.hw))])]


@glyph("Delta")
def g_Delta(m):
    ws = cap_w(m) + 60
    return [Stroke(fillet_path([(0, m.hw), (ws / 2, CAP - m.hw), (ws, m.hw)], 1.3 * m.rho)), Stroke([line((0, m.hw), (ws, m.hw))])]


@glyph("Epsilon")
def g_Epsilon(m):
    return GLYPHS["E"](m)


@glyph("Zeta")
def g_Zeta(m):
    return GLYPHS["Z"](m)


@glyph("Eta")
def g_Eta(m):
    return GLYPHS["H"](m)


@glyph("Theta")
def g_Theta(m):
    c, a, b = cap_ellipse(m)
    return [Stroke(ellipse(c, a, b), closed=True), Stroke([line((c[0] - 0.55 * a, CAP / 2), (c[0] + 0.55 * a, CAP / 2))])]


@glyph("Iota")
def g_Iota(m):
    return GLYPHS["I"](m)


@glyph("Kappa")
def g_Kappa(m):
    return GLYPHS["K"](m)


@glyph("Lambda")
def g_Lambda(m):
    ws = cap_w(m) + 60
    return [Stroke(fillet_path([(0, m.hw), (ws / 2, CAP - m.hw), (ws, m.hw)], 1.3 * m.rho))]


@glyph("Mu")
def g_Mu(m):
    return GLYPHS["M"](m)


@glyph("Nu")
def g_Nu(m):
    return GLYPHS["N"](m)


@glyph("Xi")
def g_Xi(m):
    w = 0.46 * CAP
    return [Stroke([line((0, CAP - m.hw), (w, CAP - m.hw))]), Stroke([line((0.1 * w, CAP / 2), (0.9 * w, CAP / 2))]), Stroke([line((0, m.hw), (w, m.hw))])]


@glyph("Omicron")
def g_Omicron(m):
    return GLYPHS["O"](m)


@glyph("Pi")
def g_Pi(m):
    w = cap_w(m)
    return [Stroke([line((0, m.hw), (0, CAP - m.hw))]), Stroke([line((w, m.hw), (w, CAP - m.hw))]), Stroke([line((0, CAP - m.hw), (w, CAP - m.hw))])]


@glyph("Rho")
def g_Rho(m):
    return GLYPHS["P"](m)


@glyph("Sigma")
def g_Sigma(m):
    w = 0.46 * CAP
    return [Stroke(fillet_path([(w, CAP - m.hw), (0, CAP - m.hw), (0.55 * w, CAP / 2), (0, m.hw), (w, m.hw)], 0.6 * m.rho))]


@glyph("Tau")
def g_Tau(m):
    return GLYPHS["T"](m)


@glyph("Upsilon")
def g_Upsilon(m):
    return GLYPHS["Y"](m)


@glyph("Phi")
def g_Phi(m):
    c, a, b = cap_ellipse(m, 0.8)
    return [Stroke(ellipse((c[0], CAP / 2), a, 0.62 * b), closed=True), Stroke([line((c[0], CAP - m.hw), (c[0], m.hw))])]


@glyph("Chi")
def g_Chi(m):
    return GLYPHS["X"](m)


@glyph("Psi")
def g_Psi(m):
    w = cap_w(m)
    r = w / 2
    cy = 0.42 * CAP + r * 0.0
    return [Stroke([line((0, CAP - m.hw), (0, cy)), arc((r, cy), r, 180, 360), line((2 * r, cy), (2 * r, CAP - m.hw))]), Stroke([line((r, CAP - m.hw), (r, m.hw))])]


@glyph("Omega")
def g_Omega(m):
    R = (0.8 * CAP - m.w) / 2
    c = (R, m.hw + 0.1 * CAP + R)
    a0 = 245.0
    p0 = (c[0] + R * math.cos(math.radians(a0)), c[1] + R * math.sin(math.radians(a0)))
    p1 = (c[0] + R * math.cos(math.radians(-65)), c[1] + R * math.sin(math.radians(-65)))
    return [
        Stroke([line((p0[0] - 0.14 * CAP, m.hw), (p0[0], m.hw)), line((p0[0], m.hw), p0), arc(c, R, a0, -65), line(p1, (p1[0], m.hw)), line((p1[0], m.hw), (p1[0] + 0.14 * CAP, m.hw))]),
    ]


# --------------------------------------------------------------------------------------------------------------
# Cyrillic
# --------------------------------------------------------------------------------------------------------------


def _stem(x, y0, y1):
    return Stroke([line((x, y0), (x, y1))])


def _bar(x0, x1, y):
    return Stroke([line((x0, y), (x1, y))])


def half_stadium_left(x0, x1, ytop, ybot):
    """Like half_stadium but bulging to the left (x1 < x0)."""
    r = (ytop - ybot) / 2
    return [line((x0, ytop), (x1, ytop)), arc((x1, ybot + r), r, 90, 270), line((x1, ybot), (x0, ybot))]


def _de(m: Metrics, h, feet):
    """д and Д: a roof on two slanted legs, a base bar, and feet below the baseline."""
    w = 1.05 * h * (XH / CAP if h == XH else 0.72)
    w = 1.05 * h if h == XH else 0.8 * CAP
    return [
        Stroke(fillet_path([(0.14 * w, m.hw), (0.28 * w, h - m.hw), (0.72 * w, h - m.hw), (0.86 * w, m.hw)], 0.5 * m.rho)),
        _bar(0, w, m.hw), _stem(0, m.hw, -feet), _stem(w, m.hw, -feet),
    ]


def _zhe(m: Metrics, h):
    xk = 0.5 * h
    yk = 0.46 * h
    return [
        _stem(xk, h - m.hw, m.hw),
        Stroke([line((xk, yk), (xk - 0.92 * xk, h - m.hw))]), Stroke([line((xk - 0.3 * xk, yk + 0.3 * (h - yk)), (0, m.hw))]),
        Stroke([line((xk, yk), (xk + 0.92 * xk, h - m.hw))]), Stroke([line((xk + 0.3 * xk, yk + 0.3 * (h - yk)), (2 * xk, m.hw))]),
    ]


def _ze(m: Metrics, h):
    r = (h - m.w) / 4
    return [Stroke([arc((r, h - m.hw - r), r, 150, -90)]), Stroke([arc((r, m.hw + r), r, 90, -140)])]


def _i_cyr(m: Metrics, h):
    w = 0.85 * h if h == XH else cap_w(m)
    return [_stem(0, m.hw, h - m.hw), _stem(w, m.hw, h - m.hw), Stroke([line((0, m.hw), (w, h - m.hw))])]


def _el(m: Metrics, h):
    w = 0.85 * h if h == XH else cap_w(m)
    rho = 0.9 * m.rho
    return [_stem(w, m.hw, h - m.hw), Stroke(fillet_path([(w, h - m.hw), (0.22 * w, h - m.hw), (0.1 * w, m.hw + rho), (0, m.hw)], [0.5 * m.rho, 0.6 * m.rho]))]


def _pe(m: Metrics, h):
    w = 0.85 * h if h == XH else cap_w(m)
    return [_stem(0, m.hw, h - m.hw), _stem(w, m.hw, h - m.hw), _bar(0, w, h - m.hw)]


def _tse(m: Metrics, h, feet):
    w = 0.85 * h if h == XH else cap_w(m)
    return [_stem(0, h - m.hw, m.hw), _stem(w, h - m.hw, m.hw), _bar(0, w + 0.12 * h, m.hw), _stem(w + 0.12 * h, m.hw, -feet)]


def _che(m: Metrics, h):
    w = 0.85 * h if h == XH else cap_w(m)
    cy = 0.52 * h
    rr = 0.3 * cy
    return [Stroke([line((0, h - m.hw), (0, cy + rr)), arc((rr, cy + rr), rr, 180, 270), line((rr, cy), (w, cy))]), _stem(w, h - m.hw, m.hw)]


def _sha(m: Metrics, h, tail=0.0):
    w = 1.25 * h if h == XH else 0.95 * CAP
    return [_stem(0, h - m.hw, m.hw), _stem(w / 2, h - m.hw, m.hw), _stem(w, h - m.hw, m.hw), _bar(0, w + (0.1 * h if tail else 0), m.hw)] + ([_stem(w + 0.1 * h, m.hw, -tail)] if tail else [])


def _soft(m: Metrics, h, hard=False, yeri=False):
    xp = 0.14 * h if h == XH else 0.17 * CAP
    out = [_stem(0, h - m.hw, m.hw), Stroke(half_stadium(0, xp, 0.52 * h, m.hw))]
    if hard:
        out.append(_bar(-0.3 * h if h == XH else -0.2 * CAP, 0, h - m.hw))
    if yeri:
        xs = xp + 2 * (0.52 * h - m.hw) / 2 + 0.22 * h
        out.append(_stem(xs, h - m.hw, m.hw))
    return out


def _e_rev(m: Metrics, h):
    if h == XH:
        a, r = m.ra, m.rv
        return [Stroke([earc((a, h / 2), a, r, -138, 138)]), _bar(0.35 * a, 2 * a, h / 2)]
    c, a, b = cap_ellipse(m)
    return [Stroke([earc(c, a, b, -140, 140)]), _bar(c[0] - 0.1 * a, c[0] + a, CAP / 2)]


def _yu(m: Metrics, h):
    if h == XH:
        gap = 0.26 * h
        return [_stem(0, h - m.hw, m.hw), _bar(0, gap, h / 2)] + translate(GLYPHS["o"](m), gap)
    gap = 0.22 * CAP
    return [_stem(0, CAP - m.hw, m.hw), _bar(0, gap, CAP / 2)] + translate(GLYPHS["O"](m), gap)


def _ya(m: Metrics, h):
    w = 0.78 * h if h == XH else 0.56 * CAP
    xp = w - (0.14 * h if h == XH else 0.15 * CAP)
    rp = (h / 2 - m.hw) / 2
    return [_stem(w, m.hw, h - m.hw), Stroke(half_stadium_left(w, xp, h - m.hw, h / 2)), Stroke([line((xp - 0.35 * rp, h / 2), (xp - 1.9 * rp, m.hw))])]


def _ef(m: Metrics):
    a = 1.15 * m.ra
    return [Stroke(ellipse((a, XH / 2), a, m.rv), closed=True), _stem(a, ASC - m.hw, m.hw)]


@glyph("afii10065")
def g_a_cy(m):
    return GLYPHS["a"](m)


@glyph("afii10066")
def g_be_cy(m):
    a, r = m.ra, m.rv
    return [bowl(0, m), Stroke([earc((a, m.hw + r), a, ASC - 2 * m.hw - r, 180, 75), line((a + a * math.cos(math.radians(75)), m.hw + r + (ASC - 2 * m.hw - r) * math.sin(math.radians(75))), (2 * a + 0.1 * XH, ASC - m.hw - 0.02 * XH))])]


@glyph("afii10067")
def g_ve_cy(m):
    return [_stem(0, m.hw, XH - m.hw), Stroke(half_stadium(0, 0.1 * XH, XH - m.hw, 0.53 * XH)), Stroke(half_stadium(0, 0.14 * XH, 0.53 * XH, m.hw))]


@glyph("afii10068")
def g_ge_cy(m):
    return [_stem(0, m.hw, XH - m.hw), _bar(0, 0.6 * XH, XH - m.hw)]


@glyph("afii10069")
def g_de_cy(m):
    return _de(m, XH, 0.42 * XH)


@glyph("afii10070")
def g_ie_cy(m):
    return GLYPHS["e"](m)


@glyph("afii10072")
def g_zhe_cy(m):
    return _zhe(m, XH)


@glyph("afii10073")
def g_ze_cy(m):
    return _ze(m, XH)


@glyph("afii10074")
def g_i_cy(m):
    return _i_cyr(m, XH)


@glyph("afii10076")
def g_ka_cy(m):
    return g_kgreenlandic(m)


@glyph("afii10077")
def g_el_cy(m):
    return _el(m, XH)


@glyph("afii10078")
def g_em_cy(m):
    w = 1.0 * XH
    return [_stem(0, m.hw, XH - m.hw), _stem(w, m.hw, XH - m.hw), Stroke(fillet_path([(0, XH - m.hw), (w / 2, 0.25 * XH), (w, XH - m.hw)], 0.8 * m.rho))]


@glyph("afii10079")
def g_en_cy(m):
    w = 0.85 * XH
    return [_stem(0, m.hw, XH - m.hw), _stem(w, m.hw, XH - m.hw), _bar(0, w, XH / 2)]


@glyph("afii10080")
def g_o_cy(m):
    return GLYPHS["o"](m)


@glyph("afii10081")
def g_pe_cy(m):
    return _pe(m, XH)


@glyph("afii10082")
def g_er_cy(m):
    return GLYPHS["p"](m)


@glyph("afii10083")
def g_es_cy(m):
    return GLYPHS["c"](m)


@glyph("afii10084")
def g_te_cy(m):
    w = 0.9 * XH
    return [_bar(0, w, XH - m.hw), _stem(w / 2, XH - m.hw, m.hw)]


@glyph("afii10085")
def g_u_cy(m):
    return GLYPHS["y"](m)


@glyph("afii10086")
def g_ef_cy(m):
    return _ef(m)


@glyph("afii10087")
def g_ha_cy(m):
    return GLYPHS["x"](m)


@glyph("afii10088")
def g_tse_cy(m):
    return _tse(m, XH, 0.42 * XH)


@glyph("afii10089")
def g_che_cy(m):
    return _che(m, XH)


@glyph("afii10090")
def g_sha_cy(m):
    return _sha(m, XH)


@glyph("afii10091")
def g_shcha_cy(m):
    return _sha(m, XH, 0.42 * XH)


@glyph("afii10092")
def g_hard_cy(m):
    return _soft(m, XH, hard=True)


@glyph("afii10093")
def g_yeri_cy(m):
    return _soft(m, XH, yeri=True)


@glyph("afii10094")
def g_soft_cy(m):
    return _soft(m, XH)


@glyph("afii10095")
def g_ereversed_cy(m):
    return _e_rev(m, XH)


@glyph("afii10096")
def g_yu_cy(m):
    return _yu(m, XH)


@glyph("afii10097")
def g_ya_cy(m):
    return _ya(m, XH)


@glyph("afii10101")
def g_ie_ukr(m):
    a = m.ra
    return [Stroke([earc((a, XH / 2), a, m.rv, 42, 318)]), _bar(0.6 * a, 2 * a, XH / 2)]


@glyph("afii10103")
def g_i_ukr(m):
    return GLYPHS["i"](m)


@glyph("afii10100")
def g_ge_up_cy(m):
    return [_stem(0, m.hw, XH - m.hw), _bar(0, 0.55 * XH, XH - m.hw), _stem(0.55 * XH, XH - m.hw, XH + 0.18 * XH)]


@glyph("afii10017")
def g_A_cy(m):
    return GLYPHS["A"](m)


@glyph("afii10018")
def g_Be_cy(m):
    return [_stem(0, m.hw, CAP - m.hw), _bar(0, 0.46 * CAP, CAP - m.hw), Stroke(half_stadium(0, 0.17 * CAP, 0.53 * CAP, m.hw))]


@glyph("afii10019")
def g_Ve_cy(m):
    return GLYPHS["B"](m)


@glyph("afii10020")
def g_Ge_cy(m):
    return g_Gamma(m)


@glyph("afii10021")
def g_De_cy(m):
    return _de(m, CAP, 0.18 * CAP)


@glyph("afii10022")
def g_Ie_cy(m):
    return GLYPHS["E"](m)


@glyph("afii10024")
def g_Zhe_cy(m):
    return _zhe(m, CAP)


@glyph("afii10025")
def g_Ze_cy(m):
    return _ze(m, CAP)


@glyph("afii10026")
def g_I_cy(m):
    return _i_cyr(m, CAP)


@glyph("afii10028")
def g_Ka_cy(m):
    return GLYPHS["K"](m)


@glyph("afii10029")
def g_El_cy(m):
    return _el(m, CAP)


@glyph("afii10030")
def g_Em_cy(m):
    return GLYPHS["M"](m)


@glyph("afii10031")
def g_En_cy(m):
    return GLYPHS["H"](m)


@glyph("afii10032")
def g_O_cy(m):
    return GLYPHS["O"](m)


@glyph("afii10033")
def g_Pe_cy(m):
    return _pe(m, CAP)


@glyph("afii10034")
def g_Er_cy(m):
    return GLYPHS["P"](m)


@glyph("afii10035")
def g_Es_cy(m):
    return GLYPHS["C"](m)


@glyph("afii10036")
def g_Te_cy(m):
    return GLYPHS["T"](m)


@glyph("afii10037")
def g_U_cy(m):
    w = cap_w(m)
    rho = 1.2 * m.rho
    p1 = (w, CAP - m.hw)
    p2 = (0.2 * w, m.hw + rho)
    t = (CAP / 2 - p1[1]) / (p2[1] - p1[1])
    mid = (p1[0] + (p2[0] - p1[0]) * t, CAP / 2)
    return [Stroke([line(p1, p2), arc((0.2 * w - rho, m.hw + rho), rho, 0, -90)]), Stroke([line((0, CAP - m.hw), mid)])]


@glyph("afii10038")
def g_Ef_cy(m):
    return g_Phi(m)


@glyph("afii10039")
def g_Ha_cy(m):
    return GLYPHS["X"](m)


@glyph("afii10040")
def g_Tse_cy(m):
    return _tse(m, CAP, 0.18 * CAP)


@glyph("afii10041")
def g_Che_cy(m):
    return _che(m, CAP)


@glyph("afii10042")
def g_Sha_cy(m):
    return _sha(m, CAP)


@glyph("afii10043")
def g_Shcha_cy(m):
    return _sha(m, CAP, 0.18 * CAP)


@glyph("afii10044")
def g_Hard_cy(m):
    return _soft(m, CAP, hard=True)


@glyph("afii10045")
def g_Yeri_cy(m):
    return _soft(m, CAP, yeri=True)


@glyph("afii10046")
def g_Soft_cy(m):
    return _soft(m, CAP)


@glyph("afii10047")
def g_Ereversed_cy(m):
    return _e_rev(m, CAP)


@glyph("afii10048")
def g_Yu_cy(m):
    return _yu(m, CAP)


@glyph("afii10049")
def g_Ya_cy(m):
    return _ya(m, CAP)


@glyph("afii10053")
def g_Ie_ukr(m):
    c, a, b = cap_ellipse(m)
    return [Stroke([earc(c, a, b, 40, 320)]), _bar(c[0] + 0.1 * a - 0.5 * a, c[0] + a, CAP / 2)]


@glyph("afii10055")
def g_I_ukr(m):
    return GLYPHS["I"](m)


@glyph("afii10050")
def g_Ge_up_cy(m):
    return [_stem(0, m.hw, CAP - m.hw), _bar(0, 0.46 * CAP, CAP - m.hw), _stem(0.46 * CAP, CAP - m.hw, CAP + 0.12 * CAP)]


for _n in ("afii10017 afii10018 afii10019 afii10020 afii10021 afii10022 afii10024 afii10025 afii10026 afii10028 afii10029 afii10030 afii10031 "
           "afii10032 afii10033 afii10034 afii10035 afii10036 afii10037 afii10038 afii10039 afii10040 afii10041 afii10042 afii10043 afii10044 "
           "afii10045 afii10046 afii10047 afii10048 afii10049 afii10053 afii10055 afii10050 "
           "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega "
           "Hbar Dcroat Tbar Thorn Eng Germandbls Euro").split():
    TALL_BASES.add(_n)

# --------------------------------------------------------------------------------------------------------------
# Precomposed letters
# --------------------------------------------------------------------------------------------------------------

LATIN_EXT = {
    # Latin Extended-A and friends
    "amacron": ("a", "macron"), "emacron": ("e", "macron"), "imacron": ("dotlessi", "macron"), "omacron": ("o", "macron"), "umacron": ("u", "macron"),
    "abreve": ("a", "breve"), "ebreve": ("e", "breve"), "gbreve": ("g", "breve"), "ibreve": ("dotlessi", "breve"), "obreve": ("o", "breve"), "ubreve": ("u", "breve"),
    "aogonek": ("a", "ogonek"), "eogonek": ("e", "ogonek"), "iogonek": ("i", "ogonek"), "uogonek": ("u", "ogonek"),
    "cacute": ("c", "acute"), "ccircumflex": ("c", "circumflex"), "dcaron": ("d", "caron"), "gcircumflex": ("g", "circumflex"), "gdotaccent": ("g", "dot"),
    "gcommaaccent": ("g", "commabelow"), "hcircumflex": ("h", "circumflex"), "itilde": ("dotlessi", "tilde"), "jcircumflex": ("dotlessi", "circumflex"),
    "kcommaaccent": ("k", "commabelow"), "lacute": ("l", "acute"), "lcommaaccent": ("l", "commabelow"), "lcaron": ("l", "caron"),
    "nacute": ("n", "acute"), "ncommaaccent": ("n", "commabelow"), "ohungarumlaut": ("o", "doubleacute"), "racute": ("r", "acute"), "rcommaaccent": ("r", "commabelow"),
    "sacute": ("s", "acute"), "scircumflex": ("s", "circumflex"), "scedilla": ("s", "cedilla"), "tcedilla": ("t", "cedilla"), "tcaron": ("t", "caron"),
    "uhungarumlaut": ("u", "doubleacute"), "ycircumflex": ("y", "circumflex"), "ydieresis": ("y", "dieresis"), "zacute": ("z", "acute"), "zdotaccent": ("z", "dot"),
    "Amacron": ("A", "macron"), "Emacron": ("E", "macron"), "Imacron": ("I", "macron"), "Omacron": ("O", "macron"), "Umacron": ("U", "macron"),
    "Abreve": ("A", "breve"), "Ebreve": ("E", "breve"), "Gbreve": ("G", "breve"), "Ibreve": ("I", "breve"), "Obreve": ("O", "breve"), "Ubreve": ("U", "breve"),
    "Aogonek": ("A", "ogonek"), "Eogonek": ("E", "ogonek"), "Iogonek": ("I", "ogonek"), "Uogonek": ("U", "ogonek"),
    "Cacute": ("C", "acute"), "Ccircumflex": ("C", "circumflex"), "Cdotaccent": ("C", "dot"), "Dcaron": ("D", "caron"), "Gcircumflex": ("G", "circumflex"), "Gdotaccent": ("G", "dot"),
    "Gcommaaccent": ("G", "commabelow"), "Hcircumflex": ("H", "circumflex"), "Itilde": ("I", "tilde"), "Idotaccent": ("I", "dot"), "Jcircumflex": ("J", "circumflex"),
    "Kcommaaccent": ("K", "commabelow"), "Lacute": ("L", "acute"), "Lcommaaccent": ("L", "commabelow"), "Lcaron": ("L", "caron"),
    "Nacute": ("N", "acute"), "Ncommaaccent": ("N", "commabelow"), "Ncaron": ("N", "caron"), "Ohungarumlaut": ("O", "doubleacute"), "Racute": ("R", "acute"), "Rcommaaccent": ("R", "commabelow"),
    "Sacute": ("S", "acute"), "Scircumflex": ("S", "circumflex"), "Scedilla": ("S", "cedilla"), "Scommaaccent": ("S", "commabelow"), "Tcedilla": ("T", "cedilla"), "Tcommaaccent": ("T", "commabelow"), "Tcaron": ("T", "caron"),
    "Uhungarumlaut": ("U", "doubleacute"), "Utilde": ("U", "tilde"), "Uring": ("U", "ring"), "Wcircumflex": ("W", "circumflex"), "Ycircumflex": ("Y", "circumflex"), "Ydieresis": ("Y", "dieresis"), "Yacute": ("Y", "acute"), "Zacute": ("Z", "acute"), "Zdotaccent": ("Z", "dot"),
    "Etilde": ("E", "tilde"), "Idieresis": ("I", "dieresis"), "Icircumflex": ("I", "circumflex"), "Igrave": ("I", "grave"), "Ograve": ("O", "grave"), "Ugrave": ("U", "grave"), "Ucircumflex": ("U", "circumflex"), "Otilde": ("O", "tilde"), "Atilde": ("A", "tilde"), "Ecaron": ("E", "caron"),
    "yacute": ("y", "acute"), "ygrave": ("y", "grave"),
    # Vietnamese
    "ohorn": ("o", "horn"), "uhorn": ("u", "horn"), "Ohorn": ("O", "horn"), "Uhorn": ("U", "horn"),
    "adotbelow": ("a", "dotbelow"), "edotbelow": ("e", "dotbelow"), "idotbelow": ("i", "dotbelow"), "odotbelow": ("o", "dotbelow"), "udotbelow": ("u", "dotbelow"), "ydotbelow": ("y", "dotbelow"),
    "ahookabove": ("a", "hookabove"), "ehookabove": ("e", "hookabove"), "ihookabove": ("dotlessi", "hookabove"), "ohookabove": ("o", "hookabove"), "uhookabove": ("u", "hookabove"), "yhookabove": ("y", "hookabove"),
    "ytilde": ("y", "tilde"),
    "acircumflexacute": ("a", ("circumflex", "acute")), "acircumflexgrave": ("a", ("circumflex", "grave")), "acircumflexhookabove": ("a", ("circumflex", "hookabove")), "acircumflextilde": ("a", ("circumflex", "tilde")), "acircumflexdotbelow": ("a", ("dotbelow", "circumflex")),
    "abreveacute": ("a", ("breve", "acute")), "abrevegrave": ("a", ("breve", "grave")), "abrevehookabove": ("a", ("breve", "hookabove")), "abrevetilde": ("a", ("breve", "tilde")), "abrevedotbelow": ("a", ("dotbelow", "breve")),
    "ecircumflexacute": ("e", ("circumflex", "acute")), "ecircumflexgrave": ("e", ("circumflex", "grave")), "ecircumflexhookabove": ("e", ("circumflex", "hookabove")), "ecircumflextilde": ("e", ("circumflex", "tilde")), "ecircumflexdotbelow": ("e", ("dotbelow", "circumflex")),
    "ocircumflexacute": ("o", ("circumflex", "acute")), "ocircumflexgrave": ("o", ("circumflex", "grave")), "ocircumflexhookabove": ("o", ("circumflex", "hookabove")), "ocircumflextilde": ("o", ("circumflex", "tilde")), "ocircumflexdotbelow": ("o", ("dotbelow", "circumflex")),
    "ohornacute": ("o", ("horn", "acute")), "ohorngrave": ("o", ("horn", "grave")), "ohornhookabove": ("o", ("horn", "hookabove")), "ohorntilde": ("o", ("horn", "tilde")), "ohorndotbelow": ("o", ("dotbelow", "horn")),
    "uhornacute": ("u", ("horn", "acute")), "uhorngrave": ("u", ("horn", "grave")), "uhornhookabove": ("u", ("horn", "hookabove")), "uhorntilde": ("u", ("horn", "tilde")), "uhorndotbelow": ("u", ("dotbelow", "horn")),
    "Adotbelow": ("A", "dotbelow"), "Edotbelow": ("E", "dotbelow"), "Idotbelow": ("I", "dotbelow"), "Odotbelow": ("O", "dotbelow"), "Udotbelow": ("U", "dotbelow"), "Ydotbelow": ("Y", "dotbelow"),
    "Ahookabove": ("A", "hookabove"), "Ehookabove": ("E", "hookabove"), "Ihookabove": ("I", "hookabove"), "Ohookabove": ("O", "hookabove"), "Uhookabove": ("U", "hookabove"), "Yhookabove": ("Y", "hookabove"), "Ytilde": ("Y", "tilde"), "Ygrave": ("Y", "grave"),
    "Acircumflexacute": ("A", ("circumflex", "acute")), "Acircumflexgrave": ("A", ("circumflex", "grave")), "Acircumflexhookabove": ("A", ("circumflex", "hookabove")), "Acircumflextilde": ("A", ("circumflex", "tilde")), "Acircumflexdotbelow": ("A", ("dotbelow", "circumflex")),
    "Abreveacute": ("A", ("breve", "acute")), "Abrevegrave": ("A", ("breve", "grave")), "Abrevehookabove": ("A", ("breve", "hookabove")), "Abrevetilde": ("A", ("breve", "tilde")), "Abrevedotbelow": ("A", ("dotbelow", "breve")),
    "Ecircumflexacute": ("E", ("circumflex", "acute")), "Ecircumflexgrave": ("E", ("circumflex", "grave")), "Ecircumflexhookabove": ("E", ("circumflex", "hookabove")), "Ecircumflextilde": ("E", ("circumflex", "tilde")), "Ecircumflexdotbelow": ("E", ("dotbelow", "circumflex")),
    "Ocircumflexacute": ("O", ("circumflex", "acute")), "Ocircumflexgrave": ("O", ("circumflex", "grave")), "Ocircumflexhookabove": ("O", ("circumflex", "hookabove")), "Ocircumflextilde": ("O", ("circumflex", "tilde")), "Ocircumflexdotbelow": ("O", ("dotbelow", "circumflex")),
    "Ohornacute": ("O", ("horn", "acute")), "Ohorngrave": ("O", ("horn", "grave")), "Ohornhookabove": ("O", ("horn", "hookabove")), "Ohorntilde": ("O", ("horn", "tilde")), "Ohorndotbelow": ("O", ("dotbelow", "horn")),
    "Uhornacute": ("U", ("horn", "acute")), "Uhorngrave": ("U", ("horn", "grave")), "Uhornhookabove": ("U", ("horn", "hookabove")), "Uhorntilde": ("U", ("horn", "tilde")), "Uhorndotbelow": ("U", ("dotbelow", "horn")),
    # Greek with tonos and dialytika
    "alphatonos": ("alpha", "tonos"), "epsilontonos": ("epsilon", "tonos"), "etatonos": ("eta", "tonos"), "iotatonos": ("iota", "tonos"), "omicrontonos": ("omicron", "tonos"), "upsilontonos": ("upsilon", "tonos"), "omegatonos": ("omega", "tonos"),
    "iotadieresis": ("iota", "dialytika"), "upsilondieresis": ("upsilon", "dialytika"), "iotadieresistonos": ("iota", ("dialytika", "tonos")), "upsilondieresistonos": ("upsilon", ("dialytika", "tonos")),
    "Alphatonos": ("Alpha", "tonos"), "Epsilontonos": ("Epsilon", "tonos"), "Etatonos": ("Eta", "tonos"), "Iotatonos": ("Iota", "tonos"), "Omicrontonos": ("Omicron", "tonos"), "Upsilontonos": ("Upsilon", "tonos"), "Omegatonos": ("Omega", "tonos"),
    "Iotadieresis": ("Iota", "dialytika"), "Upsilondieresis": ("Upsilon", "dialytika"),
    # Cyrillic with marks
    "afii10071": ("afii10070", "dieresis"), "afii10075": ("afii10074", "breve"), "afii10104": ("afii10103", "dieresis"), "afii10110": ("afii10085", "breve"),
    "afii10023": ("afii10022", "dieresis"), "afii10027": ("afii10026", "breve"), "afii10056": ("afii10055", "dieresis"), "afii10062": ("afii10037", "breve"),
}
COMPOSITES.update(LATIN_EXT)

CMAP.update({
    "less": 0x3C, "greater": 0x3E, "bracketleft": 0x5B, "backslash": 0x5C, "bracketright": 0x5D, "asciicircum": 0x5E, "grave": 0x60,
    "braceleft": 0x7B, "bar": 0x7C, "braceright": 0x7D, "asciitilde": 0x7E,
    "quotedblleft": 0x201C, "quotedblright": 0x201D, "quotesinglbase": 0x201A, "quotedblbase": 0x201E, "ellipsis": 0x2026, "bullet": 0x2022, "periodcentered": 0xB7,
    "guilsinglleft": 0x2039, "guilsinglright": 0x203A, "guillemotleft": 0xAB, "guillemotright": 0xBB, "exclamdown": 0xA1, "questiondown": 0xBF,
    "multiply": 0xD7, "divide": 0xF7, "minus": 0x2212, "plusminus": 0xB1, "degree": 0xB0, "copyright": 0xA9, "registered": 0xAE, "trademark": 0x2122,
    "Euro": 0x20AC, "sterling": 0xA3, "yen": 0xA5, "cent": 0xA2, "section": 0xA7, "paragraph": 0xB6, "dagger": 0x2020, "fraction": 0x2044,
    "onesuperior": 0xB9, "twosuperior": 0xB2, "threesuperior": 0xB3, "ordfeminine": 0xAA, "ordmasculine": 0xBA, "brokenbar": 0xA6, "logicalnot": 0xAC,
    "macron": 0xAF, "dieresis": 0xA8, "acute": 0xB4, "cedilla": 0xB8,
    "hbar": 0x127, "Hbar": 0x126, "dcroat": 0x111, "Dcroat": 0x110, "tbar": 0x167, "Tbar": 0x166, "thorn": 0xFE, "Thorn": 0xDE, "germandbls": 0xDF, "Germandbls": 0x1E9E,
    "eng": 0x14B, "Eng": 0x14A, "kgreenlandic": 0x138,
    "amacron": 0x101, "Amacron": 0x100, "abreve": 0x103, "Abreve": 0x102, "aogonek": 0x105, "Aogonek": 0x104, "cacute": 0x107, "Cacute": 0x106, "ccircumflex": 0x109, "Ccircumflex": 0x108,
    "Cdotaccent": 0x10A, "dcaron": 0x10F, "Dcaron": 0x10E, "emacron": 0x113, "Emacron": 0x112, "ebreve": 0x115, "Ebreve": 0x114, "eogonek": 0x119, "Eogonek": 0x118,
    "gcircumflex": 0x11D, "Gcircumflex": 0x11C, "gbreve": 0x11F, "Gbreve": 0x11E, "gdotaccent": 0x121, "Gdotaccent": 0x120, "gcommaaccent": 0x123, "Gcommaaccent": 0x122,
    "hcircumflex": 0x125, "Hcircumflex": 0x124, "itilde": 0x129, "Itilde": 0x128, "imacron": 0x12B, "Imacron": 0x12A, "ibreve": 0x12D, "Ibreve": 0x12C, "iogonek": 0x12F, "Iogonek": 0x12E, "Idotaccent": 0x130,
    "jcircumflex": 0x135, "Jcircumflex": 0x134, "kcommaaccent": 0x137, "Kcommaaccent": 0x136, "lacute": 0x13A, "Lacute": 0x139, "lcommaaccent": 0x13C, "Lcommaaccent": 0x13B, "lcaron": 0x13E, "Lcaron": 0x13D,
    "nacute": 0x144, "Nacute": 0x143, "ncommaaccent": 0x146, "Ncommaaccent": 0x145, "Ncaron": 0x147, "omacron": 0x14D, "Omacron": 0x14C, "obreve": 0x14F, "Obreve": 0x14E, "ohungarumlaut": 0x151, "Ohungarumlaut": 0x150,
    "racute": 0x155, "Racute": 0x154, "rcommaaccent": 0x157, "Rcommaaccent": 0x156, "sacute": 0x15B, "Sacute": 0x15A, "scircumflex": 0x15D, "Scircumflex": 0x15C, "scedilla": 0x15F, "Scedilla": 0x15E, "Scommaaccent": 0x218,
    "tcedilla": 0x163, "Tcedilla": 0x162, "Tcommaaccent": 0x21A, "tcaron": 0x165, "Tcaron": 0x164, "Utilde": 0x168, "umacron": 0x16B, "Umacron": 0x16A, "ubreve": 0x16D, "Ubreve": 0x16C, "Uring": 0x16E,
    "uhungarumlaut": 0x171, "Uhungarumlaut": 0x170, "uogonek": 0x173, "Uogonek": 0x172, "Wcircumflex": 0x174, "ycircumflex": 0x177, "Ycircumflex": 0x176, "Ydieresis": 0x178, "zacute": 0x17A, "Zacute": 0x179, "zdotaccent": 0x17C, "Zdotaccent": 0x17B,
    "Etilde": 0x1EBC, "Idieresis": 0xCF, "Icircumflex": 0xCE, "Igrave": 0xCC, "Ograve": 0xD2, "Ugrave": 0xD9, "Ucircumflex": 0xDB, "Otilde": 0xD5, "Atilde": 0xC3, "Ecaron": 0x11A, "yacute": 0xFD, "Yacute": 0xDD, "ydieresis": 0xFF, "ygrave": 0x1EF3, "Ygrave": 0x1EF2,
    "ohorn": 0x1A1, "Ohorn": 0x1A0, "uhorn": 0x1B0, "Uhorn": 0x1AF,
    "adotbelow": 0x1EA1, "Adotbelow": 0x1EA0, "ahookabove": 0x1EA3, "Ahookabove": 0x1EA2, "acircumflexacute": 0x1EA5, "Acircumflexacute": 0x1EA4, "acircumflexgrave": 0x1EA7, "Acircumflexgrave": 0x1EA6,
    "acircumflexhookabove": 0x1EA9, "Acircumflexhookabove": 0x1EA8, "acircumflextilde": 0x1EAB, "Acircumflextilde": 0x1EAA, "acircumflexdotbelow": 0x1EAD, "Acircumflexdotbelow": 0x1EAC,
    "abreveacute": 0x1EAF, "Abreveacute": 0x1EAE, "abrevegrave": 0x1EB1, "Abrevegrave": 0x1EB0, "abrevehookabove": 0x1EB3, "Abrevehookabove": 0x1EB2, "abrevetilde": 0x1EB5, "Abrevetilde": 0x1EB4, "abrevedotbelow": 0x1EB7, "Abrevedotbelow": 0x1EB6,
    "edotbelow": 0x1EB9, "Edotbelow": 0x1EB8, "ehookabove": 0x1EBB, "Ehookabove": 0x1EBA, "ecircumflexacute": 0x1EBF, "Ecircumflexacute": 0x1EBE, "ecircumflexgrave": 0x1EC1, "Ecircumflexgrave": 0x1EC0,
    "ecircumflexhookabove": 0x1EC3, "Ecircumflexhookabove": 0x1EC2, "ecircumflextilde": 0x1EC5, "Ecircumflextilde": 0x1EC4, "ecircumflexdotbelow": 0x1EC7, "Ecircumflexdotbelow": 0x1EC6,
    "ihookabove": 0x1EC9, "Ihookabove": 0x1EC8, "idotbelow": 0x1ECB, "Idotbelow": 0x1ECA, "odotbelow": 0x1ECD, "Odotbelow": 0x1ECC, "ohookabove": 0x1ECF, "Ohookabove": 0x1ECE,
    "ocircumflexacute": 0x1ED1, "Ocircumflexacute": 0x1ED0, "ocircumflexgrave": 0x1ED3, "Ocircumflexgrave": 0x1ED2, "ocircumflexhookabove": 0x1ED5, "Ocircumflexhookabove": 0x1ED4, "ocircumflextilde": 0x1ED7, "Ocircumflextilde": 0x1ED6, "ocircumflexdotbelow": 0x1ED9, "Ocircumflexdotbelow": 0x1ED8,
    "ohornacute": 0x1EDB, "Ohornacute": 0x1EDA, "ohorngrave": 0x1EDD, "Ohorngrave": 0x1EDC, "ohornhookabove": 0x1EDF, "Ohornhookabove": 0x1EDE, "ohorntilde": 0x1EE1, "Ohorntilde": 0x1EE0, "ohorndotbelow": 0x1EE3, "Ohorndotbelow": 0x1EE2,
    "udotbelow": 0x1EE5, "Udotbelow": 0x1EE4, "uhookabove": 0x1EE7, "Uhookabove": 0x1EE6, "uhornacute": 0x1EE9, "Uhornacute": 0x1EE8, "uhorngrave": 0x1EEB, "Uhorngrave": 0x1EEA, "uhornhookabove": 0x1EED, "Uhornhookabove": 0x1EEC, "uhorntilde": 0x1EEF, "Uhorntilde": 0x1EEE, "uhorndotbelow": 0x1EF1, "Uhorndotbelow": 0x1EF0,
    "ydotbelow": 0x1EF5, "Ydotbelow": 0x1EF4, "yhookabove": 0x1EF7, "Yhookabove": 0x1EF6, "ytilde": 0x1EF9, "Ytilde": 0x1EF8,
    # Greek
    "alpha": 0x3B1, "beta": 0x3B2, "gamma": 0x3B3, "delta": 0x3B4, "epsilon": 0x3B5, "zeta": 0x3B6, "eta": 0x3B7, "theta": 0x3B8, "iota": 0x3B9, "kappa": 0x3BA, "lambda": 0x3BB, "mu": 0x3BC,
    "nu": 0x3BD, "xi": 0x3BE, "omicron": 0x3BF, "pi": 0x3C0, "rho": 0x3C1, "sigma1": 0x3C2, "sigma": 0x3C3, "tau": 0x3C4, "upsilon": 0x3C5, "phi": 0x3C6, "chi": 0x3C7, "psi": 0x3C8, "omega": 0x3C9,
    "Alpha": 0x391, "Beta": 0x392, "Gamma": 0x393, "Delta": 0x394, "Epsilon": 0x395, "Zeta": 0x396, "Eta": 0x397, "Theta": 0x398, "Iota": 0x399, "Kappa": 0x39A, "Lambda": 0x39B, "Mu": 0x39C,
    "Nu": 0x39D, "Xi": 0x39E, "Omicron": 0x39F, "Pi": 0x3A0, "Rho": 0x3A1, "Sigma": 0x3A3, "Tau": 0x3A4, "Upsilon": 0x3A5, "Phi": 0x3A6, "Chi": 0x3A7, "Psi": 0x3A8, "Omega": 0x3A9,
    "alphatonos": 0x3AC, "epsilontonos": 0x3AD, "etatonos": 0x3AE, "iotatonos": 0x3AF, "omicrontonos": 0x3CC, "upsilontonos": 0x3CD, "omegatonos": 0x3CE,
    "iotadieresis": 0x3CA, "upsilondieresis": 0x3CB, "iotadieresistonos": 0x390, "upsilondieresistonos": 0x3B0,
    "Alphatonos": 0x386, "Epsilontonos": 0x388, "Etatonos": 0x389, "Iotatonos": 0x38A, "Omicrontonos": 0x38C, "Upsilontonos": 0x38E, "Omegatonos": 0x38F, "Iotadieresis": 0x3AA, "Upsilondieresis": 0x3AB,
    # Cyrillic
    "afii10017": 0x410, "afii10018": 0x411, "afii10019": 0x412, "afii10020": 0x413, "afii10021": 0x414, "afii10022": 0x415, "afii10024": 0x416, "afii10025": 0x417, "afii10026": 0x418, "afii10027": 0x419,
    "afii10028": 0x41A, "afii10029": 0x41B, "afii10030": 0x41C, "afii10031": 0x41D, "afii10032": 0x41E, "afii10033": 0x41F, "afii10034": 0x420, "afii10035": 0x421, "afii10036": 0x422, "afii10037": 0x423,
    "afii10038": 0x424, "afii10039": 0x425, "afii10040": 0x426, "afii10041": 0x427, "afii10042": 0x428, "afii10043": 0x429, "afii10044": 0x42A, "afii10045": 0x42B, "afii10046": 0x42C, "afii10047": 0x42D,
    "afii10048": 0x42E, "afii10049": 0x42F,
    "afii10065": 0x430, "afii10066": 0x431, "afii10067": 0x432, "afii10068": 0x433, "afii10069": 0x434, "afii10070": 0x435, "afii10072": 0x436, "afii10073": 0x437, "afii10074": 0x438, "afii10075": 0x439,
    "afii10076": 0x43A, "afii10077": 0x43B, "afii10078": 0x43C, "afii10079": 0x43D, "afii10080": 0x43E, "afii10081": 0x43F, "afii10082": 0x440, "afii10083": 0x441, "afii10084": 0x442, "afii10085": 0x443,
    "afii10086": 0x444, "afii10087": 0x445, "afii10088": 0x446, "afii10089": 0x447, "afii10090": 0x448, "afii10091": 0x449, "afii10092": 0x44A, "afii10093": 0x44B, "afii10094": 0x44C, "afii10095": 0x44D,
    "afii10096": 0x44E, "afii10097": 0x44F,
    "afii10023": 0x401, "afii10071": 0x451, "afii10053": 0x404, "afii10101": 0x454, "afii10055": 0x406, "afii10103": 0x456, "afii10056": 0x407, "afii10104": 0x457, "afii10050": 0x490, "afii10100": 0x491,
    "afii10062": 0x40E, "afii10110": 0x45E,
})
