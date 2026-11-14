"""
Sneaker 3D — estudio de verificación (EEVEE) y renders de las 8 vistas + macros con luz rasante.
Uso:  exec(open(".../render.py").read(), {"SHOTS": ["lateral", ...] o None para todas, "RES": 1600})
"""
import bpy, os
from math import radians
from mathutils import Vector

OUT = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath), "..", "previews", "blender")); os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
C0 = Vector((.145, 0, .075))                                                 # centro de la zapatilla

def studio():
    col = bpy.data.collections.get("Studio") or bpy.data.collections.new("Studio")
    if col.name not in sc.collection.children: sc.collection.children.link(col)
    for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
    def light(name, loc, power, size, color=(1, 1, 1)):
        d = bpy.data.lights.new(name, "AREA"); d.energy = power; d.size = size; d.color = color
        o = bpy.data.objects.new(name, d); o.location = loc; col.objects.link(o)
        o.rotation_euler = (C0 - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return o
    light("Key", (.25, -.75, .75), 9, .9, (1, .97, .93)); light("Fill", (.9, .55, .35), 2.5, 1.2, (.9, .95, 1))
    light("Rim", (-.75, .45, .55), 7, .5); light("Top", (.15, 0, 1.0), 3.5, 1.4)
    fm = bpy.data.materials.get("StudioFloor") or bpy.data.materials.new("StudioFloor"); fm.use_nodes = True
    b = next(n for n in fm.node_tree.nodes if n.type == "BSDF_PRINCIPLED"); b.inputs["Base Color"].default_value = (.5, .5, .5, 1); b.inputs["Roughness"].default_value = .6
    me = bpy.data.meshes.new("Floor"); me.from_pydata([(-4, -4, 0), (4, -4, 0), (4, 4, 0), (-4, 4, 0)], [], [(0, 1, 2, 3)]); me.materials.append(fm)
    col.objects.link(bpy.data.objects.new("Floor", me))
    w = sc.world or bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
    next(n for n in w.node_tree.nodes if n.type == "BACKGROUND").inputs[0].default_value = (.32, .32, .33, 1)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); col.objects.link(cam); sc.camera = cam; cam.data.lens = 85; cam.data.clip_start = .01
    try: sc.render.engine = "BLENDER_EEVEE"
    except TypeError: pass
    sc.view_settings.view_transform = "Standard"; sc.render.image_settings.file_format = "PNG"
    for k, v in (("use_raytracing", True), ("use_shadows", True)):
        if hasattr(sc.eevee, k): setattr(sc.eevee, k, v)
    return cam

VIEWS = {  # nombre: (dirección cámara->objeto invertida, distancia, objetivo, lente)
    "lateral": ((0, -1, .06), 1.25, C0, 85), "medial": ((0, 1, .06), 1.25, C0, 85), "front": ((1, 0, .12), 1.0, C0, 85), "heel": ((-1, 0, .12), 1.0, C0, 85),
    "top": ((0, -.02, 1), 1.25, C0, 85), "bottom": ((0, -.02, -1), 1.25, C0, 85), "three-quarter-front": ((.75, -1, .42), 1.3, C0, 85), "three-quarter-back": ((-.8, -1, .45), 1.3, C0, 85),
    "macro-mesh": ((.1, -1, .5), .2, Vector((.165, -.045, .085)), 100), "macro-laces": ((.3, -.5, 1), .2, Vector((.15, 0, .12)), 100),
    "macro-foam": ((-.2, -1, .1), .2, Vector((.06, -.05, .028)), 100), "macro-rubber": ((.25, -.3, -1), .22, Vector((.22, 0, .0)), 100),
    "macro-toe": ((1, -.6, .5), .22, Vector((.265, -.01, .05)), 100), "macro-heel": ((-.8, -.8, .4), .25, Vector((.02, -.02, .085)), 100),
}
def shots(names=None, res=1600):
    cam = sc.camera if sc.camera and sc.camera.name.startswith("Cam") else studio()
    sc.render.resolution_x = res; sc.render.resolution_y = int(res * .68); floor = bpy.data.objects["Floor"]
    for n in names or VIEWS:
        d, dist, tgt, lens = VIEWS[n]; d = Vector(d).normalized(); cam.location = Vector(tgt) + d * dist; cam.data.lens = lens
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler(); floor.hide_render = d.z < 0
        if n.startswith("macro"):                                              # luz rasante: revela el relieve de cada material
            k = bpy.data.objects["Key"]; old = k.location.copy(), k.rotation_euler.copy()
            side = Vector((d.y, -d.x, 0)).normalized(); k.location = Vector(tgt) + side * .5 + d * .12; k.rotation_euler = (Vector(tgt) - k.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(OUT, n + ".png"); bpy.ops.render.render(write_still=True)
        if n.startswith("macro"): k.location, k.rotation_euler = old
    floor.hide_render = False

if globals().get("SETUP", True): studio()
if globals().get("SHOTS", None) != []: shots(globals().get("SHOTS"), globals().get("RES", 1600))
