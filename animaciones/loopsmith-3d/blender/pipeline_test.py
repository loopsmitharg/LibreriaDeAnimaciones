"""Prueba del pipeline Blender -> GLB: una "L" extruida y biselada.
Uso:  blender --background --factory-startup --python pipeline_test.py
"""
import bpy, bmesh, os

HERE = os.path.dirname(os.path.abspath(__file__))
for o in list(bpy.data.objects): bpy.data.objects.remove(o)   # --factory-startup trae cubo, luz y cámara
pts = [(0, 0), (0.22, 0), (0.22, 0.8), (0.62, 0.8), (0.62, 1.0), (0, 1.0)]
me = bpy.data.meshes.new("T"); bm = bmesh.new()
bm.faces.new([bm.verts.new((x, 0, z)) for x, z in pts]); bm.normal_update(); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new("PipelineTest_L", me)
bpy.context.scene.collection.objects.link(ob); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
s = ob.modifiers.new("Solid", "SOLIDIFY"); s.thickness = 0.18; s.offset = 0
b = ob.modifiers.new("Bevel", "BEVEL"); b.width = 0.02; b.segments = 3; b.limit_method = 'ANGLE'
for m in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
mat = bpy.data.materials.new("T_Lime"); mat.use_nodes = True
pb = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
pb.inputs["Base Color"].default_value = (0.36, 0.8, 0.03, 1); pb.inputs["Metallic"].default_value = 0.2; pb.inputs["Roughness"].default_value = 0.35
ob.data.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "pipeline_test.blend"))
glb = os.path.join(HERE, "..", "assets", "models", "pipeline_test.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB')
print("PIPELINE_TEST", bpy.app.version_string, "verts", len(me.vertices), "faces", len(me.polygons),
      "dims", tuple(round(v, 3) for v in ob.dimensions), "glb_bytes", os.path.getsize(glb))
