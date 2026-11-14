"""
Coffee 3D Motion Lab — geometría procedural de los granos (se ejecuta dentro de Blender).

Metodología: una esfera-cubo (quads uniformes, sin polos) cuyo dominio se deforma con una función de forma `shape(d, V)`:
  macroforma (semi-elipsoide: cara plana + lomo abombado) -> hendidura esculpida (ranura profunda + valle + labios)
  -> bultos de baja y media frecuencia -> abolladuras / grietas -> deformaciones globales (S, curvatura, torsión).
La hendidura vive en x=0 del dominio y las líneas de la malla se concentran ahí: por eso sobrevive hasta en el LOD crowd.
Los UV son analíticos (dos islas: cara y lomo, costura en el canto), iguales para todas las variantes y LODs:
un mismo juego de texturas horneadas sirve para todos los granos.

    exec(open(".../beans.py").read());  build_all()
"""
import bpy, math, numpy as np

LODS = {"hero": (64, 1.0), "std": (22, 0.45), "crowd": (8, 0.0)}      # nombre: (subdivisiones por arista, nivel de detalle)

BASE = dict(W=.36, L=.5, Hf=.205, Hb=.33, sq=2.25, taper=0., wc=.048, ws=.42, Dc=.135, Ds=.04, lip=.016, wob=.03,
            lump=.012, lump2=.0045, micro=.0022, S=.07, Sf=1., Sp=0., bendx=0., bendz=0., twist=0., asym=.012, seed=1, dents=[], gashes=[])
VARIANTS = [
    ("00_clasico", dict(seed=3)),
    ("01_alargado", dict(W=.305, L=.56, Hb=.28, Hf=.15, taper=.07, S=.05, seed=11)),
    ("02_corto_redondo", dict(W=.395, L=.44, Hb=.37, Hf=.19, sq=2.08, S=.04, seed=23)),
    ("03_hendidura_pronunciada", dict(Dc=.15, wc=.1, Ds=.065, ws=.5, lip=.022, seed=37)),
    ("04_hendidura_irregular", dict(wob=.1, S=.13, Sf=1.7, Sp=.7, wc=.07, lump=.017, seed=41)),
    ("05_ancho_asimetrico", dict(W=.41, taper=.16, bendx=.05, twist=.14, Hb=.31, seed=53)),
    ("06_grieta_lateral", dict(seed=67, gashes=[((.62, .15, -.77), (.25, .95, .2), .5, .03, .035), ((-.5, -.5, -.7), (.6, -.7, .1), .22, .02, .02)],
                               dents=[((.3, -.6, -.74), .3, .02)])),
    ("07_curvado", dict(bendz=-.085, bendx=.035, L=.54, W=.34, S=.09, seed=71)),
    ("08_rugoso", dict(lump=.026, lump2=.014, micro=.0045, seed=89,
                       dents=[((-.4, .5, -.77), .25, .03), ((.5, .1, -.86), .2, .025), ((-.1, -.7, -.7), .22, .022), ((.7, .5, .5), .2, .015)])),
]


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def _hash(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + seed * 974711) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1103515245) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def vnoise(p, seed=0):
    """Value noise 3D vectorizado, -1..1."""
    i = np.floor(p).astype(np.int64)
    f = p - i
    f = f * f * f * (f * (f * 6 - 15) + 10)
    x, y, z = i[:, 0], i[:, 1], i[:, 2]
    fx, fy, fz = f[:, 0], f[:, 1], f[:, 2]
    c = lambda dx, dy, dz: _hash(x + dx, y + dy, z + dz, seed)
    a = (c(0, 0, 0) * (1 - fx) + c(1, 0, 0) * fx) * (1 - fy) + (c(0, 1, 0) * (1 - fx) + c(1, 1, 0) * fx) * fy
    b = (c(0, 0, 1) * (1 - fx) + c(1, 0, 1) * fx) * (1 - fy) + (c(0, 1, 1) * (1 - fx) + c(1, 1, 1) * fx) * fy
    return (a * (1 - fz) + b * fz) * 2 - 1


def fbm(p, seed=0, octaves=3):
    s = 0.
    for o in range(octaves):
        s += vnoise(p * 2 ** o + 17.3 * o, seed + o * 31) * .5 ** o
    return s / (2 - .5 ** (octaves - 1))


def noise1(t, seed):
    return vnoise(np.stack([t, np.zeros_like(t) + .5, np.zeros_like(t) + .5], 1), seed)


def shape(d, V, detail=1.0):
    """d: direcciones unitarias (N,3) -> posiciones (N,3) y máscaras (núcleo de hendidura, valle)."""
    x, y, z = d[:, 0], d[:, 1], d[:, 2]
    r = np.hypot(x, y) + 1e-9
    with np.errstate(divide="ignore"):
      k = ((np.abs(x) / r) ** V["sq"] + (np.abs(y) / r) ** V["sq"]) ** (-1 / V["sq"])      # contorno superelíptico: extremos más llenos
    k = np.where(r > 1e-7, k, 1.)                                                        # polo: sin dirección en xy
    px, py = x * k, y * k
    H = np.where(z > 0, V["Hf"], V["Hb"])
    P = np.stack([V["W"] * px * (1 + V["taper"] * py), V["L"] * py, H * z], 1)
    n0 = d / np.array([V["W"], V["L"], 1.]) / np.stack([np.ones_like(H), np.ones_like(H), H], 1)
    n0 /= np.linalg.norm(n0, axis=1)[:, None]
    seed = V["seed"]

    # Hendidura: ranura de paredes empinadas + valle ancho (los dos lóbulos de la cara) + labios levantados.
    mt = sstep(0., .3, z) * (1 - sstep(.72, .99, np.abs(py)))
    u = px - detail * V["wob"] * noise1(py * 3.1 + seed, seed)
    wc = V["wc"] * (1 + detail * .35 * noise1(py * 5.3 + seed, seed + 9))
    gc = np.exp(-(np.abs(u) / wc) ** 2.6)
    gs = np.exp(-(u / V["ws"]) ** 2)
    lip = np.exp(-((np.abs(u) - 2.2 * wc) / (1.3 * wc)) ** 2)
    P[:, 2] -= mt * (V["Dc"] * gc + V["Ds"] * gs - V["lip"] * lip - V["asym"] * np.tanh(u / .15))     # asym: un lóbulo queda más alto que el otro

    # Irregularidad orgánica (se atenúa dentro de la ranura para no destruirla).
    q = d + seed * .37
    bumps = V["lump"] * fbm(q * 2.3, seed) + V["lump2"] * (.4 + .6 * detail) * fbm(q * 6.5, seed + 5) + detail * V["micro"] * fbm(q * 26, seed + 11)
    P += n0 * (bumps * (1 - .85 * gc * mt))[:, None]
    for c, rad, dep in V["dents"]:
        c = np.array(c) / np.linalg.norm(c)
        P -= n0 * (dep * np.exp(-(np.arccos(np.clip(d @ c, -1, 1)) / rad) ** 2))[:, None]
    for c, t, half, width, dep in V["gashes"]:                                  # grietas: surcos finos sobre una dirección
        c = np.array(c) / np.linalg.norm(c); t = np.array(t); t = t - (t @ c) * c; t /= np.linalg.norm(t)
        rel = d - c; along = rel @ t
        perp = np.linalg.norm(rel - np.outer(along, t) - np.outer(rel @ c, c), axis=1) - detail * .015 * noise1(along * 9, seed)
        P -= n0 * (dep * np.exp(-(perp / width) ** 2) * np.exp(-(along / half) ** 4))[:, None]

    # Deformaciones globales: la S arrastra la hendidura (y la textura con ella), curvatura y torsión.
    yn = P[:, 1] / V["L"]
    P[:, 0] += V["S"] * V["W"] * np.sin(math.pi * yn * V["Sf"] + V["Sp"]) * sstep(-.3, .6, z) + V["bendx"] * yn * yn
    P[:, 2] += V["bendz"] * yn * yn
    a = V["twist"] * yn
    P[:, 0], P[:, 2] = P[:, 0] * np.cos(a) - P[:, 2] * np.sin(a), P[:, 0] * np.sin(a) + P[:, 2] * np.cos(a)
    return P, gc * mt, gs * mt


def cube_sphere(n, cluster=.5):
    """Esfera-cubo soldada. El eje x se concentra hacia x=0 (hendidura). Devuelve direcciones y quads con el giro hacia afuera."""
    s = np.linspace(-1, 1, n + 1)
    warp = [np.tan(s * (cluster + (1 - cluster) * s * s) * math.pi / 4), np.tan(s * math.pi / 4), np.tan(s * math.pi / 4)]
    pts, quads = [], []
    for ax in range(3):
        for sign in (1, -1):
            au, av = (ax + 1) % 3, (ax + 2) % 3
            A, B = np.meshgrid(np.arange(n + 1), np.arange(n + 1), indexing="ij")
            p = np.zeros((n + 1, n + 1, 3)); p[..., ax] = sign; p[..., au] = warp[au][A]; p[..., av] = warp[av][B]
            base = len(pts) * (n + 1) ** 2
            idx = base + A * (n + 1) + B
            q = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
            quads.append(q if sign > 0 else q[:, ::-1])
            pts.append(p.reshape(-1, 3))
    pts = np.concatenate(pts); pts /= np.linalg.norm(pts, axis=1)[:, None]
    _, first, inv = np.unique(np.round(pts * 1e6).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    return pts[first], inv.reshape(-1)[np.concatenate(quads)]


def analytic_normals(d, V, detail):
    ref = np.where(np.abs(d[:, [2]]) < .9, np.array([[0, 0, 1.]]), np.array([[1., 0, 0]]))
    t1 = np.cross(ref, d); t1 /= np.linalg.norm(t1, axis=1)[:, None]; t2 = np.cross(d, t1)
    e = 2e-3
    f = lambda v: shape(v / np.linalg.norm(v, axis=1)[:, None], V, detail)[0]
    nrm = np.cross(f(d + e * t1) - f(d - e * t1), f(d + e * t2) - f(d - e * t2))
    return nrm / np.linalg.norm(nrm, axis=1)[:, None]


def build_bean(name, V, lod, collection):
    n, detail = LODS[lod]
    d, quads = cube_sphere(n)
    P, core, valley = shape(d, V, detail)
    me = bpy.data.meshes.new(name)
    me.from_pydata(P.tolist(), [], quads.tolist())
    me.polygons.foreach_set("use_smooth", [True] * len(quads))
    # UV: proyección azimutal equiárea por hemisferio. Isla superior = cara (hendidura), inferior = lomo. Largo del grano sobre U.
    ld = d[quads]                                                                # (F,4,3)
    top = ld[:, :, 2].mean(1) > 0
    l = ld[:, :, :2] / np.sqrt(1 + np.abs(ld[:, :, 2]))[:, :, None]
    uv = np.stack([.5 + .485 * l[:, :, 1], np.where(top[:, None], .75, .25) + .235 * l[:, :, 0]], -1)
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", uv.reshape(-1))
    col = me.color_attributes.new("bean", "FLOAT_COLOR", "POINT")                # R: núcleo de la hendidura · G: valle
    col.data.foreach_set("color", np.stack([core, valley, np.zeros_like(core), np.ones_like(core)], 1).reshape(-1))
    me.update()
    if lod != "hero":                                                            # normales de la superficie analítica: el LOD sombrea como el hero
        me.normals_split_custom_set_from_vertices(analytic_normals(d, V, detail).tolist())
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    return c


def build_all(lods=("hero", "std", "crowd")):
    out = []
    for i, (vname, over) in enumerate(VARIANTS):
        V = {**BASE, **over}
        for lod in lods:
            name = f"Bean_{vname}_{lod}"
            if name in bpy.data.objects:
                bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
            ob = build_bean(name, V, lod, coll(f"beans_{lod}"))
            ob.location = ((i % 3 - 1) * 1.0, lods.index(lod) * 2.0, -(i // 3 - 1) * 1.3)              # grilla de presentación (se resetea al exportar)
            ob["variant"] = vname; ob["lod"] = lod
            out.append(ob)
    return out
