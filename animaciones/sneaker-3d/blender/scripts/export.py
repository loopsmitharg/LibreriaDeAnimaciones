"""
Sneaker 3D — exportación GLB + maestro .blend.

Uso (dentro de Blender):  exec(open(".../export.py").read(), {"TARGETS": None})     # None = todos
Genera en ../models:
  sneaker-exploded.glb / -lite.glb        zapatilla derecha, piezas independientes con jerarquía (costuras hijas de su panel)
  sneaker-running-pair.glb / -lite.glb    par L + R, cada zapatilla una malla con skin (5 huesos de deformación)
Pasos por objetivo: generar (shoe.py) -> aplicar modificadores -> hornear AO a color de vértice (Cycles) -> [rig] -> exportar (Draco + WebP).
Al final reconstruye el maestro editable (R y L con modificadores vivos) y guarda sneaker-master.blend.
"""
import bpy, os, numpy as np

D = os.path.dirname(os.path.abspath(bpy.data.filepath)); SCR = os.path.join(D, "scripts"); MODELS = os.path.abspath(os.path.join(D, "..", "models")); os.makedirs(MODELS, exist_ok=True)
sc = bpy.context.scene
def run(name, **g):
    ns = dict(g); exec(compile(open(os.path.join(SCR, name), encoding="utf8").read(), name, "exec"), ns); return ns
def meshes(side): return [o for o in bpy.data.objects if o.type == "MESH" and o.name.endswith("_" + side)]
def select(objs):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def apply_mods(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.modifiers:
            me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); old = o.data; o.modifiers.clear(); o.data = me; bpy.data.meshes.remove(old)

def bake_ao(objs, samples=24, dist=.025):
    """Oclusión de contacto entre capas, a color de vértice: no necesita un segundo UV ni texturas por pieza."""
    eng = sc.render.engine; sc.render.engine = "CYCLES"; sc.cycles.samples = samples; sc.world.light_settings.distance = dist
    fl = bpy.data.objects.get("Floor"); hid = fl.hide_render if fl else None
    if fl: fl.hide_render = True
    for o in objs:
        a = o.data.color_attributes.new("AO", "BYTE_COLOR", "POINT"); o.data.color_attributes.active_color = a; o.data.color_attributes.render_color_index = list(o.data.color_attributes).index(a)
    for o in objs: select([o]); bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    if fl: fl.hide_render = hid
    sc.render.engine = eng

def rig(side, ns):
    """Une la zapatilla en una malla y la pesa a 5 huesos: Rear/Toe (flexión del antepié), *Cush (compresión de la espuma), Bow (moño)."""
    sm, zg, zf, WC = ns["smooth"], ns["zg"], ns["zf"], ns["WC"]; objs = meshes(side)
    K = ns["S"](np.array(ns["PT"]("L", .1005, "d", 0)), .0062)[0] * np.array([1, -1 if side == "L" else 1, 1])
    for o in objs:
        me = o.data; n = len(me.vertices); co = np.empty(n * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3) + WC[o.name]; x, z = co[:, 0], co[:, 2]; base = o.name[:-2]
        wt = sm(.165, .225, x)
        if base in ("Midsole", "Foam_Cushioning_Layer"): zb = zg(x) + .0045; wc = np.clip((z - zb) / (zf(x) - zb), 0, 1)
        elif base.startswith(("Outsole", "Shank")): wc = np.zeros(n)
        else: wc = np.ones(n)
        wb = sm(.004, .03, np.linalg.norm(co - K, axis=1)) * .85 if base in ("Lace_Bow", "Aglets") else np.zeros(n)
        W = {"Rear": (1 - wt) * (1 - wc), "RearCush": (1 - wt) * wc * (1 - wb), "Toe": wt * (1 - wc), "ToeCush": wt * wc, "Bow": (1 - wt) * wc * wb}
        for name, w in W.items():
            vg = o.vertex_groups.new(name=name)
            for lv in np.unique(np.round(w[w > .004], 2)): vg.add(np.nonzero(np.round(w, 2) == lv)[0].tolist(), float(lv), "REPLACE")
    root = bpy.data.objects[f"Sneaker_{side}"]; tops = [o for o in objs if o.parent == root]; select(objs); bpy.context.view_layer.objects.active = tops[0]; bpy.ops.object.join()
    mesh = tops[0]; mesh.name = f"Shoe_{side}"; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    arm = bpy.data.objects.new(f"Rig_{side}", bpy.data.armatures.new(f"Rig_{side}")); root.users_collection[0].objects.link(arm); arm.parent = root
    select([arm]); bpy.ops.object.mode_set(mode="EDIT"); eb = arm.data.edit_bones
    def bone(name, head, parent=None, deform=True):
        b = eb.new(name); b.head = head; b.tail = (head[0], head[1], head[2] + .03); b.parent = eb[parent] if parent else None; b.use_deform = deform; return b
    bone("Root", (.145, 0, 0), deform=False); bone("Rear", (.06, 0, 0), "Root"); bone("RearCush", (.06, 0, .04), "Rear"); bone("Toe", (.195, 0, .006), "Rear"); bone("ToeCush", (.24, 0, .03), "Toe"); bone("Bow", tuple(K), "RearCush")
    bpy.ops.object.mode_set(mode="OBJECT")
    mesh.parent = arm; m = mesh.modifiers.new("Armature", "ARMATURE"); m.object = arm
    return arm, mesh

def export(path, objs, skins=False):
    select(objs)
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=False, export_yup=True, export_materials="EXPORT", export_image_format="WEBP", export_image_quality=88,
              export_tangents=False, export_normals=True, export_texcoords=True, export_skins=skins, export_animations=False, export_morph=False,
              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14, export_draco_normal_quantization=10,
              export_draco_texcoord_quantization=12, export_draco_color_quantization=8, export_draco_generic_quantization=12)
    import logging; logging.disable(logging.CRITICAL)                          # el exportador es muy verboso
    try: bpy.ops.export_scene.gltf(**kw, export_vertex_color="ACTIVE", export_all_vertex_colors=False)
    except TypeError: bpy.ops.export_scene.gltf(**kw)
    finally: logging.disable(logging.NOTSET)
    print(f"  {os.path.basename(path)}  {os.path.getsize(path) / 1e6:.2f} MB")

TARGETS_ALL = {  # nombre: (tipo, QL, resolución de textura)
    "sneaker-exploded": ("parts", 1.0, 1024), "sneaker-exploded-lite": ("parts", .55, 512),
    "sneaker-running-pair": ("pair", .62, 1024), "sneaker-running-pair-lite": ("pair", .45, 512),
}
def clear(side):
    for o in [o for o in bpy.data.objects if o.name.endswith("_" + side)]: bpy.data.objects.remove(o, do_unlink=True)
def make(name):
    kind, ql, res = TARGETS_ALL[name]; print(name)
    run("materials.py", RES=res, OUTSUB="source" if res == 1024 else "mobile")
    out = []
    for side in ("R", "L") if kind == "pair" else ("R",):
        other = "L" if side == "R" else "R"
        for o in meshes(other): o.hide_render = True                           # el AO de cada pie no ve al otro
        ns = run("shoe.py", SIDE=side, QL=ql); objs = meshes(side); apply_mods(objs); bake_ao(objs)
        for o in meshes(other): o.hide_render = False
        root = bpy.data.objects[f"Sneaker_{side}"]
        if kind == "pair": arm, mesh = rig(side, ns); out += [root, arm, mesh]
        else: out += [root] + objs
    export(os.path.join(MODELS, name + ".glb"), out, skins=kind == "pair")

for t in globals().get("TARGETS") or list(TARGETS_ALL): make(t)
if globals().get("MASTER", True):                                               # maestro editable: R y L con modificadores vivos + texturas 1K
    clear("R"); clear("L"); run("materials.py", RES=1024, OUTSUB="source"); run("shoe.py", SIDE="R", QL=1.0); run("shoe.py", SIDE="L", QL=1.0)
    bpy.data.objects["Sneaker_L"].location.y = .13
    for b in (bpy.data.meshes, bpy.data.armatures):
        for d in [d for d in b if d.users == 0]: b.remove(d)
    bpy.ops.wm.save_mainfile(); print("maestro guardado")
