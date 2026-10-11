"""Edge-on side views for the shield page's SideView: the iPhone 18 Pro standing upright, seen exactly from the
side so only its edge shows, alone and with suñůlink.shield, at the same orthographic scale.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/shield/sideview.py

Writes sidev_phone.png, sidev_shield.png (transparent, 2x) and sidev.json to sites/khensu-nu/public/khensu/shell/.
PREVIEW=1 renders at 40% with few samples; RENDER_OUT overrides the folder.
"""

import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shield as S  # noqa: E402

P = S.P
OUT = Path(os.environ.get("RENDER_OUT", S.ROOT / "sites/khensu-nu/public/khensu/shell"))
FRAME_W, FRAME_H = 32.0, 160.0  # mm in the frame, the phone's length vertical
RES_W, RES_H = 360, 1800  # 2x of a 180 x 900 CSS box
SIDE = float(os.environ.get("SIDE", "1"))  # +1: the edge with the action button and volume, back to the left
CENTRE_Z = -0.5  # mm in the CAD frame (the phone's back is z = 0): the frame's horizontal centre


def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    P._cycles(s, 256)
    s.cycles.transparent_max_bounces = 16
    s.render.film_transparent = True
    s.render.resolution_x, s.render.resolution_y = RES_W, RES_H
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    if os.environ.get("PREVIEW"):
        s.render.resolution_percentage = 40
        s.cycles.samples = 24
    return s


def build(with_shield):
    s = scene()
    # Upright: the CAD's +Y (the phone's top) to world +Z, its back (+Z) to world -Y.
    rig = bpy.data.objects.new("rig", None)
    s.collection.objects.link(rig)
    P.build_phone("burgundy").parent = rig
    if with_shield:
        root, _ = S.build_shield("maroon", "standard")
        root.parent = rig
    rig.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.view_layer.update()

    # Looking straight at one side edge: SIDE +1 looks along -X, the back to the left of the frame.
    target = rig.matrix_world @ Vector((0, 0, CENTRE_Z))
    cam = bpy.data.cameras.new("side")
    cam.type = "ORTHO"
    cam.ortho_scale = FRAME_H
    cam.clip_start, cam.clip_end = 1, 2000
    o = bpy.data.objects.new("side", cam)
    s.collection.objects.link(o)
    o.location = target + Vector((600 * SIDE, 0, 0))
    o.rotation_euler = Vector((-SIDE, 0, 0)).to_track_quat("-Z", "Y").to_euler()
    s.camera = o
    # The flat side faces the lens, so its colour and gradient are the soft panel behind the camera; the strips
    # draw the rounded edges either side.
    P.studio(s, 1.0, camera=(SIDE, 0, 0), target=target, key=0.5, front=0.6, sheen=1.6, side=0.0,
             world_strength=0.3, rim=1.2)
    return s


def render(name, with_shield):
    s = build(with_shield)
    s.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True)
    print("wrote", name, flush=True)


OUT.mkdir(parents=True, exist_ok=True)
render("sidev_phone.png", False)
render("sidev_shield.png", True)
mm = RES_H / FRAME_H
(OUT / "sidev.json").write_text(json.dumps({
    "width": RES_W, "height": RES_H, "px_per_mm": mm,
    "phone_mm": {"height": P.H, "depth": P.D, "lens_top": P.LENS_TOP},
    "shield_mm": {"thickness": S.T, "above_lens_tops": round(S.T - P.LENS_TOP, 2),
                  "total_depth": round(P.D + S.T, 2)},
    "views": [
        {"id": "phone", "src": "/khensu/shell/sidev_phone.png", "label": "iphone 18 pro",
         "alt": "iPhone 18 Pro in Burgundy standing upright, seen exactly from the side: only its thin aluminium "
                "edge and the camera lenses standing proud of the back."},
        {"id": "shield", "src": "/khensu/shell/sidev_shield.png", "label": "with suñůlink.shield",
         "alt": "The same iPhone 18 Pro with suñůlink.shield attached, seen exactly from the side at the same scale: "
                "the shield covers the back below the camera, its face flush with the lens tops, so it adds no bump "
                "above the camera."},
    ],
}, indent=2, ensure_ascii=False))
print("wrote sidev.json", flush=True)
