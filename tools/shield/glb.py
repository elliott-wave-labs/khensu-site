"""suñůlink.shield GLBs for the buy page's <ew-viewer>: every finish and inlay tier, alone and on the iPhone.

Run tools/shield/inlay.py first, then:

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/shield/glb.py

The STLs share the CAD frame (millimetres, back of the shield at z = 4.2), so they need no offset. Models are
written in metres, upright, with the back facing the viewer.
"""

import math
from pathlib import Path

import bmesh
import bpy

ROOT = Path(bpy.path.abspath("//")) if bpy.data.filepath else Path(__file__).resolve().parents[2]
D3 = ROOT / "sites/khensu-nu/public/khensu/shell/3d"
OUT = D3 / "glb"

FINISHES = {
    "maroon": ("#5e1a24", "titanium"),
    "gold": ("#bfa06a", "titanium"),
    "black": ("#232427", "titanium"),
    "brass": ("#ecd59c", "brass"),
}
MODELS = [
    ("maroon", "standard"), ("gold", "standard"), ("black", "standard"), ("brass", "standard"),
    ("maroon", "moldavite"), ("gold", "moldavite"), ("black", "moldavite"), ("brass", "moldavite"),
]
INLAY_R = 10.2  # mm: the ring's outer edge (51 of the mark's 60-unit radius on a 24 mm square)
INLAY_LIFT = 0.08  # mm above the back, so the inlay never z-fights with the metal


def linear(hex_):
    c = [int(hex_[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def image(name):
    img = bpy.data.images.load(str(D3 / name), check_existing=True)
    return img


def material(name, base, orm_name=None, coat=0.0, coat_rough=0.05, base_tex=None, metallic=0.0, roughness=0.5):
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
    if not orm_name:
        return m
    o = nt.nodes.new("ShaderNodeTexImage")
    o.image = image(orm_name)
    o.image.colorspace_settings.name = "Non-Color"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(o.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    return m


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
    bpy.ops.wm.stl_import(filepath=str(D3 / name))
    obj = bpy.context.selected_objects[0]
    clean(obj)
    return obj


def uv_project(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.002)
    bpy.ops.object.mode_set(mode="OBJECT")


def inlay_disc():
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
    obj.location.z = 4.2 + INLAY_LIFT
    return obj


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    OUT.mkdir(parents=True, exist_ok=True)

    housing = import_stl("housing.stl")
    uv_project(housing)
    phone = import_stl("phone.stl")
    phone.data.materials.append(material("iPhone", linear("#3a3b3e"), metallic=0.85, roughness=0.32))
    disc = inlay_disc()

    # Ceramic powder coat: an even, non-metallic satin with a soft sheen and no grain. Bare brass keeps a fine brush.
    body_mats = {
        f: material(f, linear(h), "brass-orm.jpg") if kind == "brass"
        # Gold ceramic carries metallic pigment; without it the coat reads as yellow paint.
        else material(f, linear(h), metallic=0.75, roughness=0.36, coat=0.25, coat_rough=0.35) if f == "gold"
        else material(f, linear(h), metallic=0.0, roughness=0.42, coat=0.25, coat_rough=0.35)
        for f, (h, kind) in FINISHES.items()
    }
    inlay_mats = {t: material(f"inlay-{t}", [1, 1, 1, 1], f"inlay-{t}-orm.png", coat=1.0, coat_rough=0.03,
                              base_tex=f"inlay-{t}.jpg") for t in ("standard", "moldavite")}

    # Upright, back towards the viewer: glTF's +Y is up and +Z faces the camera.
    rig = bpy.data.objects.new("suñůlink.shield", None)
    bpy.context.scene.collection.objects.link(rig)
    for o in (housing, phone, disc):
        o.parent = rig
    rig.rotation_euler = (math.radians(90), 0, 0)
    rig.scale = (0.001, 0.001, 0.001)

    for finish, tier in MODELS:
        housing.data.materials.clear()
        housing.data.materials.append(body_mats[finish])
        disc.data.materials.clear()
        disc.data.materials.append(inlay_mats[tier])
        for mode in ("shield", "phone"):
            phone.hide_set(mode == "shield")
            bpy.ops.object.select_all(action="DESELECT")
            for o in (rig, housing, disc) + ((phone,) if mode == "phone" else ()):
                o.select_set(True)
            path = OUT / f"{finish}-{tier}-{mode}.glb"
            bpy.ops.export_scene.gltf(
                filepath=str(path),
                export_format="GLB",
                use_selection=True,
                export_apply=True,
                export_yup=True,
                export_image_format="AUTO",
                export_materials="EXPORT",
            )
            print("wrote", path.name, path.stat().st_size)


main()
