"""
Paso 2 del pipeline: modela el logo de Loop Smith en 3D y lo exporta a glTF.

    blender --background --factory-startup --python build_logo.py

Entrada : logo_polys.json (prepare_logo_polys.py) + ../assets/textures/symbol_gradient.png
Salida  : loopsmith-3d.blend (fuente editable, con todos los materiales de los presets)
          ../assets/models/loopsmith-logo.glb          Draco, para la web
          ../assets/models/loopsmith-logo.raw.glb      sin compresión
          ../assets/models/loopsmith-presets.json      materiales de los presets (los mismos de Blender)
          ../assets/models/loopsmith-logo.meta.json    transformaciones, pivotes y cajas de cada pieza
          ../assets/previews/blender-*.png             vistas de verificación

Escala: 1 unidad = lado del símbolo. Blender: X derecha, Z arriba, el frente mira a -Y. En el glTF (Y arriba)
el frente mira a +Z, así que (x, y, z)_blender -> (x, z, -y)_gltf. Toda la metadata exportada ya está en ejes glTF.

Jerarquía:  LoopSmith3D > Symbol (Symbol_Body, Symbol_L) · Wordmark (Letter_00..08) · Metadata
"""
import bpy, bmesh, json, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.normpath(os.path.join(HERE, "..", "assets", "models"))
PREVIEWS = os.path.normpath(os.path.join(HERE, "..", "assets", "previews"))
TEXTURE = os.path.normpath(os.path.join(HERE, "..", "assets", "textures", "symbol_gradient.png"))
os.makedirs(MODELS, exist_ok=True); os.makedirs(PREVIEWS, exist_ok=True)
DATA = json.load(open(os.path.join(HERE, "logo_polys.json"), encoding="utf-8"))

LETTER_DEPTH, LETTER_BEVEL = 0.11, 0.0125     # profundidad de las letras y radio del bisel (en lados de símbolo)
BODY_DEPTH, BODY_BEVEL = 0.16, 0.026
INK_DEPTH, INK_BEVEL = 0.034, 0.007
BEVEL_SEGMENTS, SHARP_ANGLE = 3, math.radians(48)

for o in list(bpy.data.objects): bpy.data.objects.remove(o)   # --factory-startup trae cubo, luz y cámara


# --------------------------------------------------------------------------- materiales
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c) + (1,)


S = lambda color, rough, metal=0, coat=0, coat_rough=.1, trans=0, ior=1.5: dict(color=color, roughness=rough, metallic=metal, coat=coat, coatRoughness=coat_rough, transmission=trans, ior=ior)
INK = "#152627"
PRESETS = {  # slots: loop ("Loop"), smith ("Smith"), symbol (cuerpo), ink (la L del símbolo)
    "original": dict(label="Original 3D", loop=S("#f1f5f9", .36, 0, .35, .12), smith=S("#a3e635", .4, 0, .35, .12), symbol=dict(S("#ffffff", .5, 0, .1, .25), texture="symbol_gradient.png"), ink=S(INK, .5)),
    "black": dict(label="Studio Black", loop=S("#0a0c11", .28, 0, 1, .06), smith=S("#0a0c11", .28, 0, 1, .06), symbol=S("#0a0c11", .26, 0, 1, .05), ink=S("#a3e635", .4, 0, .3, .1)),
    "lime": dict(label="Satin Lime", loop=S("#a3e635", .46, 0, .15, .2), smith=S("#a3e635", .46, 0, .15, .2), symbol=S("#a3e635", .42, 0, .2, .15), ink=S(INK, .5)),
    "chrome": dict(label="Chrome", loop=S("#f2f4f8", .06, 1), smith=S("#f2f4f8", .06, 1), symbol=S("#f2f4f8", .05, 1), ink=S("#1b2026", .14, 1)),
    "glass": dict(label="Glass", loop=S("#e4f6ec", .04, 0, 0, .1, 1, 1.5), smith=S("#d9f7a0", .04, 0, 0, .1, 1, 1.5), symbol=S("#e4f6ec", .04, 0, 0, .1, 1, 1.5), ink=S("#a3e635", .35, 0, .3, .1)),
    "porcelain": dict(label="Porcelain", loop=S("#f6f4ef", .17, 0, 1, .03), smith=S("#f6f4ef", .17, 0, 1, .03), symbol=S("#f6f4ef", .17, 0, 1, .03), ink=S(INK, .45, 0, .6, .05)),
}


def setin(node, names, value):
    for n in names:
        if n in node.inputs: node.inputs[n].default_value = value; return


MATS = {}
for pk, pv in PRESETS.items():
    for slot in ("loop", "smith", "symbol", "ink"):
        spec = pv[slot]; m = bpy.data.materials.new(f"LS_{pk}_{slot}"); m.use_nodes = True; m.use_fake_user = True
        bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        setin(bsdf, ["Base Color"], lin(spec["color"])); setin(bsdf, ["Metallic"], spec["metallic"]); setin(bsdf, ["Roughness"], spec["roughness"])
        setin(bsdf, ["Coat Weight", "Clearcoat"], spec["coat"]); setin(bsdf, ["Coat Roughness", "Clearcoat Roughness"], spec["coatRoughness"])
        setin(bsdf, ["Transmission Weight", "Transmission"], spec["transmission"]); setin(bsdf, ["IOR"], spec["ior"])
        if spec.get("texture"):
            img = bpy.data.images.load(TEXTURE); img.pack(); img.colorspace_settings.name = "sRGB"
            tex = m.node_tree.nodes.new("ShaderNodeTexImage"); tex.image = img; tex.extension = "EXTEND"
            m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        MATS[(pk, slot)] = m


# --------------------------------------------------------------------------- geometría
def link(ob, parent=None):
    bpy.context.scene.collection.objects.link(ob)
    if parent: ob.parent = parent
    return ob


def select_only(ob):
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob


def sheet(name, polys):
    """Polígonos con huecos -> malla plana en el plano XZ (cara hacia -Y), triangulada por el relleno de curvas de Blender."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "FRONT"
    for poly in polys:
        for ring in [poly["exterior"]] + poly["holes"]:
            sp = cu.splines.new("POLY"); sp.points.add(len(ring) - 1); sp.use_cyclic_u = True
            for p, (x, z) in zip(sp.points, ring): p.co = (x, z, 0, 1)
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob); select_only(ob)
    bpy.ops.object.convert(target="MESH"); ob = bpy.context.view_layer.objects.active
    ob.rotation_euler.x = math.pi / 2; bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    front = [f for f in bm.faces if f.normal.y > 0]                      # todas deben mirar a -Y
    if front: bmesh.ops.reverse_faces(bm, faces=front)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(ob.data); bm.free(); ob.data.name = name
    bpy.context.scene.collection.objects.unlink(ob)
    return ob


def extrude(ob, depth, bevel):
    bpy.context.scene.collection.objects.link(ob); select_only(ob)
    s = ob.modifiers.new("Solid", "SOLIDIFY"); s.thickness = depth; s.offset = 0; s.use_even_offset = False   # la hoja es plana: con even-offset un vértice degenerado dispara el espesor
    b = ob.modifiers.new("Bevel", "BEVEL"); b.width = bevel; b.segments = BEVEL_SEGMENTS
    b.limit_method = "ANGLE"; b.angle_limit = SHARP_ANGLE; b.affect = "EDGES"; b.miter_outer = "MITER_ARC"
    for m in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    # Sombreado: suave salvo en aristas vivas (el borde del bisel conserva su dureza controlada).
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.normal_update()
    for e in bm.edges:
        e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0) > SHARP_ANGLE)
    for f in bm.faces: f.smooth = True
    bm.to_mesh(ob.data); bm.free()
    return ob


def uv_planar(ob):
    me = ob.data; uv = me.uv_layers.new(name="UVMap")
    xs = [v.co.x for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    for loop in me.loops:
        c = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((c.x - x0) / (x1 - x0), (c.z - z0) / (z1 - z0))


def recenter(ob):
    select_only(ob); bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")


def rounded_rect(cx, cz, size, radius, steps=28):
    pts = []
    for ccx, ccz, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for i in range(steps + 1):
            a = math.radians(a0 + 90 * i / steps)
            pts.append([round(cx + ccx * (size / 2 - radius) + radius * math.cos(a), 5), round(cz + ccz * (size / 2 - radius) + radius * math.sin(a), 5)])
    return [{"exterior": pts, "holes": []}]


root = link(bpy.data.objects.new("LoopSmith3D", None))
symbol = link(bpy.data.objects.new("Symbol", None), root)
wordmark = link(bpy.data.objects.new("Wordmark", None), root)
meta_empty = link(bpy.data.objects.new("Metadata", None), root)
for e in (root, symbol, wordmark, meta_empty): e.empty_display_size = .15

# Símbolo: cuerpo (placa biselada con el degradado) + la "L" en relieve, hijos de un mismo grupo lógico.
S_ = DATA["symbol"]; scx = S_["x"] + .5
body = extrude(sheet("Symbol_Body", rounded_rect(scx, 0, 1, S_["radius"])), BODY_DEPTH, BODY_BEVEL)
uv_planar(body); recenter(body); body.parent = symbol
ink = extrude(sheet("Symbol_L", [{"exterior": S_["L"], "holes": []}]), INK_DEPTH, INK_BEVEL); recenter(ink)
ink.location.y = -(BODY_DEPTH / 2 + INK_DEPTH / 2 - .004)       # apoyada en la cara frontal, con un solape de .004
ink.parent = symbol
symbol.location = (scx, 0, 0)
for ch in (body, ink): ch.location.x -= scx                      # los hijos quedan relativos al grupo

letters = []
for L in DATA["letters"]:
    ob = extrude(sheet(L["id"], L["polys"]), LETTER_DEPTH, LETTER_BEVEL); recenter(ob)
    ob.parent = wordmark; ob.data.materials.append(MATS[("original", "smith" if L["word"] else "loop")])
    letters.append((L, ob))
body.data.materials.append(MATS[("original", "symbol")]); ink.data.materials.append(MATS[("original", "ink")])
bpy.context.view_layer.update()


# --------------------------------------------------------------------------- metadata (ejes glTF)
g = lambda v: [round(v.x, 5), round(v.z, 5), round(-v.y, 5)]          # Blender -> glTF
def piece_meta(ob, ident, char, index, word, mats):
    ws = [ob.matrix_world @ v.co for v in ob.data.vertices]
    mn = Vector((min(p.x for p in ws), min(p.y for p in ws), min(p.z for p in ws))); mx = Vector((max(p.x for p in ws), max(p.y for p in ws), max(p.z for p in ws)))
    ctr = (mn + mx) / 2; a, b = g(mn), g(mx)
    bb = [[min(a[i], b[i]) for i in range(3)], [max(a[i], b[i]) for i in range(3)]]
    dims = [round(bb[1][i] - bb[0][i], 5) for i in range(3)]
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return {"id": ident, "char": char, "index": index, "word": word, "position": g(ob.matrix_world.translation), "rotation": [0, 0, 0],
            "scale": [1, 1, 1], "center": g(ctr), "pivot": g(ob.matrix_world.translation), "bbox": bb, "dimensions": dims, "materials": mats, "triangles": tris}


meta = {"unit": "lado del símbolo = 1", "axes": "glTF (Y arriba, el frente mira a +Z)", "width": DATA["width"], "depth": {"letters": LETTER_DEPTH, "symbolBody": BODY_DEPTH, "symbolL": INK_DEPTH},
        "letters": [], "symbol": {}}
for L, ob in letters:
    m = piece_meta(ob, L["id"], L["char"], L["index"], L["word"], [ob.data.materials[0].name])
    meta["letters"].append(m)
    for k, v in (("ls_id", m["id"]), ("ls_char", m["char"]), ("ls_index", m["index"]), ("ls_word", m["word"]), ("ls_center", m["center"]), ("ls_pivot", m["pivot"]), ("ls_dimensions", m["dimensions"])): ob[k] = v
sym_parts = {}
for ob, name in ((body, "Symbol_Body"), (ink, "Symbol_L")):
    sym_parts[name] = piece_meta(ob, name, "L" if name == "Symbol_L" else "", 0, -1, [ob.data.materials[0].name])
mnx = min(p["bbox"][0][0] for p in sym_parts.values()); mxx = max(p["bbox"][1][0] for p in sym_parts.values())
mny = min(p["bbox"][0][1] for p in sym_parts.values()); mxy = max(p["bbox"][1][1] for p in sym_parts.values())
mnz = min(p["bbox"][0][2] for p in sym_parts.values()); mxz = max(p["bbox"][1][2] for p in sym_parts.values())
meta["symbol"] = {"id": "Symbol", "position": g(symbol.matrix_world.translation), "pivot": g(symbol.matrix_world.translation), "center": [round((mnx + mxx) / 2, 5), round((mny + mxy) / 2, 5), round((mnz + mxz) / 2, 5)],
                  "bbox": [[mnx, mny, mnz], [mxx, mxy, mxz]], "dimensions": [round(mxx - mnx, 5), round(mxy - mny, 5), round(mxz - mnz, 5)], "parts": sym_parts}
meta_empty["ls_meta"] = json.dumps({"letters": [m["id"] for m in meta["letters"]], "presets": list(PRESETS)}, ensure_ascii=False)
root["ls_name"] = "Loop Smith"; root["ls_unit"] = meta["unit"]; root["ls_axes"] = meta["axes"]
json.dump(meta, open(os.path.join(MODELS, "loopsmith-logo.meta.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump({"presets": PRESETS}, open(os.path.join(MODELS, "loopsmith-presets.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)

# --------------------------------------------------------------------------- informe de calidad de malla
report = []
for ob in [body, ink] + [o for _, o in letters]:
    bm = bmesh.new(); bm.from_mesh(ob.data)
    nm = sum(1 for e in bm.edges if not e.is_manifold); loose = sum(1 for v in bm.verts if not v.link_edges)
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    vol = bm.calc_volume(signed=True)                      # > 0: normales hacia afuera y malla cerrada
    report.append((ob.name, tris, nm, loose, round(vol, 5))); bm.free()
print("MESH_REPORT nombre | triángulos | aristas no-manifold | vértices sueltos | volumen")
for r in report: print("MESH_REPORT", *r)
print("TOTAL_TRIS", sum(r[1] for r in report))
BAD = [r[0] for r in report if r[2] or r[3] or r[4] <= 0]

# --------------------------------------------------------------------------- guardar y exportar
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "loopsmith-3d.blend"), compress=True)
common = dict(export_format="GLB", export_extras=True, export_apply=True, export_yup=True, export_materials="EXPORT", export_cameras=False, export_lights=False, use_visible=True)
raw = os.path.join(MODELS, "loopsmith-logo.raw.glb"); bpy.ops.export_scene.gltf(filepath=raw, **common)
dr = os.path.join(MODELS, "loopsmith-logo.glb")
bpy.ops.export_scene.gltf(filepath=dr, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                          export_draco_position_quantization=16, export_draco_normal_quantization=12, export_draco_texcoord_quantization=12, **common)
print("GLB_SIZES raw", os.path.getsize(raw), "draco", os.path.getsize(dr))

assert not BAD, f"malla defectuosa: {BAD}"
