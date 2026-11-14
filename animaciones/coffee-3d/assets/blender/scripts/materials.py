"""
Coffee 3D Motion Lab — material procedural PBR del café tostado (4 tostados) y rigs de luz/cámara para verificar.

El material trabaja en coordenadas de objeto (ruido 3D, sin costuras) y lee el atributo `bean` de la malla
(R: núcleo de la hendidura, G: valle) para que la textura acompañe a la forma:
  altura  = grano fino + ondulación media + poros (en parches) + arrugas a lo largo + microgrietas (en parches) + fibras de la hendidura
  color   = rampa de 3 tonos por tostado, oscurecida en grietas/poros, película clara (chaff) dentro de la hendidura
  rough   = base por tostado + variación + parches de aceite (tostados oscuros) + grietas y hendidura más secas
`bake.py` hornea este material a mapas; el .blend conserva los nodos editables.
"""
import bpy, math

def hexc(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v / 12.92) if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c) + (1,)

#            oscuro    base      claro     chaff    | rough  aceite  umbral-grietas  A.grietas  A.poros  A.arrugas  chaff
ROASTS = {
    "light":    (("573418", "7c4f27", "976636", "d6b784"), .80, .00, .74, .0030, .0016, .0026, .90),
    "medium":   (("2c170b", "45270f", "5a3418", "b8925e"), .68, .12, .64, .0038, .0022, .0020, .70),
    "dark":     (("170b05", "291407", "38190b", "80583a"), .52, .50, .52, .0048, .0028, .0015, .45),
    "espresso": (("0b0503", "170b06", "221009", "4f3520"), .44, .78, .46, .0052, .0030, .0012, .25),
}


def build_material(roast):
    cols, rbase, oil, crack_thr, a_crack, a_pore, a_wr, chaff = ROASTS[roast]
    name = f"Coffee_{roast}"
    if name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[name])
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    X = [0]

    def N(t, **kw):
        n = nt.nodes.new(t); X[0] += 40; n.location = (X[0], (X[0] * 7) % 600)
        for k, v in kw.items():
            setattr(n, k, v)
        return n

    def link(src, dst):
        if isinstance(src, (int, float)):
            dst.default_value = src
        else:
            nt.links.new(src, dst)

    def M(op, a, b=None, clamp=False):
        n = N("ShaderNodeMath", operation=op, use_clamp=clamp); link(a, n.inputs[0])
        if b is not None:
            link(b, n.inputs[1])
        return n.outputs[0]

    def smooth(x, lo, hi):                                # smoothstep(lo, hi, x) -> 0..1
        n = N("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP"); link(x, n.inputs[0]); n.inputs[1].default_value = lo; n.inputs[2].default_value = hi
        return n.outputs[0]

    def noise(vec, scale, detail=3., rough=.55, typ="FBM"):
        n = N("ShaderNodeTexNoise", noise_dimensions="3D"); n.noise_type = typ; link(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough
        return n

    def mixc(f, a, b):
        n = N("ShaderNodeMix", data_type="RGBA"); link(f, n.inputs[0])
        for s, v in ((n.inputs[6], a), (n.inputs[7], b)):
            if isinstance(v, tuple): s.default_value = v
            else: nt.links.new(v, s)
        return n.outputs[2]

    def mixf(f, a, b):
        n = N("ShaderNodeMix", data_type="FLOAT"); link(f, n.inputs[0]); link(a, n.inputs[2]); link(b, n.inputs[3]); return n.outputs[0]

    def mapped(vec, sc):
        n = N("ShaderNodeMapping"); link(vec, n.inputs["Vector"]); n.inputs["Scale"].default_value = sc; return n.outputs["Vector"]

    P = N("ShaderNodeTexCoord").outputs["Object"]
    att = N("ShaderNodeAttribute", attribute_name="bean"); sep = N("ShaderNodeSeparateColor"); link(att.outputs["Color"], sep.inputs[0])
    core, valley = sep.outputs[0], sep.outputs[1]

    grain = noise(P, 190, 3).outputs["Fac"]
    mid = noise(P, 9, 4).outputs["Fac"]
    patch = noise(mapped(P, (1, 1, 1)), 3.6, 2).outputs["Fac"]
    patch2 = noise(mapped(P, (1.3, .8, 1.1)), 5.2, 2).outputs["Fac"]
    # dominio deformado: las grietas no quedan como celdas perfectas
    wn = noise(P, 7, 2); wv = N("ShaderNodeVectorMath", operation="SCALE"); link(wn.outputs["Color"], wv.inputs[0]); wv.inputs["Scale"].default_value = .05
    P2 = N("ShaderNodeVectorMath", operation="ADD"); link(P, P2.inputs[0]); link(wv.outputs[0], P2.inputs[1]); P2 = P2.outputs[0]

    vor = N("ShaderNodeTexVoronoi", feature="F1"); link(P2, vor.inputs["Vector"]); vor.inputs["Scale"].default_value = 150
    pit = M("MULTIPLY", M("SUBTRACT", 1, smooth(vor.outputs["Distance"], .05, .34)), smooth(noise(P, 17, 2).outputs["Fac"], .5, .66))
    cr1 = N("ShaderNodeTexVoronoi", feature="DISTANCE_TO_EDGE"); link(P2, cr1.inputs["Vector"]); cr1.inputs["Scale"].default_value = 10
    cr2 = N("ShaderNodeTexVoronoi", feature="DISTANCE_TO_EDGE"); link(P2, cr2.inputs["Vector"]); cr2.inputs["Scale"].default_value = 27
    crack_mask = smooth(patch, crack_thr, crack_thr + .12)
    crack = M("MULTIPLY", M("MAXIMUM", M("SUBTRACT", 1, smooth(cr1.outputs["Distance"], 0, .05)),
                            M("MULTIPLY", M("SUBTRACT", 1, smooth(cr2.outputs["Distance"], 0, .07)), .5)), crack_mask)
    leather = M("MINIMUM", noise(P2, 24, 3, .6, "RIDGED_MULTIFRACTAL").outputs["Fac"], 1.2)                  # venas tipo cuero: la piel arrugada del tostado
    wr = noise(mapped(P, (42, 15, 42)), 1, 3).outputs["Fac"]
    ridge = M("SUBTRACT", 1, M("MULTIPLY", M("ABSOLUTE", M("SUBTRACT", wr, .5)), 2))        # crestas finas a lo largo del grano
    fiber = noise(mapped(P, (130, 5, 130)), 1, 2).outputs["Fac"]

    h = M("MULTIPLY", M("SUBTRACT", grain, .5), .0011)
    h = M("ADD", h, M("MULTIPLY", M("SUBTRACT", mid, .5), .006))
    h = M("ADD", h, M("MULTIPLY", M("SUBTRACT", noise(P, 26, 3).outputs["Fac"], .5), .0035))
    h = M("SUBTRACT", h, M("MULTIPLY", pit, a_pore * .6))
    h = M("SUBTRACT", h, M("MULTIPLY", M("MULTIPLY", leather, .003), M("SUBTRACT", 1, valley)))
    h = M("ADD", h, M("MULTIPLY", M("MULTIPLY", M("SUBTRACT", ridge, .6), a_wr * .6), M("SUBTRACT", 1, valley)))
    h = M("SUBTRACT", h, M("MULTIPLY", crack, a_crack))
    h = M("ADD", h, M("MULTIPLY", M("MULTIPLY", M("SUBTRACT", fiber, .5), .004), valley))
    bump = N("ShaderNodeBump"); bump.inputs["Strength"].default_value = 1; bump.inputs["Distance"].default_value = 1; link(h, bump.inputs["Height"])

    # Color
    tone = M("ADD", M("MULTIPLY", mid, .55), M("ADD", M("MULTIPLY", patch2, .35), M("MULTIPLY", grain, .1)))
    tone = M("ADD", M("MULTIPLY", M("SUBTRACT", tone, .5), 1.7), .5)                        # más contraste tonal entre zonas
    ramp = N("ShaderNodeValToRGB"); link(tone, ramp.inputs[0]); e = ramp.color_ramp.elements
    e[0].position = .32; e[0].color = hexc(cols[0]); e[1].position = .68; e[1].color = hexc(cols[2]); m = ramp.color_ramp.elements.new(.5); m.color = hexc(cols[1])
    col = mixc(M("MULTIPLY", crack, .6), ramp.outputs["Color"], hexc(cols[0]))
    col = mixc(M("MULTIPLY", pit, .35), col, hexc(cols[0]))
    col = mixc(M("MULTIPLY", smooth(leather, .55, 1.1), .3), col, hexc(cols[0]))
    col = mixc(M("MULTIPLY", smooth(ridge, .75, 1), .18), col, hexc(cols[2]))                # crestas gastadas, apenas más claras
    chaff_f = M("MULTIPLY", M("MULTIPLY", smooth(core, .05, .6), M("ADD", .5, M("MULTIPLY", fiber, .5))), chaff, clamp=True)
    col = mixc(chaff_f, col, hexc(cols[3]))

    # Roughness
    r = M("ADD", rbase, M("ADD", M("MULTIPLY", M("SUBTRACT", grain, .5), .16), M("ADD", M("MULTIPLY", M("SUBTRACT", mid, .5), .14), M("MULTIPLY", M("SUBTRACT", patch2, .5), .28))))
    oilm = M("MULTIPLY", smooth(noise(mapped(P, (1, .7, 1)), 4.4, 3).outputs["Fac"], .46, .6), oil)
    r = mixf(oilm, r, .2)                                                                    # parches de aceite: brillo localizado
    r = M("ADD", r, M("MULTIPLY", M("ADD", crack, pit), .22))
    r = mixf(smooth(valley, .3, .9), r, .9)
    r = M("MINIMUM", M("MAXIMUM", r, .12), 1)

    bsdf = N("ShaderNodeBsdfPrincipled"); out = N("ShaderNodeOutputMaterial")
    link(col, bsdf.inputs["Base Color"]); link(r, bsdf.inputs["Roughness"]); link(bump.outputs[0], bsdf.inputs["Normal"]); bsdf.inputs["Metallic"].default_value = 0
    link(bsdf.outputs[0], out.inputs["Surface"])
    em = N("ShaderNodeEmission", name="HeightEmit")                                         # para hornear el height: 0.5 = superficie, ±0.01 u
    link(M("ADD", M("MULTIPLY", h, 50), .5, clamp=True), em.inputs["Color"])
    mat["roast"] = roast
    return mat


def setup_render(engine="CYCLES", samples=64):
    sc = bpy.context.scene
    sc.render.engine = engine; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.render.resolution_x = 1280; sc.render.resolution_y = 960
    sc.view_settings.view_transform = "Standard"                 # misma base que el sRGB + tone mapping de Three.js; se compara ahí
    w = sc.world or bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND"); bg.inputs[0].default_value = (.02, .017, .015, 1); bg.inputs[1].default_value = 1
    if "Cam" not in bpy.data.objects:
        cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam)
    sc.camera = bpy.data.objects["Cam"]; sc.camera.data.lens = 85; sc.camera.data.clip_start = .01
    for nm, typ in (("Key", "AREA"), ("Fill", "AREA"), ("Rim", "AREA")):
        if nm not in bpy.data.objects:
            sc.collection.objects.link(bpy.data.objects.new(nm, bpy.data.lights.new(nm, typ)))


def aim(ob, loc, target=(0, 0, 0)):
    from mathutils import Vector
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


RIGS = {   # nombre: (key pos, potencia, tamaño), fill, rim
    "soft_studio":   (((-1.2, -1.0, 2.2), 130, 2.4), ((1.8, -1.5, 1.2), 40, 2.5), ((0.5, 2.0, 1.0), 45, 1.5)),
    "side_light":    (((-2.6, .2, .22), 230, .5), ((2, -1, 1), 4, 2), ((0, 2, .5), 0, 1)),
    "backlight":     (((.3, 2.4, .9), 300, .8), ((-1.5, -2, 1.5), 9, 2.5), ((-2, 1.5, .3), 70, .6)),
}


def set_rig(name):
    for nm, (pos, power, size) in zip(("Key", "Fill", "Rim"), RIGS[name]):
        o = bpy.data.objects[nm]; aim(o, pos); o.data.energy = power; o.data.size = size; o.data.color = (1, .95, .88) if nm == "Key" else (1, 1, 1)


def shot(path, cam_pos, target=(0, 0, 0), lens=85, rig="soft_studio", res=(1280, 960)):
    sc = bpy.context.scene; set_rig(rig); aim(sc.camera, cam_pos, target); sc.camera.data.lens = lens
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
