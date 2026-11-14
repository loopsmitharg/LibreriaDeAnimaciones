"""
Coffee 3D Motion Lab — horneado de los materiales procedurales a mapas PBR y exportación GLB.

Pipeline (correr build.py para hacerlo todo):
  1. bake_roast(roast): hornea sobre el grano hero color (DIFFUSE/COLOR), roughness, normal (incluye el bump procedural) y height (EMIT).
  2. bake_ao(): oclusión ambiental geométrica del hero (hendidura), una sola vez.
  3. pack(roast): arma ORM (R=AO, G=roughness, B=metallic=0, el layout de glTF), guarda maestros PNG y versiones web (WebP 2K y 1K).
  4. export_all(): GLBs con Draco. Los UV son comunes a todas las variantes y LODs: las texturas se comparten.
Blender NO exporta los nodos procedurales a glTF: por eso lo que viaja a la web son estos mapas.
"""
import bpy, os, numpy as np

ROOT = "D:/Git/LibreriaDeAnimaciones/animaciones/coffee-3d/assets/"
TEX, MODELS = ROOT + "textures/", ROOT + "models/"
HERO = "Bean_00_clasico_hero"
SIZE = 2048


def _img(name, colorspace="Non-Color", size=SIZE):
    if name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[name])
    im = bpy.data.images.new(name, size, size, alpha=False); im.colorspace_settings.name = colorspace
    return im


def _select(objs):
    for o in bpy.context.scene.objects:
        o.hide_set(False); o.select_set(o in objs)


def _bake(ob, mat, im, typ, **kw):
    nt = mat.node_tree
    node = nt.nodes.get("BakeTarget") or nt.nodes.new("ShaderNodeTexImage"); node.name = "BakeTarget"; node.image = im
    nt.nodes.active = node; node.select = True
    _select([ob])
    bpy.context.view_layer.objects.active = ob
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.render.bake.margin = 24; sc.render.bake.use_selected_to_active = False
    bpy.ops.object.bake(type=typ, **kw)


def bake_roast(roast, samples=6):
    ob = bpy.data.objects[HERO]; mat = bpy.data.materials[f"Coffee_{roast}"]
    ob.data.materials.clear(); ob.data.materials.append(mat)
    bpy.context.scene.cycles.samples = samples
    _bake(ob, mat, _img(f"{roast}_color", "sRGB"), "DIFFUSE", pass_filter={"COLOR"})
    _bake(ob, mat, _img(f"{roast}_rough"), "ROUGHNESS")
    _bake(ob, mat, _img(f"{roast}_normal"), "NORMAL")
    nt = mat.node_tree; out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"); bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    nt.links.new(nt.nodes["HeightEmit"].outputs[0], out.inputs["Surface"])
    _bake(ob, mat, _img(f"{roast}_height"), "EMIT")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])


def bake_ao(samples=32):
    ob = bpy.data.objects[HERO]; mat = ob.data.materials[0]
    bpy.context.scene.cycles.samples = samples
    for o in bpy.context.scene.objects:                          # solo el hero: otros granos ensuciarían la oclusión
        o.hide_render = o.type == "MESH" and o != ob
    _bake(ob, mat, _img("bean_ao"), "AO")
    for o in bpy.context.scene.objects:
        o.hide_render = False


def _px(im):
    a = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(a); return a.reshape(-1, 4)


def _save(im, path, fmt="PNG", size=None, quality=90, px=None):
    px, n = (_px(im) if px is None else px), im.size[0]; size = size or n
    if size < n:                                                # reducción por promedio de bloques
        k = n // size; px = px.reshape(size, k, size, k, 4).mean((1, 3)).reshape(-1, 4)
    c = bpy.data.images.new("_tmp", size, size, alpha=False); c.colorspace_settings.name = im.colorspace_settings.name
    c.pixels.foreach_set(px.reshape(-1)); c.file_format = fmt; c.filepath_raw = path
    c.save(quality=quality) if fmt != "PNG" else c.save()
    bpy.data.images.remove(c)


def pack(roast):
    for d in ("baked", "web", "source"):
        os.makedirs(TEX + d, exist_ok=True)
    ao = _px(bpy.data.images["bean_ao"]); rough = _px(bpy.data.images[f"{roast}_rough"])
    orm = _img(f"{roast}_orm"); p = np.ones_like(ao)
    p[:, 0] = np.clip(.25 + .75 * ao[:, 0] ** 1.4, 0, 1)        # AO acotado: hunde la hendidura sin ensuciar el resto
    p[:, 1] = rough[:, 0]; p[:, 2] = 0
    orm.pixels.foreach_set(p.reshape(-1))
    cavity = _px(bpy.data.images[f"{roast}_color"])              # la luz directa no conoce el AO: la cavidad de la hendidura se oscurece en el albedo
    cavity[:, :3] *= (.5 + .5 * np.clip(ao[:, :1], 0, 1) ** 1.3)
    for kind in ("color", "normal", "orm"):
        im = bpy.data.images[f"{roast}_{kind}"]; px = cavity if kind == "color" else None
        _save(im, f"{TEX}baked/{roast}_{kind}.png", px=px)
        _save(im, f"{TEX}web/{roast}_{kind}_2k.webp", "WEBP", 2048, 92, px)
        _save(im, f"{TEX}web/{roast}_{kind}_1k.webp", "WEBP", 1024, 90, px)
    _save(bpy.data.images[f"{roast}_height"], f"{TEX}source/{roast}_height.png")
    _save(bpy.data.images[f"{roast}_rough"], f"{TEX}source/{roast}_roughness.png")
    _save(bpy.data.images["bean_ao"], f"{TEX}source/bean_ao.png")


def baked_material(roast, res="2k"):
    """Material glTF-compatible con los mapas horneados (lo que realmente se exporta)."""
    name = f"CoffeeBaked_{roast}_{res}"
    if name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[name])
    mat = bpy.data.materials.new(name); mat.use_nodes = True; nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

    def tex(kind, cs):
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = bpy.data.images.load(f"{TEX}web/{roast}_{kind}_{res}.webp", check_existing=True); n.image.reload()
        n.image.colorspace_settings.name = cs; return n

    nt.links.new(tex("color", "sRGB").outputs[0], bsdf.inputs["Base Color"])
    orm = tex("orm", "Non-Color"); sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(orm.outputs[0], sep.inputs[0])
    nt.links.new(sep.outputs[1], bsdf.inputs["Roughness"]); nt.links.new(sep.outputs[2], bsdf.inputs["Metallic"])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(tex("normal", "Non-Color").outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
    grp = bpy.data.node_groups.get("glTF Material Output")                    # el exportador lee la oclusión de este grupo
    if not grp:
        grp = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree"); grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = grp; nt.links.new(sep.outputs[0], g.inputs[0])
    return mat


def _export(path, objs, materials, draco=True):
    saved = {o: o.location.copy() for o in objs}
    _select(objs)
    for o in objs:
        o.location = (0, 0, 0)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                              export_materials="EXPORT" if materials else "NONE", export_image_format="WEBP" if materials else "AUTO",
                              export_tangents=True, export_normals=True, export_texcoords=True, export_vertex_color="NONE",
                              export_draco_mesh_compression_enable=draco, export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=12,
                              export_extras=True, export_cameras=False, export_lights=False, export_animations=False)
    for o, l in saved.items():
        o.location = l
    return os.path.getsize(path)


def export_all():
    os.makedirs(MODELS, exist_ok=True)
    by = lambda lod: [o for o in bpy.data.objects if o.get("lod") == lod]
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.data.materials.clear()
    out = {}
    out["variants"] = _export(MODELS + "coffee-beans-variants.glb", by("std") + by("crowd"), False)
    out["hero-variants"] = _export(MODELS + "coffee-beans-hero-variants.glb", by("hero"), False)
    hero = bpy.data.objects[HERO]; hero.data.materials.append(baked_material("medium", "2k"))
    out["hero"] = _export(MODELS + "coffee-bean-hero.glb", [hero], True)
    std = bpy.data.objects[HERO.replace("_hero", "_std")]; std.data.materials.append(baked_material("medium", "1k"))
    out["optimized"] = _export(MODELS + "coffee-bean-optimized.glb", [std], True)
    return out
