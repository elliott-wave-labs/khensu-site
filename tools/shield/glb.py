"""suñůlink.shield GLBs for the buy page's <ew-viewer>: every finish and inlay tier, alone and on the iPhone.

Run tools/shield/inlay.py first, render the wallpapers once (khensu-specs/hardware/sunu/photoreal.py -- wallpaper),
then:

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/shield/glb.py

The shield is the CAD's wrap on the procedural iPhone 18 Pro from photoreal.py (web detail: fewer segments,
no lens iris, the wallpaper as a 640 px JPEG). Models are written in metres, upright, with the back facing the
viewer. Material "iPhone" is the phone's aluminium, so the page can repaint it.
"""

import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shield as S  # noqa: E402

P = S.P
OUT = S.D3 / "glb"
MODELS = [
    ("maroon", "standard"), ("glacier", "standard"), ("silver", "standard"), ("black", "standard"), ("brass", "standard"),
    ("maroon", "moldavite"), ("glacier", "moldavite"), ("silver", "moldavite"), ("black", "moldavite"), ("brass", "moldavite"),
]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    OUT.mkdir(parents=True, exist_ok=True)
    S.sync_cad()

    shield, parts = S.build_shield("maroon", "standard", web=True)
    phone = P.build_phone("burgundy", web=True)
    P.recolour("burgundy", web=True)

    # Upright, back towards the viewer: glTF's +Y is up and +Z faces the camera.
    rig = bpy.data.objects.new("suñůlink.shield on iPhone 18 Pro", None)
    bpy.context.scene.collection.objects.link(rig)
    shield.parent = rig
    phone.parent = rig
    rig.rotation_euler = (math.radians(90), 0, 0)
    rig.scale = (0.001, 0.001, 0.001)
    phone_objs = S.descendants(phone)

    for finish, tier in MODELS:
        S.set_finish(parts, finish, tier)
        P.recolour(S.PHONE_FOR[finish], web=True)
        for mode in ("shield", "phone"):
            for o in phone_objs:
                o.hide_set(mode == "shield")
            path = OUT / f"{finish}-{tier}-{mode}.glb"
            bpy.ops.export_scene.gltf(
                filepath=str(path),
                export_format="GLB",
                use_visible=True,
                export_apply=True,
                export_yup=True,
                export_image_format="AUTO",
                export_materials="EXPORT",
            )
            print("wrote", path.name, path.stat().st_size, flush=True)


main()
