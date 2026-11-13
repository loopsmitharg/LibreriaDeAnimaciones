"""
Paso 3: capturas de verificación del .blend (frontal, lateral, tres cuartos, posterior, presets) y silueta frontal.
    blender --background loopsmith-3d.blend --python verify_render.py
Las imágenes quedan en ../assets/previews/blender-*.png. La silueta frontal se compara después con compare_silhouette.py.
"""
import bpy, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "previews"))
sc = bpy.context.scene
target = bpy.data.objects.new("verify_target", None); sc.collection.objects.link(target)
cam_data = bpy.data.cameras.new("verify_cam"); cam = bpy.data.objects.new("verify_cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
tt = cam.constraints.new("TRACK_TO"); tt.target = target; tt.track_axis = "TRACK_NEGATIVE_Z"; tt.up_axis = "UP_Y"

# --- silueta frontal: ortográfica, plano, fondo transparente (comparación geométrica, sin sombreado)
sc.render.engine = "BLENDER_WORKBENCH"; sc.render.film_transparent = True
sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "SINGLE"; sc.display.shading.single_color = (1, 1, 1)
sc.display.render_aa = "OFF"
cam_data.type = "ORTHO"; cam_data.ortho_scale = 4.0; cam.location = (0, -10, 0); sc.render.resolution_x, sc.render.resolution_y = 2400, 840
sc.render.resolution_percentage = 100; sc.render.filepath = os.path.join(OUT, "blender-silhouette-front.png"); sc.render.image_settings.file_format = "PNG"
cam.constraints.clear(); cam.rotation_euler = (math.pi / 2, 0, 0)
bpy.ops.render.render(write_still=True)

# --- vistas con materiales (EEVEE) e iluminación de estudio
cam.constraints.clear(); tt = cam.constraints.new("TRACK_TO"); tt.target = target; tt.track_axis = "TRACK_NEGATIVE_Z"; tt.up_axis = "UP_Y"
cam_data.type = "PERSP"; cam_data.lens = 70
sc.world = bpy.data.worlds.new("studio"); sc.world.use_nodes = True
# Entorno de estudio: degradado vertical (suelo oscuro, "softbox" arriba). Los metales y el vidrio necesitan algo que reflejar.
nt = sc.world.node_tree; bg = nt.nodes["Background"]
tc = nt.nodes.new("ShaderNodeTexCoord"); gr = nt.nodes.new("ShaderNodeTexGradient"); gr.gradient_type = "LINEAR"
mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, math.radians(-90), 0)
ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (.02, .022, .03, 1); ramp.color_ramp.elements[1].color = (1.6, 1.65, 1.7, 1)
ramp.color_ramp.elements[0].position = .42; ramp.color_ramp.elements[1].position = .8
nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], gr.inputs["Vector"]); nt.links.new(gr.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
def light(name, kind, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, kind); l.energy = energy; l.color = color
    if kind == "AREA": l.size = size
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
    c = o.constraints.new("TRACK_TO"); c.target = target; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
light("key", "AREA", (-3.2, -4.5, 3.0), 520, 3.0); light("rim", "AREA", (4.5, 3.0, 2.0), 700, 2.0, (.8, 1, .75)); light("fill", "AREA", (3.2, -4.0, .2), 160, 4.0)
sc.render.film_transparent = False
try: sc.render.engine = "BLENDER_EEVEE"
except TypeError: sc.render.engine = "BLENDER_EEVEE_NEXT"
sc.render.resolution_x, sc.render.resolution_y = 1400, 700

SLOTS = {"Symbol_Body": "symbol", "Symbol_L": "ink"}
def apply(preset):
    for ob in bpy.data.objects:
        if ob.type != "MESH": continue
        slot = SLOTS.get(ob.name) or ("smith" if ob["ls_word"] == 1 else "loop")
        ob.data.materials.clear(); ob.data.materials.append(bpy.data.materials[f"LS_{preset}_{slot}"])

def shot(name, preset, loc, lens=70):
    apply(preset); cam_data.lens = lens; cam.location = loc
    target.location = (0, 0, 0); sc.render.filepath = os.path.join(OUT, f"blender-{name}.png"); bpy.ops.render.render(write_still=True)

shot("front", "original", (0, -9.5, .1)); shot("side", "original", (9.5, 0, 0), 90)
shot("threequarter", "original", (4.2, -7.0, 3.4)); shot("back", "original", (-3.5, 8.5, 1.4))
for p in ("black", "lime", "chrome", "glass", "porcelain"): shot(f"preset-{p}", p, (4.2, -7.0, 3.4))
print("VERIFY_RENDERS_OK")
