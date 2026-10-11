"""suñůlink.shield in Blender, shared by glb.py and render.py.

The housing and its PC windows (Qi2 coil window, HaLow antenna band) are the CAD's wrap-xl for iPhone 18 Pro
(khensu-specs/hardware/sunu/sunu.py, out/iphone-18-pro/wrap-xl/), copied into the site's 3d folder; the USB-C
receptacle, the iPhone 18 Pro and the studio lights come from khensu-specs/hardware/sunu/photoreal.py. The repos
sit side by side, so the CAD is found at ../khensu-specs. Millimetres, the phone's back at z = 0 facing +Z, +Y up.
"""

import math
import shutil
import sys
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
SPECS = ROOT.parent / "khensu-specs/hardware/sunu"
CAD = SPECS / "out/iphone-18-pro/wrap-xl"
D3 = ROOT / "sites/khensu-nu/public/khensu/shell/3d"
sys.path.insert(0, str(SPECS))

import photoreal as P  # noqa: E402

def _wrap_xl():
    import json

    for phone in json.loads((SPECS / "out/summary.json").read_text())["phones"]:
        if phone["phone"]["name"] == "iphone-18-pro":
            return next(s for s in phone["styles"] if s["style"] == "wrap-xl")


T = _wrap_xl()["thickness_mm"]  # off the phone's back: level with the lens rings, no bump above the camera
YMIN = -74.58  # bottom edge of the shield's outline
INLAY_C = (0.0, -5.0)  # the inlay sits at the centre of the Qi2 coil window, on the MagSafe axis
INLAY_R = 10.2  # mm: the ring's outer edge (51 of the mark's 60-unit radius on a 24 mm square)
INLAY_LIFT = 0.04  # above the back, so the inlay never z-fights with the window

FINISHES = {
    "maroon": ("#5e1a24", "ceramic"),
    "gold": ("#bfa06a", "gold"),
    "black": ("#232427", "ceramic"),
    "brass": ("#ecd59c", "brass"),
}
# The iPhone 18 Pro colour each shield is shown on.
PHONE_FOR = {"maroon": "burgundy", "black": "black", "gold": "silver", "brass": "silver"}


def linear(hex_):
    c = [int(hex_[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def sync_cad():
    """Copy the current wrap-xl housing and windows into the site's 3d folder."""
    for name in ("housing", "window_inserts"):
        shutil.copyfile(CAD / f"{name}.stl", D3 / f"{name}.stl")


def image(name):
    return bpy.data.images.load(str(D3 / name), check_existing=True)


def material(name, base, orm=None, coat=0.0, coat_rough=0.05, base_tex=None, metallic=0.0, roughness=0.5):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = base
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = coat_rough
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if base_tex:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image(base_tex)
        nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    if orm:
        o = nt.nodes.new("ShaderNodeTexImage")
        o.image = image(orm)
        o.image.colorspace_settings.name = "Non-Color"
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(o.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    return m


def brushed(m):
    """Cycles only: a linear brush along the shield's width, anisotropic highlights and a fine streaked bump."""
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tan = nt.nodes.new("ShaderNodeTangent")
    tan.direction_type, tan.axis = "RADIAL", "Y"
    nt.links.new(tan.outputs["Tangent"], bsdf.inputs["Tangent"])
    bsdf.inputs["Anisotropic"].default_value = 0.65
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.6, 90, 90)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6
    noise.inputs["Detail"].default_value = 8
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.01
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


# Path-traced in a black studio the ceramic takes its depth from the coat, so Cycles gets the deeper, true colour;
# the web viewer's brighter neutral environment wants the lighter hex.
CYCLES_BASE = {"maroon": (0.13, 0.012, 0.024, 1), "black": (0.012, 0.012, 0.013, 1)}


def body_material(finish, web=True):
    hex_, kind = FINISHES[finish]
    if kind == "brass":
        if not web:
            return brushed(material(f"shield {finish} cycles", linear(hex_), metallic=1.0, roughness=0.38))
        return material(f"shield {finish}", linear(hex_), "brass-orm.jpg")
    if kind == "gold":
        # Gold ceramic carries metallic pigment; without it the coat reads as yellow paint.
        return material(f"shield {finish}", linear(hex_), metallic=0.75, roughness=0.36, coat=0.25, coat_rough=0.35)
    # Ceramic powder coat: an even, non-metallic satin with a soft sheen and no grain.
    if not web:
        return material(f"shield {finish} cycles", CYCLES_BASE[finish], metallic=0.0, roughness=0.38, coat=0.6, coat_rough=0.2)
    return material(f"shield {finish}", linear(hex_), metallic=0.0, roughness=0.42, coat=0.25, coat_rough=0.35)


def window_material(finish, web=True):
    """The PC windows are moulded in the shield's colour, so a ceramic back reads as one surface. Against bare
    metal (brass, gold) a coloured plastic would look like a patch, so there they are gloss black, an accent
    ring round the inlay and a band along the bottom."""
    hex_, kind = FINISHES[finish]
    if kind in ("brass", "gold"):
        return material(f"shield {finish} windows", linear("#0b0b0c"), metallic=0.0, roughness=0.18, coat=0.8, coat_rough=0.05)
    if not web:
        return material(f"shield {finish} windows cycles", CYCLES_BASE[finish], metallic=0.0, roughness=0.44, coat=0.5, coat_rough=0.25)
    return material(f"shield {finish} windows", linear(hex_), metallic=0.0, roughness=0.46, coat=0.25, coat_rough=0.35)


def inlay_material(tier):
    return material(f"inlay-{tier}", [1, 1, 1, 1], f"inlay-{tier}-orm.png", coat=1.0, coat_rough=0.03,
                    base_tex=f"inlay-{tier}.jpg")


def clean(obj, angle=32):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(angle))


def import_stl(name):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.wm.stl_import(filepath=str(D3 / f"{name}.stl"))
    obj = bpy.context.selected_objects[0]
    obj.name = f"shield {name}"
    clean(obj)
    return obj


def uv_project(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.002)
    bpy.ops.object.mode_set(mode="OBJECT")


def inlay_disc(parent):
    me = bpy.data.meshes.new("inlay")
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=192, radius=INLAY_R)
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            x, y = loop.vert.co.x, loop.vert.co.y
            loop[uv].uv = (0.5 + x / 24, 0.5 + y / 24)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("inlay", me)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = (*INLAY_C, T + INLAY_LIFT)
    obj.parent = parent
    return obj


def build_shield(finish="maroon", tier="standard", web=False, name="suñůlink.shield"):
    """The shield alone; returns (root, parts) with parts = housing, windows, port, inlay."""
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    housing = import_stl("housing")
    uv_project(housing)
    housing.data.materials.append(body_material(finish, web))
    windows = import_stl("window_inserts")
    windows.data.materials.append(window_material(finish, web))
    port = P.shield_port(root, YMIN, T, web=web)
    disc = inlay_disc(root)
    disc.data.materials.append(inlay_material(tier))
    for o in (housing, windows):
        o.parent = root
    return root, {"housing": housing, "windows": windows, "port": port, "inlay": disc}


def set_finish(parts, finish, tier, web=True):
    for key, mat in (("housing", body_material(finish, web)), ("windows", window_material(finish, web)), ("inlay", inlay_material(tier))):
        parts[key].data.materials.clear()
        parts[key].data.materials.append(mat)


def descendants(obj):
    out = [obj]
    for c in obj.children:
        out += descendants(c)
    return out
