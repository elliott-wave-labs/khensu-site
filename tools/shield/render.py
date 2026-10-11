"""Photoreal Cycles renders of suñůlink.shield for the site, from the GLBs that tools/shield/glb.py writes.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/shield/render.py -- [stills|turntable|all]

Writes WebP with alpha to sites/khensu-nu/public/khensu/renders/: hero, macro, phone, lineup stills and a
turntable sequence (turn/000.webp …) for the scroll-scrubbed hero. Lit with Blender's bundled studio HDRIs plus
three area lights; the page background is black, so the alpha edges blend into it.
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
GLB = ROOT / "sites/khensu-nu/public/khensu/shell/3d/glb"
OUT = ROOT / "sites/khensu-nu/public/khensu/renders"
WHAT = (sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "all")


def reset(w, h, samples=128):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("METAL", "OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            s.cycles.device = "GPU"
            break
        except TypeError:
            continue
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.render.resolution_x, s.render.resolution_y = w, h
    s.render.image_settings.file_format = "WEBP"
    s.render.image_settings.color_mode = "RGBA"
    s.render.image_settings.quality = 90
    try:
        s.view_settings.view_transform = "AgX"
        s.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    world = bpy.data.worlds.new("studio")
    s.world = world
    world.use_nodes = True
    nt = world.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    hdri = Path(bpy.utils.system_resource("DATAFILES", path="studiolights/world")) / "studio.exr"
    env.image = bpy.data.images.load(str(hdri))
    bg = next(n for n in nt.nodes if n.type == "BACKGROUND")
    bg.inputs["Strength"].default_value = 0.35
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    return s


def light(name, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, "AREA")
    l.energy, l.size, l.color = energy, size, color
    o = bpy.data.objects.new(name, l)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


def rig():
    light("key", (-0.35, -0.45, 0.4), 6, 0.5)
    light("rim", (0.4, 0.3, 0.25), 9, 0.25, (0.85, 0.9, 1))
    light("fill", (0.3, -0.5, -0.1), 1.2, 0.6)


def camera(loc, target=(0, 0, 0), lens=85, fstop=None):
    c = bpy.data.cameras.new("cam")
    c.lens = lens
    c.clip_start = 0.005
    if fstop:
        focus = bpy.data.objects.new("focus", None)
        bpy.context.scene.collection.objects.link(focus)
        focus.location = target
        c.dof.use_dof = True
        c.dof.focus_object = focus
        c.dof.aperture_fstop = fstop
    o = bpy.data.objects.new("cam", c)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = o
    return o


def load(name, x=0.0, turn=0.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(GLB / f"{name}.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    pivot = bpy.data.objects.new("pivot", None)
    bpy.context.scene.collection.objects.link(pivot)
    for o in new:
        if o.parent is None:
            o.parent = pivot
    # glTF imports use quaternions, so turn an Euler pivot instead.
    pivot.location.x = x
    pivot.rotation_euler.z = math.radians(turn)
    return pivot


def still(path):
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(OUT / path)
    bpy.ops.render.render(write_still=True)
    print("wrote", path)


def stills():
    # The back faces -Y in Blender after glTF import, so cameras sit on the -Y side.
    reset(1600, 2000)
    rig()
    load("maroon-standard-shield", turn=-28)
    camera((0.06, -0.42, 0.05), lens=70)
    still("hero.webp")

    reset(1600, 1200, 160)
    rig()
    load("brass-standard-shield", turn=-18)
    camera((0.03, -0.09, 0.025), target=(0, -0.0043, 0.0), lens=100, fstop=8)
    still("macro.webp")

    reset(1600, 2000)
    rig()
    load("maroon-standard-phone", turn=-35)
    camera((0.05, -0.42, 0.06), lens=70)
    still("phone.webp")

    reset(2400, 1200)
    rig()
    for i, f in enumerate(["maroon", "gold", "black", "brass"]):
        load(f"{f}-standard-shield", x=(i - 1.5) * 0.095, turn=-20)
    camera((0.0, -0.62, 0.08), lens=60)
    still("lineup.webp")


def turntable(frames=48):
    reset(1200, 1500, 64)
    rig()
    root = load("brass-standard-shield")
    camera((0.0, -0.42, 0.03), lens=70)
    for i in range(frames):
        root.rotation_euler.z = math.radians(-70 + 140 * i / (frames - 1))
        still(f"turn/{i:03d}.webp")


if WHAT in ("stills", "all"):
    stills()
if WHAT in ("turntable", "all"):
    turntable()
