"""
Sneaker 3D — texturas PBR tileables + materiales glTF-compatibles.

Uso (dentro de Blender, después de shoe.py):  exec(open(".../materials.py").read(), {"RES": 1024})
Cada material tiene base color + normal + ORM (oclusión/rugosidad/metal) generados desde un mapa de alturas en METROS,
así la intensidad del relieve es física. Todo es periódico (ruido filtrado por FFT, patrones enteros): tilea sin costuras.
Los mapas se guardan en textures/source (PNG) y se conectan con Image Texture + Mapping -> viajan tal cual al GLB.
Las UV de la zapatilla están en unidades físicas (1 = 10 cm): `tile` es el tamaño real de la baldosa en metros.
"""
import bpy, numpy as np, os
from math import pi

RES = globals().get("RES", 1024); R = RES
OUT = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath), "..", "textures", globals().get("OUTSUB", "source"))); os.makedirs(OUT, exist_ok=True)
Y, X = np.mgrid[0:R, 0:R] / R
fr = lambda a: a - np.floor(a)
def sm(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def noise(seed, lo, hi, aniso=(1, 1)):
    """Ruido periódico pasa-banda (ciclos por baldosa), normalizado a ~0..1."""
    w = np.random.default_rng(seed).standard_normal((R, R)); f = np.fft.fftfreq(R) * R
    rad = np.hypot(f[None, :] * aniso[0], f[:, None] * aniso[1]); band = np.exp(-((rad - (lo + hi) / 2) / ((hi - lo) / 2 + 1e-6))**2)
    n = np.real(np.fft.ifft2(np.fft.fft2(w) * band)); return np.clip(.5 + n / (n.std() + 1e-9) * .2, 0, 1)
def blur(h, px):
    f = np.fft.fftfreq(R); g = np.exp(-2 * (pi * px)**2 * (f[None, :]**2 + f[:, None]**2)); return np.real(np.fft.ifft2(np.fft.fft2(h) * g))
def normal(h, tile):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * R / (2 * tile); dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * R / (2 * tile)
    n = np.stack([-dx, -dy, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True); return n * .5 + .5
def cavity(h, px=6, k=.8): d = blur(h, px) - h; return np.clip(1 - k * np.clip(d / (np.abs(d).max() + 1e-12), 0, 1), 0, 1)
srgb = lambda c: np.where(c <= .0031308, c * 12.92, 1.055 * np.clip(c, 1e-9, None)**(1 / 2.4) - .055)
def save(name, rgb, cs, div=1):
    n = R // div; rgb = np.clip(rgb, 0, 1).reshape(n, div, n, div, 3).mean((1, 3))    # div: reduce por promedio (mapas que no necesitan toda la resolución)
    img = bpy.data.images.get(name) or bpy.data.images.new(name, n, n, alpha=False)
    if img.size[0] != n: img.scale(n, n)
    img.colorspace_settings.name = cs                                         # antes de escribir: cambiar el espacio de color regenera el buffer
    px = np.ones((n, n, 4), np.float32); px[..., :3] = rgb; img.pixels.foreach_set(px.ravel()); img.update()
    img.filepath_raw = os.path.join(OUT, name + ".png"); img.file_format = "PNG"; img.save(); return img

def knit(N, M):
    cx = fr(X * N); col = np.sin(pi * cx)**.7; return np.clip(col * (.55 + .45 * np.cos(2 * pi * (Y * M + .9 * np.abs(cx - .5)))) + .18 * (noise(1, 150, 400) - .5), 0, 1)
def voronoi(n, seed):
    rng = np.random.default_rng(seed); pts = (np.stack(np.meshgrid(np.arange(n), np.arange(n)), -1) + .15 + .7 * rng.random((n, n, 2))) / n
    gx, gy = np.floor(X * n).astype(int), np.floor(Y * n).astype(int); d = []
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            p = pts[(gy + oy) % n, (gx + ox) % n]; dx = X - p[..., 0] - ((gx + ox) // n); dy = Y - p[..., 1] - ((gy + oy) // n); d.append(np.hypot(dx, dy) * n)
    d = np.sort(np.stack(d, -1), -1); return d[..., 0], d[..., 1]

def textures():
    """nombre -> (alturas en m, tile en m, color lineal RGB (H,W,3), rugosidad, metal)"""
    T = {}; g3 = lambda c, v: np.asarray(c)[None, None, :] * v[..., None]
    h = knit(20, 14); T["knit"] = (h * .00035, .02, g3((.020, .021, .024), .5 + .6 * h), .92 - .12 * h, 0)
    h = knit(24, 18); T["collar"] = (h * .00022, .015, g3((.034, .036, .040), .55 + .5 * h), .88 - .1 * h, 0)
    # mesh técnico: agujeros ovalados alternados + trama fina de hilo
    gx, gy = X * 10, Y * 14; gx = gx + .5 * (np.floor(gy) % 2); r = np.hypot((fr(gx) - .5) / .30, (fr(gy) - .5) / .36)
    hole = sm(1.12, .72, r); yarn = .5 + .5 * np.sin(2 * pi * X * 90) * np.sin(2 * pi * Y * 84) + .5 * (noise(2, 120, 380) - .5)
    h = (1 - hole) * (.72 + .28 * yarn) + .22 * np.exp(-((r - 1.25) / .28)**2) - hole * .9
    T["mesh"] = ((h + .9) / 2.1 * .00075, .022, g3((.030, .032, .036), (.22 + .78 * (1 - hole)) * (.75 + .35 * yarn)), .95 - .15 * (1 - hole) * yarn, 0)
    n = .6 * noise(3, 90, 320) + .4 * noise(4, 20, 70, (1, 3)); T["suede"] = (n * .00007, .03, g3((.048, .050, .055), .8 + .45 * (n - .5) * 2 * .5 + .0), .95 - .1 * n, 0)
    n = noise(5, 28, 85); v = noise(6, 3, 10)
    T["film"] = (n * .00006, .03, g3((.021, .022, .025), .9 + .2 * v), .42 + .14 * v + .08 * n, 0)
    T["tpu"] = (n * .00005 + .00004 * (np.sin(2 * pi * (X + Y) * 40) * .5 + .5), .03, g3((.072, .076, .084), .9 + .2 * v), .30 + .12 * v, 0)
    T["lime"] = (n * .00005, .03, g3((.50, .80, .05), .92 + .16 * v), .34 + .12 * v, 0)
    h = .5 + .35 * np.sin(2 * pi * (X + Y) * 48) + .15 * np.sin(2 * pi * (X - Y) * 96) * 1.0 + .2 * (noise(7, 150, 400) - .5)
    T["lining"] = (h * .00009, .02, g3((.085, .09, .098), .8 + .3 * h), .86 - .08 * h, 0)
    T["insole"] = (h * .00012, .02, g3((.04, .042, .047), .75 + .4 * h), .9 - .08 * h, 0)
    n = noise(8, 60, 260); T["strobel"] = (n * .0001, .03, g3((.42, .42, .40), .8 + .4 * (n - .5) + .2), .95 * np.ones_like(n), 0)
    # espuma EVA: arrugas de compresión alargadas + poro fino
    w = noise(9, 5, 34, (3.6, 1)); ridge = 1 - np.abs(2 * w - 1); pores = sm(.62, .8, noise(10, 110, 300)); mid = noise(11, 30, 90)
    h = .62 * ridge**1.6 + .28 * mid - .45 * pores
    T["foam"] = ((h + .45) / 1.35 * .00024, .05, g3((.80, .745, .615), .88 + .14 * ridge - .12 * pores), .78 - .10 * ridge + .12 * pores, 0)
    # espuma de perlas expandidas (capa de amortiguación): celdas con domo y junta
    f1_, f2_ = voronoi(11, 12); border = sm(0, .14, f2_ - f1_); dome = 1 - np.clip(f1_ / .75, 0, 1)**2; micro = noise(13, 90, 260)
    h = border * (.55 + .45 * dome) + .08 * (micro - .5)
    T["bead"] = (h * .0009, .04, g3((.86, .87, .85), .72 + .28 * border), .50 + .25 * (1 - border) + .1 * micro, 0)
    n = noise(14, 70, 240); pits = sm(.66, .8, noise(15, 25, 60)); v = noise(16, 3, 9)
    T["rubber"] = ((n - .6 * pits) * .00006, .03, g3((.013, .013, .014), .85 + .3 * v), .72 + .16 * v - .1 * n, 0)
    # cordón plano trenzado en espiga (x = largo, y = perímetro: el vértice de la espiga cae en el eje del cordón)
    ph = X * 9 + 2.6 * np.abs(fr(Y * 2) - .5); st = np.abs(np.sin(pi * ph))**.6; fib = noise(17, 140, 380, (.4, 1))
    h = st * (.8 + .2 * np.sin(2 * pi * Y * 24)) + .25 * (fib - .5)
    T["lace"] = (h * .00028, .014, g3((.72, .70, .64), .68 + .36 * h), .93 - .1 * st, 0)
    h = np.abs(np.sin(pi * X * 22))**.5 * (.75 + .25 * np.sin(2 * pi * (Y * 14 + X * 11))) + .2 * (noise(18, 150, 380) - .5)
    T["webbing"] = (h * .00022, .013, g3((.50, .80, .05), .7 + .34 * h), .9 - .1 * h, 0)
    # marca: dos eslabones entrelazados (el "loop"), en coordenadas físicas del parche 30 x 13 mm
    px, py = (X - .5) * 30, (Y - .5) * 13; ring = lambda cx: sm(1.05, .55, np.abs(np.hypot(px - cx, py) - 3.9)); a, b = ring(-3.1), ring(3.1)
    cut = sm(.5, 1.3, np.abs(np.hypot(px + 3.1, py) - 3.9)); logo = np.clip(a + b * np.where((py > 0) & (px < 2), cut, 1), 0, 1); n = noise(19, 60, 200)
    T["brand"] = (logo * .00035 + n * .00004, .03, g3((.028, .029, .032), 1 - logo) + g3((.50, .80, .05), logo), .62 - .3 * logo + .08 * n, 0)
    return T

# material -> (texturas, tile UV propio o None, sheen, extra Principled)
USE = {
    "knit": ("knit", .25, {}), "mesh": ("mesh", .15, {}), "suede": ("suede", .3, {}), "film": ("film", 0, {}), "tpu": ("tpu", 0, {"Coat Weight": .35, "Coat Roughness": .25}),
    "lining": ("lining", .3, {}), "collar": ("collar", .25, {}), "foam": ("foam", 0, {}), "bead": ("bead", 0, {}), "rubber": ("rubber", 0, {}),
    "lace": ("lace", .2, {}), "webbing": ("webbing", .3, {}), "brand": ("brand", 0, {}), "shank": ("lime", 0, {"Coat Weight": .5, "Coat Roughness": .15}),
    "aglet": ("lime", 0, {"Coat Weight": .5, "Coat Roughness": .15}), "insole": ("insole", .3, {}), "strobel": ("strobel", 0, {}),
}
FLAT = {"thread": ((.20, .205, .215), .8, 0), "thread_lime": ((.50, .80, .05), .8, 0), "metal": ((.23, .24, .26), .32, 1), "lime": ((.50, .80, .05), .4, 0)}

BIG = {"knit", "mesh", "foam", "bead", "lace", "brand"}
def build_materials():
    for im in [i for i in bpy.data.images if i.name.endswith(("_color", "_normal", "_orm"))]: bpy.data.images.remove(im)
    T = textures(); imgs = {}
    for k, (h, tile, col, rough, metal) in T.items():
        orm = np.stack([cavity(h), np.clip(rough, .04, 1), np.full_like(h, metal)], -1)
        d = 1 if k in BIG else 2                                             # tejidos, espumas, cordón y marca a resolución completa; el resto a la mitad
        imgs[k] = (save(f"{k}_color", srgb(np.clip(col, 0, 1)), "sRGB", d), save(f"{k}_normal", normal(h, tile), "Non-Color", d), save(f"{k}_orm", orm, "Non-Color", d * 2), tile)
    grp = bpy.data.node_groups.get("glTF Material Output")                    # el exportador glTF lee la oclusión de este grupo
    if not grp: grp = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree"); grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    def fresh(name):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled"); nt.links.new(b.outputs[0], out.inputs[0]); return m, nt, b
    for name, (tk, sheen, extra) in USE.items():
        m, nt, b = fresh(name); c, n, o, tile = imgs[tk]; unit = tk == "brand"
        uv = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1, 1, 1) if unit else (.1 / tile, .1 / tile, 1); nt.links.new(uv.outputs["UV"], mp.inputs[0])
        def tex(img): t = nt.nodes.new("ShaderNodeTexImage"); t.image = img; nt.links.new(mp.outputs[0], t.inputs[0]); return t
        nt.links.new(tex(c).outputs[0], b.inputs["Base Color"])
        sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(tex(o).outputs[0], sep.inputs[0]); nt.links.new(sep.outputs[1], b.inputs["Roughness"]); nt.links.new(sep.outputs[2], b.inputs["Metallic"])
        nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(tex(n).outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], b.inputs["Normal"])
        g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = grp; nt.links.new(sep.outputs[0], g.inputs[0])
        if sheen: b.inputs["Sheen Weight"].default_value = sheen; b.inputs["Sheen Roughness"].default_value = .5
        for k, v in extra.items(): b.inputs[k].default_value = v
    for name, (col, rough, metal) in FLAT.items():
        m, nt, b = fresh(name); b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    print("materiales:", len(USE) + len(FLAT), "texturas:", len(imgs) * 3, "res:", R)

build_materials()
