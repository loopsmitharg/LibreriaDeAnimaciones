"""
Piezas de apoyo para las escenas (modeladas en Blender): anillo ("loop"), losa y guijarro.
    blender --background --factory-startup --python build_props.py
Salida: loopsmith-props.blend y ../assets/models/loopsmith-props.glb (nodos Prop_Ring, Prop_Slab, Prop_Pebble)
"""
import bpy, bmesh, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "models", "loopsmith-props.glb"))
for o in list(bpy.data.objects): bpy.data.objects.remove(o)

mat = bpy.data.materials.new("LS_prop"); mat.use_nodes = True
b = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
b.inputs["Base Color"].default_value = (.012, .014, .02, 1); b.inputs["Roughness"].default_value = .32; b.inputs["Metallic"].default_value = .15


def finish(ob, name):
    ob.name = name; ob.data.name = name; ob.data.materials.clear(); ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth(); return ob


bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=.045, major_segments=128, minor_segments=24, rotation=(math.pi / 2, 0, 0))
ring = finish(bpy.context.active_object, "Prop_Ring"); bpy.ops.object.transform_apply(rotation=True)

bpy.ops.mesh.primitive_cube_add(size=1); slab = bpy.context.active_object; slab.scale = (.5, 1.1, .07); bpy.ops.object.transform_apply(scale=True)
bv = slab.modifiers.new("Bevel", "BEVEL"); bv.width = .022; bv.segments = 4; bv.limit_method = "ANGLE"
bpy.ops.object.modifier_apply(modifier="Bevel"); finish(slab, "Prop_Slab")

bpy.ops.mesh.primitive_ico_sphere_add(radius=.12, subdivisions=4); finish(bpy.context.active_object, "Prop_Pebble")

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "loopsmith-props.blend"), compress=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True)
print("PROPS_OK", os.path.getsize(OUT), "bytes", [o.name for o in bpy.data.objects], sum(len(o.data.polygons) for o in bpy.data.objects))
