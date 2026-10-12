"""Photoreal Cycles renders of suñůlink.shield for the site.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/shield/render.py -- [stills|turntable|og|all]

Builds the scene directly (the CAD's wrap housing and windows, its USB-C receptacle, the stone inlay and the
procedural iPhone 18 Pro from khensu-specs/hardware/sunu/photoreal.py) rather than from the web GLBs, so the
renders get the full-detail phone. Lit like apple.com's product shots: black, a big soft overhead key, thin strip
rims along the edges, low fill, a soft contact shadow and no visible floor, AgX. Writes WebP with alpha (the
macro flattened onto black) to sites/khensu-nu/public/khensu/renders/: hero, macro, phone, phone-front, ports, lineup,
og-maroon/og-brass PNGs, and turn/000.webp … for the scroll-scrubbed turntable.
"""

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shield as S  # noqa: E402

P = S.P
OUT = Path(os.environ.get("RENDER_OUT", S.ROOT / "sites/khensu-nu/public/khensu/renders"))
WHAT = (sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv[:-1] else "all")


def reset(w, h, samples=128):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    P._cycles(s, samples)
    s.cycles.transparent_max_bounces = 16
    s.render.film_transparent = True
    s.render.resolution_x, s.render.resolution_y = w, h
    s.render.image_settings.file_format = "WEBP"
    s.render.image_settings.color_mode = "RGBA"
    s.render.image_settings.quality = 90
    if os.environ.get("PREVIEW"):  # quick framing checks: 40% size, few samples
        s.render.resolution_percentage = 40
        s.cycles.samples = 16
    return s


def product(finish, tier="standard", phone=None, yaw=0.0, x=0.0, pitch=90.0):
    """The shield (and optionally an iPhone 18 Pro in `phone` colour) upright, back towards -Y, turned by `yaw`
    (`pitch` 0 lays it on its front, back up)."""
    rig = bpy.data.objects.new("rig", None)
    bpy.context.scene.collection.objects.link(rig)
    root, parts = S.build_shield(finish, tier)
    root.parent = rig
    if phone:
        P.build_phone(phone).parent = rig
    rig.rotation_euler = (math.radians(pitch), 0, math.radians(yaw))
    rig.location.x = x
    bpy.context.view_layer.update()
    return rig


def world_point(rig, local):
    bpy.context.view_layer.update()
    return rig.matrix_world @ Vector(local)


def floor(z):
    """A shadow catcher: the contact shadow survives in the alpha, the floor itself never shows."""
    bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, z))
    pl = bpy.context.active_object
    pl.is_shadow_catcher = True
    # A catcher still shades as a grey floor in reflections and bounce; on black there is no floor to see.
    pl.visible_glossy = pl.visible_diffuse = pl.visible_transmission = False
    return pl


# Little light reflected straight back at the lens: AgX bleaches a brightly lit red to pink, so the faces stay
# deep and the form comes from the overhead key, a soft side key and the strip rims.
LIGHT = dict(front=0.3, sheen=0.35, side=1.0, world_strength=0.12, rim=1.4)


# Bare brass has no diffuse to light: it shows only what it mirrors, so it gets the broad soft panel behind the
# camera at full strength and no small side key to blow out across the face.
BRASS_LIGHT = dict(sheen=1.6, front=0.8, side=0.0, world_strength=0.4)


def camera(loc, target, lens=85, fstop=None, **light):
    c = bpy.data.cameras.new("cam")
    c.lens = lens
    c.clip_start, c.clip_end = 1, 10000
    if fstop:
        c.dof.use_dof = True
        c.dof.focus_distance = (Vector(target) - Vector(loc)).length
        c.dof.aperture_fstop = fstop
    o = bpy.data.objects.new("cam", c)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = o
    P.studio(bpy.context.scene, 1.0, camera=(Vector(loc) - Vector(target)).normalized(), target=target,
             **{**LIGHT, **light})
    return o


def still(path):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / path).parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(OUT / path)
    bpy.ops.render.render(write_still=True)
    print("wrote", path, flush=True)


def flatten(path, size=None):
    """Composite a render onto black (RGB), optionally cropped to the subject and scaled to a height."""
    import numpy as np

    img = bpy.data.images.load(str(OUT / path))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    px[..., :3] *= px[..., 3:4] if not img.alpha_mode == "PREMUL" else 1
    px[..., 3] = 1
    out = bpy.data.images.new("flat", w, h, alpha=False)
    out.pixels.foreach_set(px.ravel())
    sc = bpy.context.scene
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.image_settings.color_mode = "RGB"
    out.save_render(str(OUT / path), scene=sc)


def crop_png(src, dst, height):
    """Crop a transparent render to its subject and save it as a PNG `height` px tall."""
    import numpy as np

    img = bpy.data.images.load(str(OUT / src))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    ys, xs = np.nonzero(px[..., 3] > 0.01)
    pad = 8
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w - 1)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h - 1)
    sub = np.ascontiguousarray(px[y0:y1 + 1, x0:x1 + 1])
    cw, ch = sub.shape[1], sub.shape[0]
    out = bpy.data.images.new("crop", cw, ch, alpha=True)
    out.pixels.foreach_set(sub.ravel())
    out.scale(round(cw * height / ch), height)
    sc = bpy.context.scene
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    out.save_render(str(OUT / dst), scene=sc)
    print("wrote", dst, flush=True)


SHIELD_MID = (0.0, 0.0, S.T / 2)  # the shield's centre in the CAD frame: it covers the whole back


def hero():
    # The maroon shield alone, turned to catch the strip lights down its long edge.
    reset(1600, 2000)
    rig = product("maroon", yaw=-38)
    t = world_point(rig, SHIELD_MID)
    floor(world_point(rig, (0, S.YMIN, 0)).z)
    camera(t + Vector((25, -370, 25)), t, 70)
    still("hero.webp")


def macro():
    # The inlay in brass, shallow depth of field on the platinum line.
    reset(1600, 1200, 160)
    rig = product("brass", yaw=-24)
    t = world_point(rig, (S.INLAY_C[0] + 6, S.INLAY_C[1], S.T))
    camera(t + Vector((34, -108, 66)), t, 100, 4.0, **BRASS_LIGHT)
    still("macro.webp")
    flatten("macro.webp")


def phone():
    # On the phone: maroon on Burgundy, three-quarter back.
    reset(1600, 2000)
    rig = product("maroon", phone="burgundy", yaw=-35)
    t = world_point(rig, (0, 0, 0))
    floor(world_point(rig, (0, -P.H / 2, 0)).z)
    camera(t + Vector((50, -470, 60)), t, 70)
    still("phone.webp")


def phone_front():
    # The front: the khensu.nu wallpaper on the display, the shield's edge showing behind.
    reset(1600, 2000)
    rig = product("maroon", phone="burgundy", yaw=180 + 24)
    t = world_point(rig, (0, 0, 0))
    floor(world_point(rig, (0, -P.H / 2, 0)).z)
    camera(t + Vector((-40, -470, 50)), t, 70)
    still("phone-front.webp")


def ports():
    # Lying on its front, the bottom edges to camera: the shield's USB-C plug-through above the iPhone's own port.
    reset(1600, 1200, 160)
    rig = product("maroon", phone="burgundy", yaw=28, pitch=0)
    t = world_point(rig, (-14, -P.H / 2 + 14, 3.0))
    floor(world_point(rig, (0, 0, -P.D)).z)
    camera(t + Vector((-80, -235, 72)), t, 85, 4.0, side=1.4, front=0.8, key=0.45)
    still("ports.webp")


def lineup():
    reset(2400, 1200)
    for i, f in enumerate(["maroon", "gold", "black", "brass"]):
        rig = product(f, x=(i - 1.5) * 92, yaw=-20)
    t = Vector((0, 0, world_point(rig, SHIELD_MID).z))
    floor(world_point(rig, (0, S.YMIN, 0)).z)
    camera(t + Vector((0, -700, 80)), t, 60, sheen=0.9, world_strength=0.24)
    still("lineup.webp")


def stills():
    for f in (hero, macro, phone, phone_front, ports, lineup):
        if not os.environ.get("SHOTS") or f.__name__ in os.environ["SHOTS"].split(","):
            f()


def turntable(frames=48):
    reset(1200, 1500, 64)
    rig = product("brass")
    t = world_point(rig, SHIELD_MID)
    floor(world_point(rig, (0, S.YMIN, 0)).z)
    camera(t + Vector((0, -400, 25)), t, 70, **BRASS_LIGHT)
    for i in range(frames):
        rig.rotation_euler.z = math.radians(-70 + 140 * i / (frames - 1))
        still(f"turn/{i:03d}.webp")


def og():
    # Link-preview cut-outs: the shield on an iPhone 18 Pro in the matching colour, on transparency, cropped to it,
    # 1100 px tall.
    for finish, yaw in (("maroon", -30), ("brass", -30)):
        reset(1100, 2000, 160)
        bpy.context.scene.render.image_settings.file_format = "PNG"
        rig = product(finish, phone=S.PHONE_FOR[finish], yaw=yaw)
        t = world_point(rig, (0, 0, 0))
        camera(t + Vector((40, -470, 50)), t, 70, **(BRASS_LIGHT if finish == "brass" else {}))
        still(f"og-{finish}-full.png")
        crop_png(f"og-{finish}-full.png", f"og-{finish}.png", 1100)
        (OUT / f"og-{finish}-full.png").unlink()


S.sync_cad()
if WHAT in ("stills", "all"):
    stills()
if WHAT in ("og", "all"):
    og()
if WHAT in ("turntable", "all"):
    turntable()
