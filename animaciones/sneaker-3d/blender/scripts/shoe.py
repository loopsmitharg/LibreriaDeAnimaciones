"""
Sneaker 3D — generador paramétrico de la zapatilla (Blender, bpy + numpy).

Uso (dentro de Blender):  exec(open(".../shoe.py").read(), {"SIDE": "R", "QL": 1.0})
  SIDE: "R" | "L"  (la izquierda se genera espejando vértices y caras: normales y jerarquía quedan correctas)
  QL:   multiplicador de resolución (1 = hero, ~.55 = lite)

Idea: toda la capellada vive sobre UNA superficie paramétrica S(u, v) (la horma):
  u 0..1 = talón -> punta siguiendo el contorno de la planta;  v 0..1 = borde lateral -> lomo,  1..2 = lomo -> borde medial.
Cada panel es un parche reglado entre dos curvas (u, v), desplazado por la normal (off) y con espesor real (Solidify + Bevel).
Así los refuerzos, costuras, ojales y cordones siguen exactamente la misma superficie.
Unidades: metros. X = largo (punta en +X), Y = medial (+) / lateral (-) en el pie derecho, Z = arriba.
"""
import bpy, bmesh, numpy as np
from math import pi, radians

SIDE = globals().get("SIDE", "R"); QL = globals().get("QL", 1.0); MIRROR = SIDE == "L"
q = lambda n: max(4, int(round(n * QL)))
norm = lambda a: a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-12)
def smooth(a, b, x): t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def spline(pts, n, scale=None, rng=None):
    """Catmull-Rom no uniforme (parametrizado por cuerda). rng = (k0, k1) índices de control entre los que muestrear."""
    p = np.asarray(pts, float); sc = np.ones(p.shape[1]) if scale is None else np.asarray(scale, float)
    d = np.maximum(np.linalg.norm(np.diff(p, axis=0) * sc, axis=1), 1e-9); t = np.concatenate([[0], np.cumsum(d)])
    m = np.empty_like(p); m[1:-1] = (p[2:] - p[:-2]) / (t[2:] - t[:-2])[:, None]; m[0] = (p[1] - p[0]) / d[0]; m[-1] = (p[-1] - p[-2]) / d[-1]
    tt = np.linspace(t[rng[0]] if rng else 0, t[rng[1]] if rng else t[-1], n)
    k = np.clip(np.searchsorted(t, tt, "right") - 1, 0, len(p) - 2); h = (t[k + 1] - t[k])[:, None]; x = (tt - t[k])[:, None] / h
    return (2*x**3 - 3*x**2 + 1) * p[k] + (x**3 - 2*x**2 + x) * h * m[k] + (-2*x**3 + 3*x**2) * p[k + 1] + (x**3 - x**2) * h * m[k + 1]
def f1(table):
    d = spline(table, 500, scale=(1, .3)); return lambda x: np.interp(x, d[:, 0], d[:, 1])
def resample(P, n):
    d = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]); tt = np.linspace(0, d[-1], n)
    return np.stack([np.interp(tt, d, P[:, k]) for k in range(P.shape[1])], 1), d[-1]

# ───────────────────────────── horma: contorno, perfil y superficie S(u, v) ─────────────────────────────
LAT = [(0, 0), (.004, -.017), (.02, -.0295), (.05, -.0335), (.095, -.0345), (.14, -.040), (.18, -.0465), (.215, -.046), (.245, -.039), (.268, -.026), (.282, -.009)]
TIP = (.287, .008)
MED = [(.283, .024), (.268, .0365), (.24, .0435), (.205, .045), (.165, .039), (.125, .0305), (.09, .029), (.05, .0315), (.02, .0285), (.004, .0165)]
zg = lambda x: .006 * np.clip((.04 - x) / .04, 0, None)**2 + .024 * np.clip((x - .175) / .112, 0, None)**2      # suelo: rocker de talón y punta
stack = f1([(0, .033), (.05, .036), (.12, .033), (.19, .027), (.25, .021), (.287, .014)])                          # espesor de suela (drop 9 mm)
zf = lambda x: zg(x) + stack(x)                                                                                    # línea de montado (borde inferior de la capellada)
hs = f1([(-.01, .118), (.03, .118), (.07, .110), (.105, .093), (.15, .074), (.19, .059), (.225, .050), (.255, .041), (.275, .027), (.287, .010)])

NU, NS = 320, 96; UG = np.linspace(0, 1, NU + 1); SG = np.linspace(0, 1, NS + 1)
_loop = np.array(LAT + [TIP] + MED); _ext = np.vstack([_loop[-3:], _loop, _loop[:3]]); _nl = len(LAT)
Lxy, LOUT = resample(spline(_ext, 4000, rng=(3, 3 + _nl)), NU + 1)
Mxy, _ = resample(spline(_ext, 4000, rng=(3 + _nl, 3 + len(_loop)))[::-1], NU + 1)
def _n2(P, sg): t = norm(np.gradient(P, axis=0)); return np.stack([t[:, 1], -t[:, 0]], 1) * sg
nL, nM = _n2(Lxy, 1), _n2(Mxy, -1)
for _i in (0, -1): nL[_i] = nM[_i] = norm(nL[_i] + nM[_i])                                        # talón y punta: ambos lados comparten normal (se sueldan)
XM = np.maximum.accumulate((Lxy[:, 0] + Mxy[:, 0]) / 2) + UG * 1e-9
ux = lambda x: np.interp(x, XM, UG)
xT = XM + .020 * (1 - smooth(0, .12, XM))
Txy = np.stack([xT, (Lxy[:, 1] + Mxy[:, 1]) / 2 + .004 * smooth(.15, .24, XM) * (1 - smooth(.27, .287, XM))], 1); zT = zf(xT) + hs(xT)
_a = f1([(0, .5), (.06, .5), (.12, .6), (.2, .7), (.26, .8), (.287, .9)])(XM)
_bl = f1([(0, .0025), (.06, .003), (.12, .002), (.2, .003), (.26, .002), (.287, .0005)])(XM)
def _half(Bxy, nB):
    tt = np.linspace(0, 1, 200); zB = zf(Bxy[:, 0])
    f = np.cos(tt * pi / 2)[None, :]**_a[:, None]; g = np.sin(tt * pi / 2)[None, :] * np.ones((NU + 1, 1))
    xy = Txy[:, None, :] + (Bxy - Txy)[:, None, :] * f[..., None] + nB[:, None, :] * (_bl[:, None] * 6.8 * g * (1 - g)**2)[..., None]
    P = np.concatenate([xy, (zB[:, None] + (zT - zB)[:, None] * g)[..., None]], -1)
    out = np.empty((NU + 1, NS + 1, 3)); A = np.empty(NU + 1)
    for i in range(NU + 1): out[i], A[i] = resample(P[i], NS + 1)
    return out, A, zB
GL, AL, zBL = _half(Lxy, nL); GM, AM, zBM = _half(Mxy, nM)
G = np.concatenate([GL, GM[:, ::-1][:, 1:]], 1)
N = norm(np.cross(np.gradient(G, axis=0), np.gradient(G, axis=1)))
if N[NU // 2, NS // 4, 1] > 0: N = -N
for _i in (0, NU): G[_i] = (G[_i] + G[_i, ::-1]) / 2; N[_i] = norm(N[_i] + N[_i, ::-1])
TA = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(G[:, NS], axis=0), axis=1))])

def S(uv, off=0.0):
    """Punto y normal de la horma en (u, v), desplazado `off` metros hacia afuera."""
    uv = np.asarray(uv, float); u = np.clip(uv[..., 0], 0, 1) * NU; v = np.clip(uv[..., 1], 0, 2) * NS
    i = np.minimum(u.astype(int), NU - 1); j = np.minimum(v.astype(int), 2 * NS - 1); fu = (u - i)[..., None]; fv = (v - j)[..., None]
    bl = lambda A: (A[i, j] * (1 - fu) + A[i + 1, j] * fu) * (1 - fv) + (A[i, j + 1] * (1 - fu) + A[i + 1, j + 1] * fu) * fv
    n = norm(bl(N)); return bl(G) + n * np.asarray(off, float)[..., None], n
def texuv(uv):
    """UV físicas (1 unidad = 10 cm) para que los tejidos tengan la misma escala en todos los paneles."""
    u, v = uv[..., 0], uv[..., 1]; s = np.where(v <= 1, v, 2 - v); al = np.interp(u, UG, AL); am = np.interp(u, UG, AM)
    return np.stack([(1 - s) * u * LOUT + s * np.interp(u, UG, TA), np.where(v <= 1, v * al, al + (v - 1) * am)], -1) * 10
def dist(uv):
    """Distancia con signo al lomo sobre la superficie (+ lateral, - medial)."""
    u, v = uv[..., 0], uv[..., 1]; return np.where(v <= 1, (1 - v) * np.interp(u, UG, AL), -(v - 1) * np.interp(u, UG, AM))
def s_of(side, u, kind, val):
    fi = u * NU; i = min(int(fi), NU - 1); f = fi - i
    if kind == "z":
        col = (GL if side == "L" else GM)[:, :, 2]; zb = zBL if side == "L" else zBM
        return float(np.interp(val, (col[i] - zb[i]) * (1 - f) + (col[i + 1] - zb[i + 1]) * f, SG))
    if kind == "d": A = AL if side == "L" else AM; return 1 - val / ((1 - f) * A[i] + f * A[i + 1])
    return val
def PT(side, x, kind, val):
    """Punto de diseño: x (m), y altura sobre el montado ('z'), distancia al lomo ('d') o fracción de sección ('s')."""
    u = float(ux(x)); s = s_of(side, u, kind, val); return (u, s if side == "L" else 2 - s)
def C(side, pts, n=60): return spline([PT(side, *p) for p in pts], q(n), scale=(LOUT, .09))
def along(side, x0, x1, fs, n):
    u = np.linspace(ux(x0), ux(x1), q(n)); s = fs(u) if callable(fs) else np.full(len(u), fs); return np.stack([u, s if side == "L" else 2 - s], 1)

# ───────────────────────────── utilidades de malla ─────────────────────────────
MATS = {  # color provisional (viewport); materials.py arma los PBR definitivos sobre estos mismos nombres
    "knit": (.045, .047, .05), "mesh": (.02, .021, .023), "suede": (.085, .088, .092), "film": (.06, .062, .066), "tpu": (.03, .031, .034),
    "lining": (.11, .115, .12), "collar": (.035, .036, .04), "foam": (.86, .82, .72), "bead": (.93, .93, .9), "rubber": (.012, .012, .013),
    "lace": (.6, .6, .58), "thread": (.3, .31, .32), "lime": (.62, .9, .1), "metal": (.18, .19, .2), "webbing": (.62, .9, .1),
    "brand": (.03, .03, .033), "shank": (.62, .9, .1), "insole": (.1, .1, .11), "strobel": (.5, .5, .48), "thread_lime": (.62, .9, .1), "aglet": (.62, .9, .1),
}
def mat(name):
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"); b.inputs["Base Color"].default_value = (*MATS[name], 1); b.inputs["Roughness"].default_value = .7
    return m
def coll(name):
    root = bpy.data.collections.get(f"Sneaker_{SIDE}")
    if not root: root = bpy.data.collections.new(f"Sneaker_{SIDE}"); bpy.context.scene.collection.children.link(root)
    if not name: return root
    c = bpy.data.collections.get(f"{SIDE}_{name}")
    if not c: c = bpy.data.collections.new(f"{SIDE}_{name}"); root.children.link(c)
    return c
def join(parts):
    V, F, U, b = [], [], [], 0
    for v, f, u in parts:
        V.append(v); U.append(u); F += (np.asarray(f) + b).tolist() if isinstance(f, np.ndarray) else [[int(k) + b for k in face] for face in f]; b += len(v)
    return np.concatenate(V), F, np.concatenate(U)
def g_grid(P, UV):
    n, m = P.shape[:2]; idx = np.arange(n * m).reshape(n, m)
    return P.reshape(-1, 3), np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4), UV.reshape(-1, 2)
def g_slab(top, bot, uvs=10):
    """Sólido cerrado entre dos grillas con la misma topología."""
    n, m = top.shape[:2]; it = np.arange(n * m).reshape(n, m); V = np.concatenate([top.reshape(-1, 3), bot.reshape(-1, 3)])
    gq = lambda idx: np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
    lp = np.concatenate([it[:-1, 0], it[-1, :-1], it[:0:-1, -1], it[0, :0:-1]]); l2 = np.roll(lp, -1)
    F = np.concatenate([gq(it), gq(it + n * m)[:, ::-1], np.stack([lp, l2, l2 + n * m, lp + n * m], 1)]); return V, F, V[:, :2] * uvs
def g_sweep(Pp, Nn, prof, scale=None, caps=True):
    """Barre un perfil cerrado (m, 2) a lo largo de Pp usando Nn como 'arriba' del perfil."""
    n = len(Pp); t = norm(np.gradient(Pp, axis=0)); b = norm(np.cross(t, Nn)); nn = np.cross(b, t)
    sc = np.ones((n, 2)) if scale is None else (np.stack([scale, scale], 1) if np.ndim(scale) == 1 else scale)
    pr = np.vstack([prof, prof[:1]]); m = len(pr)
    V = Pp[:, None, :] + b[:, None, :] * (pr[None, :, 0] * sc[:, :1])[..., None] + nn[:, None, :] * (pr[None, :, 1] * sc[:, 1:])[..., None]
    al = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(Pp, axis=0), axis=1))]); pl = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))])
    v, f, uv = g_grid(V, np.stack(np.broadcast_arrays(al[:, None], pl[None, :]), -1) * 10); f = f.tolist()
    if caps: idx = np.arange(n * m).reshape(n, m); f += [idx[0, :-1].tolist(), idx[-1, :-1][::-1].tolist()]
    return v, f, uv
def prof_flat(w, h, k=12, e=.55):
    th = -pi / 2 + 2 * pi * np.arange(k) / k; c, s = np.cos(th), np.sin(th)
    return np.stack([w * np.sign(c) * np.abs(c)**e, h * np.sign(s) * np.abs(s)**e], 1)

ROOT = None; WC = {}
def add_mesh(name, geo, material, collection, solid=0, bevel=0, weld=0, recalc=False, sharp=None, parent=None, flat=False):
    V, F, UV = geo; V = np.array(V, float)
    if MIRROR: V[:, 1] *= -1; F = [list(f)[::-1] for f in (F.tolist() if isinstance(F, np.ndarray) else F)]
    elif isinstance(F, np.ndarray): F = F.tolist()
    c = (V.min(0) + V.max(0)) / 2; me = bpy.data.meshes.new(name); me.from_pydata((V - c).tolist(), [], F)
    li = np.empty(len(me.loops), np.int32); me.loops.foreach_get("vertex_index", li)
    me.attributes.new("UVMap", "FLOAT2", "CORNER").data.foreach_set("vector", np.asarray(UV, np.float32)[li].ravel())
    if weld or recalc:
        bm = bmesh.new(); bm.from_mesh(me)
        if weld: bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
        if recalc: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
    me.shade_flat() if flat else me.shade_smooth()
    if sharp: me.set_sharp_from_angle(angle=radians(sharp))
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(f"{name}_{SIDE}", me); coll(collection).objects.link(ob)
    ob.parent = parent or ROOT; WC[ob.name] = c; ob.location = c - WC[parent.name] if parent else c
    if solid:
        s = ob.modifiers.new("Solidify", "SOLIDIFY"); s.thickness = solid; s.offset = 1; s.use_even_offset = True; s.use_quality_normals = True
    if bevel:
        b = ob.modifiers.new("Bevel", "BEVEL"); b.width = bevel; b.segments = 2; b.limit_method = "ANGLE"; b.angle_limit = radians(50)
        w = ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL"); w.keep_sharp = False; w.weight = 60
    return ob

def ruled(name, pairs, nv, off, thick, material, collection="Upper", bevel=.0004, disp=None, unit=False, parent=None):
    """Panel: parche(s) reglado(s) entre curvas A y B en (u, v). Devuelve el objeto y la info para costuras."""
    parts, infos = [], []
    for A, B in pairs:
        n = len(A); m = q(nv) + 1; w = np.linspace(0, 1, m)[None, :, None]; uv = A[:, None, :] * (1 - w) + B[:, None, :] * w
        t = np.linspace(0, 1, n)[:, None] * np.ones((1, m)); ww = np.ones((n, 1)) * w[..., 0]
        P, Nn = S(uv, off + (disp(t, ww) if disp else 0)); v, f, tuv = g_grid(P, np.stack([t, ww], -1) if unit else texuv(uv))
        c = P[:-1, :-1]
        if np.mean(np.sum(np.cross(P[1:, :-1] - c, P[:-1, 1:] - c) * Nn[:-1, :-1], -1)) < 0: f = f[:, ::-1]
        parts.append((v, f, tuv)); infos.append(dict(uv=uv, P=P, top=off + thick))
    ob = add_mesh(name, join(parts), material, collection, solid=thick, bevel=bevel, weld=2e-5 if len(pairs) > 1 else 0, parent=parent)
    return ob, infos

def edge_lines(info, edges="ABse", inset=.0018):
    """Líneas (u, v) paralelas a los bordes de un panel, metidas `inset` metros: por ahí van las costuras."""
    uv, P = info["uv"], info["P"]; n, m = uv.shape[:2]
    Wt = np.linalg.norm(np.diff(P, axis=1), axis=2).sum(1); Lc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P[:, m // 2], axis=0), axis=1))])
    ok = (Lc >= inset) & (Lc <= Lc[-1] - inset) & (Wt > 3.2 * inset); out = []
    lerp = lambda a, b, f: a * (1 - f) + b * f
    for e in edges:
        if e in "AB" and ok.sum() > 3:
            f = (inset / Wt[ok])[:, None]; out.append(lerp(uv[ok, 0], uv[ok, -1], f if e == "A" else 1 - f))
        if e in "se":
            fi = np.interp(inset if e == "s" else Lc[-1] - inset, Lc, np.arange(n)); i = min(int(fi), n - 2); fr = fi - i
            a, b = lerp(uv[i, 0], uv[i + 1, 0], fr), lerp(uv[i, -1], uv[i + 1, -1], fr); W = lerp(Wt[i], Wt[i + 1], fr)
            if W > 3.2 * inset: out.append(lerp(a[None], b[None], np.linspace(inset / W, 1 - inset / W, 24)[:, None]))
    return [(l, info["top"]) for l in out]

def stitches(name, lines, parent, material="thread", r=.00026, L=.0024, gap=.0011):
    """Puntadas reales: cada una es una cápsula hexagonal que entra y sale del panel siguiendo la superficie."""
    parts = []; k = 6; ang = 2 * pi * np.arange(k) / k
    for uv, top in lines:
        P, Nn = S(uv, top + r * .35); al = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        if al[-1] < L * 2: continue
        cs = np.arange(L / 2 + gap / 2, al[-1] - L / 2, L + gap); at = lambda d, A: np.stack([np.interp(d, al, A[:, i]) for i in range(3)], 1)
        p0, p1, nn = at(cs - L / 2, P), at(cs + L / 2, P), norm(at(cs, Nn)); t = norm(p1 - p0); b = np.cross(t, nn)
        rings = []
        for f, rr, dz in ((0, .4, -1.1), (.22, 1, 0), (.78, 1, 0), (1, .4, -1.1)):
            ctr = p0 + (p1 - p0) * f + nn * r * dz
            rings.append(ctr[:, None, :] + r * rr * (np.cos(ang)[None, :, None] * b[:, None, :] + np.sin(ang)[None, :, None] * nn[:, None, :]))
        V = np.stack(rings, 1); ns = len(cs); idx = np.arange(ns * 4 * k).reshape(ns, 4, k); j2 = np.roll(idx, -1, 2)
        F = np.stack([idx[:, :-1], idx[:, 1:], j2[:, 1:], j2[:, :-1]], -1).reshape(-1, 4)
        parts.append((V.reshape(-1, 3), F, np.stack(np.broadcast_arrays(np.arange(4)[None, :, None] / 3., ang[None, None, :] / (2 * pi)), -1).reshape(-1, 2).repeat(1, 0)[: 4 * k].repeat(1, 0).reshape(1, -1, 2).repeat(ns, 0).reshape(-1, 2)))
    if parts: return add_mesh(name, join(parts), material, "Stitching", recalc=True, parent=parent)

# ───────────────────────────── líneas de diseño ─────────────────────────────
OPEN_PTS = [(0, "z", .086), (.02, "z", .080), (.045, "z", .066), (.07, "z", .061), (.09, "z", .069), (.106, "d", .0165), (.13, "d", .0145), (.16, "d", .0135), (.188, "d", .0125)]
_op = {sd: spline([PT(sd, *p) for p in OPEN_PTS], 300, scale=(LOUT, .09)) for sd in "LM"}
def s_open(sd): o = _op[sd]; return lambda u: np.interp(u, o[:, 0], o[:, 1] if sd == "L" else 2 - o[:, 1])
def s_top(sd): so = s_open(sd); return lambda u: so(u) + (1 - so(u)) * smooth(ux(.188), ux(.2), u)       # boca: borde del cuello y garganta que se cierra en U
EX = [.187, .171, .155, .139, .123, .107]; ED = .0235                                                        # ojales: x de cada fila y distancia al lomo

def build():
    global ROOT
    for o in [o for o in bpy.data.objects if o.name.endswith(f"_{SIDE}")]: bpy.data.objects.remove(o, do_unlink=True)
    for m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(m)
    ROOT = bpy.data.objects.new(f"Sneaker_{SIDE}", None); ROOT.empty_display_size = .05; coll(None).objects.link(ROOT)
    St = []                                                                                                  # (nombre, líneas, padre, material)
    both = lambda fn: [fn("L"), fn("M")]

    # ── capellada: base, forro, paneles ──
    ruled("Upper_Base", both(lambda sd: (along(sd, 0, .287, .0, 230), along(sd, 0, .287, s_top(sd), 230))), 34, 0, .0012, "knit")
    ruled("Lining", both(lambda sd: (along(sd, 0, .2, .015, 120), along(sd, 0, .2, lambda u: np.minimum(s_open(sd)(u), [s_of(sd, x, "d", .038) for x in u]), 120))), 24, -.0022, .001, "lining", "Interior", bevel=0)
    pil = lambda t, w: -.0045 * np.sin(pi * np.clip(w, 0, 1))**.7 * (smooth(0, .12, t) * smooth(1, .8, t) + .0) * (.55 + .45 * np.cos(t * pi * 3)**2)
    ruled("Heel_Padding", [(along("L", .078, 0, lambda u: .28 * s_open("L")(u), 40), along("L", .078, 0, lambda u: .93 * s_open("L")(u), 40)),
                           (along("M", 0, .078, lambda u: .28 * s_open("M")(u), 40), along("M", 0, .078, lambda u: .93 * s_open("M")(u), 40))], 16, -.0032, .0008, "collar", "Interior", bevel=0, disp=pil)
    hp, hi = ruled("Heel_Panel", both(lambda sd: (along(sd, 0, .082, .03, 50), along(sd, 0, .1025, lambda u: s_open(sd)(u) - .004, 50))), 22, .0012, .0014, "suede")
    St.append(("Stitch_Heel_Panel", sum([edge_lines(i, "e", .0022) for i in hi], []) + [(np.stack([np.full(30, uu), np.linspace(s_of("L", 0, "z", .054), s_open("L")(0) - .06, 30) if k == 0 else 2 - np.linspace(s_of("L", 0, "z", .054), s_open("L")(0) - .06, 30)], 1), .0026) for k, uu in ((0, .012), (1, .012))], hp, "thread"))
    for sd, nm, xa, xb in (("L", "Lat", .0845, .105), ("M", "Med", .0845, .105)):
        so = s_open(sd); ob, inf = ruled(f"Mesh_Panel_{nm}", [(along(sd, xa, .1985, .035, 70), along(sd, xb, .197, lambda u: so(u) - .0012 / np.interp(u, UG, AL), 70))], 26, .0012, .0013, "mesh")
        St.append((f"Stitch_Mesh_{nm}", edge_lines(inf[0], "se", .002), ob, "thread"))
    ob, inf = ruled("Toe_Box", both(lambda sd: (along(sd, .2015, .287, .035, 60), along(sd, .204, .287, 1.0, 60))), 30, .0012, .0013, "mesh")
    St.append(("Stitch_Toe_Box", sum([edge_lines(i, "s", .002) for i in inf], []), ob, "thread"))
    ob, inf = ruled("Toe_Reinforcement", both(lambda sd: (along(sd, .188, .287, .02, 64), C(sd, [(.188, "z", .004), (.213, "z", .013), (.243, "z", .0205), (.263, "z", .0235), (.277, "s", 1), (.282, "s", 1), (.287, "s", 1)], 64))), 12, .0025, .0012, "film")
    St.append(("Stitch_Toe_Reinforcement", [(l[l[:, 0] < ux(.268)], t) for l, t in sum([edge_lines(i, "B", .0018) for i in inf], [])], ob, "thread"))
    ruled("Heel_Counter", both(lambda sd: (along(sd, 0, .094, .02, 56), C(sd, [(0, "z", .046), (.02, "z", .0445), (.045, "z", .035), (.07, "z", .022), (.094, "z", .0045)], 56))), 14, .0026, .0018, "tpu", "Heel", bevel=.0007,
          disp=lambda t, w: .0007 * smooth(.08, .2, w) * smooth(.98, .8, w) * smooth(1, .7, t) * (np.cos(w * pi * 7)**2 - .5))
    def eye(sd):
        st = s_top(sd); A = along(sd, .100, .2145, st, 80)
        return A, C(sd, [(.097, "d", .036), (.12, "d", .034), (.16, "d", .032), (.19, "d", .030), (.207, "d", .0215), (.2145, "d", .010), (.2168, "s", 1)], 80)
    es, inf = ruled("Eyestay", both(eye), 8, .0025, .0013, "film")
    St.append(("Stitch_Eyestay", sum([edge_lines(i, "B", .0016) + edge_lines(i, "B", .0034) + edge_lines(i, "A", .0016) for i in inf], []), es, "thread"))
    strap = lambda xt, xb: [(C("L", [(xt, "d", .0335), (xt - .008, "s", .5), (xb + .004, "s", .22), (xb, "s", .03)], 40), C("L", [(xt + .0115, "d", .033), (xt + .005, "s", .5), (xb + .018, "s", .22), (xb + .016, "s", .03)], 40))]
    ob, inf = ruled("Side_Overlay_Lat", strap(.119, .096) + strap(.150, .132), 6, .0025, .0011, "film")
    St.append(("Stitch_Side_Overlay_Lat", sum([edge_lines(i, "AB", .0015) for i in inf], []), ob, "thread"))
    ob, inf = ruled("Side_Overlay_Med", [(C("M", [(.116, "d", .0335), (.104, "s", .5), (.094, "s", .22), (.090, "s", .03)], 44), C("M", [(.150, "d", .033), (.156, "s", .5), (.166, "s", .22), (.172, "s", .03)], 44))], 18, .0025, .0011, "film")
    St.append(("Stitch_Side_Overlay_Med", edge_lines(inf[0], "AB", .0015), ob, "thread"))
    ob, inf = ruled("Branding_Panel", [(C("L", [(.034, "z", .037), (.064, "z", .034)], 16), C("L", [(.036, "z", .050), (.066, "z", .047)], 16))], 8, .0026, .0009, "brand", "Heel", unit=True, bevel=.0003)
    St.append(("Stitch_Branding_Panel", edge_lines(inf[0], "ABse", .0012), ob, "thread_lime"))

    # ── cuello acolchado ──
    cu = np.concatenate([along("L", .104, 0, 0, 70)[:, 0], along("M", 0, .104, 0, 70)[1:, 0]]); nh = q(70)
    cuv = np.stack([cu, np.concatenate([s_open("L")(cu[:nh]), 2 - s_open("M")(cu[nh:])])], 1); P, Nn = S(cuv, .0003)
    th = 2 * pi * np.arange(14) / 14; tt = np.linspace(0, 1, len(cu)); taper = .45 + .55 * smooth(0, .16, tt) * smooth(1, .84, tt)
    add_mesh("Collar", g_sweep(P, Nn, np.stack([.0052 * np.cos(th), .0043 * np.sin(th)], 1), scale=taper * (1 + .12 * np.exp(-((tt - .5) / .12)**2))), "collar", "Heel", recalc=True)

    # ── lengüeta ──
    tedge = [(.056, "d", .001), (.0575, "d", .012), (.064, "d", .024), (.078, "d", .031), (.11, "d", .034), (.16, "d", .031), (.206, "d", .024)]
    tg, inf = ruled("Tongue", [(C("L", tedge, 90), C("M", tedge, 90))], 28, -.0058, .0052, "knit", "Tongue", bevel=.0016)
    St.append(("Stitch_Tongue", edge_lines(inf[0], "AB", .003), tg, "thread"))
    pedge = [(.064, "d", .002), (.067, "d", .014), (.076, "d", .022), (.095, "d", .025), (.113, "d", .024)]
    tp, inf = ruled("Tongue_Padding", [(C("L", pedge, 50), C("M", pedge, 50))], 22, -.0006, .0016, "collar", "Tongue", bevel=.0008, disp=lambda t, w: .0011 * np.abs(np.sin(pi * 5 * t))**.6)
    lb, inf = ruled("Tongue_Label", [(C("M", [(.0945, "d", .013), (.0832, "d", .013)], 14), C("L", [(.0945, "d", .013), (.0832, "d", .013)], 14))], 10, .0021, .0007, "brand", "Tongue", unit=True, bevel=.0003, parent=tp)
    St.append(("Stitch_Tongue_Label", edge_lines(inf[0], "ABse", .0011), lb, "thread_lime"))

    # ── ojales ──
    def torus(c, n, R=.0027, r=.00075, a=18, b=8):
        t1 = norm(np.cross(n, [1, 0, .3])); t2 = np.cross(n, t1); th = 2 * pi * np.arange(a) / a; ph = 2 * pi * np.arange(b) / b
        V = c + (R + r * np.cos(ph))[None, :, None] * (np.cos(th)[:, None, None] * t1 + np.sin(th)[:, None, None] * t2) + (.7 * r * np.sin(ph))[None, :, None] * n
        idx = np.arange(a * b).reshape(a, b); i2 = np.roll(idx, -1, 0)
        return V.reshape(-1, 3), np.stack([idx, i2, np.roll(i2, -1, 1), np.roll(idx, -1, 1)], -1).reshape(-1, 4), np.stack(np.broadcast_arrays(th[:, None] / 6.28, ph[None, :] / 6.28), -1).reshape(-1, 2)
    for sd, nm in (("L", "Lat"), ("M", "Med")):
        pts = np.array([PT(sd, x, "d", ED) for x in EX]); P, Nn = S(pts, .0041)
        add_mesh(f"Eyelets_{nm}", join([torus(P[i], Nn[i]) for i in range(len(EX))]), "metal", "Lacing", recalc=True)

    # ── cordones ──
    lp = prof_flat(.0031, .00085)
    def run(uv, off, sx=None):
        P, Nn = S(uv, off); return g_sweep(P, Nn, lp, scale=None if sx is None else np.stack([sx, np.ones(len(sx))], 1))
    keys = np.array([(-.019, -.0014), (-.0145, -.0012), (-.010, .0016), (0, .0030), (.0150, .0050), (ED - .0022, .0054), (ED, -.0006)])
    kf = spline(keys, 300, scale=(1, 1))
    arms = []
    for k in range(len(EX) - 1):
        for sd in "LM":
            a = np.array(PT(sd, EX[k], "d", ED)); e = np.array(PT("M" if sd == "L" else "L", EX[k + 1] + .002, "d", .019)); t = np.linspace(0, 1, q(34))[:, None]
            uv = a * (1 - t) + e * t; d = dist(uv) * (1 if sd == "L" else -1); over = (k % 2 == 0) == (sd == "L")
            arms.append(run(uv, np.interp(d, kf[:, 0], kf[:, 1]) + (.0017 if over else 0) * np.exp(-(d / .0045)**2), .5 + .5 * smooth(0, .004, ED - d)))
    bar = np.array(PT("L", EX[0] + .003, "d", .019)) * (1 - np.linspace(0, 1, 14)[:, None]) + np.array(PT("M", EX[0] + .003, "d", .019)) * np.linspace(0, 1, 14)[:, None]
    arms.append(run(bar, -.0012 + .0012 * np.exp(-(dist(bar) / .009)**2)))
    add_mesh("Laces", join(arms), "lace", "Lacing", recalc=True)
    # moño: nudo + 2 lazos + 2 puntas con herretes
    lay = lambda d: np.interp(np.abs(d), [0, .012, .032, .044, .08], [.0064, .0060, .0058, .0042, .0038])
    K, Kn = S(np.array(PT("L", .1005, "d", 0)), .0062); et = norm(S(np.array([ux(.104), 1.]))[0] - S(np.array([ux(.097), 1.]))[0]); th = np.linspace(0, 2 * pi, 20)
    kp = K + .0040 * np.cos(th)[:, None] * et + .0027 * np.sin(th)[:, None] * Kn
    bow = [g_sweep(kp, norm(kp - K), prof_flat(.0034, .0008), caps=False)]; agl = []
    for sd in "LM":
        a = np.array(PT(sd, EX[-1], "d", ED)); t = np.linspace(0, 1, q(16))[:, None]; uv = a * (1 - t) + np.array(PT("L", .1005, "d", 0)) * t
        bow.append(run(uv, np.interp(t[:, 0], [0, .12, .3, 1], [-.0006, .0054, .0056, .0060]), .5 + .5 * smooth(0, .2, t[:, 0])))
        lo = C(sd, [(.1005, "d", 0), (.095, "d", .012), (.089, "d", .026), (.088, "d", .037), (.094, "d", .043), (.103, "d", .041), (.109, "d", .030), (.107, "d", .014), (.1005, "d", 0)], 60)
        bow.append(run(lo, lay(dist(lo)) + .0010))
        en = C(sd, [(.1005, "d", 0), (.110, "d", .012), (.119, "d", .026), (.126, "d", .038), (.130, "d", .050)], 40); P, Nn = S(en, lay(dist(en)) - .0004)
        bow.append(g_sweep(P, Nn, lp)); dr = norm(P[-1] - P[-3]); ap = P[-1] + dr * np.linspace(-.001, .013, 6)[:, None]
        th2 = 2 * pi * np.arange(10) / 10; agl.append(g_sweep(ap, np.tile(Nn[-1], (6, 1)), np.stack([.0019 * np.cos(th2), .0017 * np.sin(th2)], 1), scale=np.array([.9, 1, 1, 1, 1, .8])))
    bw = add_mesh("Lace_Bow", join(bow), "lace", "Lacing", recalc=True)
    add_mesh("Aglets", join(agl), "aglet", "Lacing", recalc=True, parent=bw)

    # ── tirador del talón ──
    sc_, slo, sin_ = s_open("L")(0.), s_of("L", 0, "z", .057), s_of("L", 0, "z", .070); k = 12
    so_ = np.linspace(slo, sc_, k); Po, No = S(np.stack([np.zeros(k), so_], 1), np.linspace(.0031, .0052, k))
    Pc, nc = S(np.array([0., sc_]), .0002); up = norm(S(np.array([0., sc_ + .01]))[0] - S(np.array([0., sc_ - .01]))[0]); ph = np.linspace(0, pi, 12)[1:-1]
    Pa = Pc + up * .009 + .005 * (np.cos(ph)[:, None] * nc + np.sin(ph)[:, None] * up); Na = np.cos(ph)[:, None] * nc + np.sin(ph)[:, None] * up
    si_ = np.linspace(sc_, sin_, k); Pi, Ni = S(np.stack([np.zeros(k), si_], 1), -np.linspace(.0050, .0034, k))
    add_mesh("Heel_Pull_Tab", g_sweep(np.concatenate([Po, Pa, Pi]), np.concatenate([No, Na, -Ni]), prof_flat(.0078, .00055, 12, .4)), "webbing", "Heel", recalc=True)

    # ── costuras (hijas de su panel: se mueven con él) ──
    for nm, lines, par, m_ in St: stitches(nm, lines, par, m_)

    # ── interior: strobel y plantilla ──
    def across(inset, nu, nw, u0=.004, u1=.996):
        u = np.linspace(u0, u1, q(nu)); w = np.linspace(0, 1, q(nw))[None, :, None]; ip = lambda A: np.stack([np.interp(u, UG, A[:, 0]), np.interp(u, UG, A[:, 1])], 1)
        return u, w[..., 0], (ip(Lxy) + ip(nL) * inset)[:, None, :] * (1 - w) + (ip(Mxy) + ip(nM) * inset)[:, None, :] * w
    u, w, xy = across(-.0012, 80, 14); z = zf(xy[..., 0])
    add_mesh("Strobel", g_slab(np.dstack([xy, z + .0006]), np.dstack([xy, z + .0001])), "strobel", "Interior", recalc=True)
    u, w, xy = across(-.0036, 90, 22); z = zf(xy[..., 0]); x = xy[..., 0]; e = np.abs(2 * w - 1)
    cup = .0075 * (1 - .75 * smooth(.05, .16, x)) * e**3.2 + .0055 * np.exp(-((x - .125) / .035)**2) * smooth(.5, 1, w)**1.5 + .0012 * np.exp(-((x - .2) / .03)**2) * (1 - e**2)
    add_mesh("Insole", g_slab(np.dstack([xy, z + .0046 + cup]), np.dstack([xy, z + .0008 + cup * .15])), "insole", "Interior", recalc=True, sharp=50)

    # ── suela: entresuela + capa de amortiguación (anillos cerrados a lo largo del contorno) ──
    us = np.linspace(0, 1, q(230) + 1); ip = lambda A: np.stack([np.interp(us, UG, A[:, 0]), np.interp(us, UG, A[:, 1])], 1)
    side = {"L": (ip(Lxy), norm(ip(nL))), "M": (ip(Mxy), norm(ip(nM)))}
    rim = {"L": f1([(0, .020), (.03, .017), (.07, .012), (.12, .008), (.19, .007), (.25, .008), (.287, .007)]),
           "M": f1([(0, .020), (.03, .017), (.07, .013), (.115, .016), (.15, .011), (.2, .007), (.25, .008), (.287, .007)])}
    Fl = {"L": f1([(0, .008), (.03, .009), (.08, .007), (.13, .005), (.19, .007), (.24, .006), (.275, .004), (.287, .003)]),
          "M": f1([(0, .008), (.03, .009), (.08, .005), (.12, .0015), (.16, .003), (.2, .006), (.25, .005), (.287, .003)])}
    o0 = lambda x: .0048 - .0008 * smooth(.08, .10, x); TW = .0022; ZB = .0045
    def zsplit(sd, x): return (.50 + (.07 if sd == "L" else -.05) * np.sin(x * 38)) * (1 - smooth(.15, .205, x)) + smooth(.15, .205, x)
    def wall(sd, i, zfr):
        B, n = side[sd][0][i], side[sd][1][i]; x = B[0]; zs = zsplit(sd, x); D0 = o0(x) + .004
        d = D0 + Fl[sd](x) * np.sin(pi * zfr**1.25)**1.3 - .0035 * zfr**3 - (.0013 * np.exp(-((zfr - zs) / .035)**2) if zs < .93 else 0) - .0012 * np.exp(-((zfr - (.18 + 1.9 * x)) / .05)**2)
        xy = B[None, :] + n[None, :] * d[:, None]; zt = zf(x); return np.concatenate([xy, (zt + (zg(xy[:, 0]) + ZB - zt) * zfr)[:, None]], 1)
    def ring(i, part):
        u = us[i]; out = {}
        for sd in "LM":
            x = side[sd][0][i][0]; sr = max(s_of(sd, u, "z", float(rim[sd](x))), .02); sv = lambda s: np.stack([np.full(len(s), u), s if sd == "L" else 2 - s], 1)
            s = np.linspace(0, sr, 5); zs = float(zsplit(sd, x)); split = zs < .93; A_ = np.interp(u, UG, AL if sd == "L" else AM)
            rin = S(sv(s), o0(x))[0]; rtop = S(sv(np.array([sr + .0012 / A_])), o0(x) + TW / 2)[0]
            rout = S(sv(s[::-1]), o0(x) + TW + (.004 - TW) * (1 - s[::-1] / sr)**1.5)[0]
            if part == "mid":
                w_ = wall(sd, i, np.linspace(.1, zs if split else .93, 11)); cor = w_[-1:] if split else wall(sd, i, np.array([.985])) - np.array([[*(side[sd][1][i] * .0012), 0]])
                end = w_[-1] if split else np.array([*(side[sd][0][i] + side[sd][1][i] * (o0(x) - .0025)), zg(x) + ZB])
                out[sd] = (np.concatenate([rin, rtop, rout, w_, cor]), end, rin[0])
            else:
                w_ = wall(sd, i, np.linspace(zs, .93, 7)); cor = wall(sd, i, np.array([.985])) - np.array([[*(side[sd][1][i] * .0012), 0]])
                out[sd] = (np.concatenate([w_, cor]), np.array([*(side[sd][0][i] + side[sd][1][i] * (o0(x) - .0025)), zg(x) + ZB]), w_[0])
        t = np.linspace(0, 1, 12)[1:-1, None]; (a, ea, ta), (b, eb, tb) = out["L"], out["M"]
        bot = ea * (1 - t) + eb * t
        if part == "cush" or not (zsplit("L", side["L"][0][i][0]) < .93): bot[:, 2] = zg(bot[:, 0]) + ZB
        return np.concatenate([a, ea[None], bot, eb[None], b[::-1], tb * (1 - t) + ta * t])
    def loft(name, idxs, part, material, capend=False):
        R = np.array([ring(i, part) for i in idxs]); R = np.concatenate([R, R[:, :1]], 1)
        vl = np.concatenate([np.zeros((len(R), 1)), np.cumsum(np.linalg.norm(np.diff(R, axis=1), axis=2), 1)], 1)
        v, f, uv = g_grid(R, np.stack(np.broadcast_arrays((us[idxs] * LOUT)[:, None], vl), -1) * 10); f = f.tolist()
        if capend: f.append((np.arange(R.shape[1] - 1) + (len(R) - 1) * R.shape[1]).tolist())
        return add_mesh(name, (v, f, uv), material, "Sole", weld=2e-5, recalc=True)
    allu = np.arange(len(us)); loft("Midsole", allu, "mid", "foam")
    loft("Foam_Cushioning_Layer", allu[[zsplit("L", side["L"][0][i][0]) < .93 for i in allu]], "cush", "bead", capend=True)

    # ── suela exterior: placas + tacos con surcos reales ──
    Lb, Mb = Lxy + nL * .0016, Mxy + nM * .0016
    def BOT(u, w, dz):
        ip = lambda A, k: np.interp(u, UG, A[:, k]); xy = np.stack([ip(Lb, 0) * (1 - w) + ip(Mb, 0) * w, ip(Lb, 1) * (1 - w) + ip(Mb, 1) * w], -1)
        return np.concatenate([xy, (zg(xy[..., 0]) + dz)[..., None]], -1)
    def plate(u0, u1, w0, w1, nu, nw, notch=0):
        t = np.linspace(0, 1, q(nu))[:, None]; w = np.linspace(w0, w1, q(nw))[None, :]; ua = u0 + notch * np.abs(w - .5) * 2; u = ua + (u1 - ua) * t; w = w * np.ones_like(u)
        return g_slab(BOT(u, w, ZB), BOT(u, w, .0028), 10)
    def lugs(u0, u1, w0, w1, rows, cols, skew=.012, flex=(), gu=.16, gw=.12):
        out = []; du = (u1 - u0) / rows; dw = (w1 - w0) / cols
        for r in range(rows):
            for c in range(cols):
                g = .34 if r in flex else gu; ua, ub = u0 + du * (r + g / 2), u0 + du * (r + 1 - g / 2); wa, wb = w0 + dw * (c + gw / 2), w0 + dw * (c + 1 - gw / 2)
                sk = lambda w: skew * (w - (wa + wb) / 2) / dw * (1 if c % 2 else -1)
                cu = np.clip(np.array([ua + sk(wa), ub + sk(wa), ub + sk(wb), ua + sk(wb)]), .002, .998); cw = np.array([wa, wa, wb, wb])
                top = BOT(cu, cw, .0031); ctr = np.array([cu.mean(), cw.mean()]); bu, bw_ = ctr[0] + (cu - ctr[0]) * .84, ctr[1] + (cw - ctr[1]) * .84; bot = BOT(bu, bw_, 0.)
                if np.linalg.norm(top[0] - top[3]) < .004: continue
                out.append((np.concatenate([top, bot]), [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], np.concatenate([top, bot])[:, :2] * 10))
        return out
    a, b = ux(.137), .992
    add_mesh("Outsole_Forefoot", join([plate(a, b, 0, 1, 70, 18, notch=.03)] + lugs(a + .035, b - .01, .03, .97, 15, 6, flex=(4, 9)) + lugs(a + .004, a + .034, .03, .30, 1, 2) + lugs(a + .004, a + .034, .70, .97, 1, 2)), "rubber", "Sole", recalc=True, sharp=28)
    h0, h1, h2 = ux(.03), ux(.088), ux(.137)
    add_mesh("Outsole_Heel", join([plate(.006, h0, 0, 1, 12, 18), plate(h0, h1, 0, .36, 22, 8), plate(h0, h1, .64, 1, 22, 8), plate(h1, h2, 0, .30, 18, 7)]
             + lugs(.012, h0 - .003, .05, .95, 2, 5, skew=.006) + lugs(h0, h1, .03, .35, 5, 2) + lugs(h0, h1, .65, .97, 5, 2) + lugs(h1, h2, .03, .29, 4, 2)), "rubber", "Sole", recalc=True, sharp=28)
    # puente de torsión (shank) en el arco
    t = np.linspace(0, 1, q(26))[:, None]; wv = np.linspace(0, 1, q(18))[None, :]; u = ux(.09) + (ux(.142) - ux(.09)) * t * np.ones_like(wv)
    w = (.37 + .10 * np.sin(pi * t)) + (.955 - (.37 + .10 * np.sin(pi * t))) * wv
    top = BOT(u, w, ZB + .0004); bot = BOT(u, w, ZB - .0012); bot[..., 2] -= .0009 * np.cos(pi * 3 * wv)**2 * np.sin(pi * t)**.5
    add_mesh("Shank", g_slab(top, bot), "shank", "Sole", recalc=True, sharp=40)
    return ROOT

build()
