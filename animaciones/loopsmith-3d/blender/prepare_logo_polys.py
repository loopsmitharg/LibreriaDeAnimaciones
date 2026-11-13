"""
Paso 1 del pipeline: geometría 2D limpia del logo para modelar en Blender.

Lee los contornos de la colección anterior (animaciones/tipografia-loopsmith/core/logo-data.js, generados desde
Outfit 700 con el kerning del lockup del sitio), los aplana, une los trazos superpuestos con regla de relleno
no-cero (la fuente trae contornos solapados, p. ej. el asta y el pie de la "L") y resta las contraformas.
Salida: logo_polys.json (unidades = lado del símbolo; X derecha, Z arriba; el lockup queda centrado en el origen).

Uso:  pip install shapely   ·   python prepare_logo_polys.py
"""
import json, math, pathlib, re
from shapely.geometry import Polygon
from shapely.ops import unary_union

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parents[1] / "tipografia-loopsmith" / "core" / "logo-data.js"
Q_STEPS = 10   # segmentos por curva cuadrática: el borde de las curvas queda liso tras el bisel

raw = SRC.read_text(encoding="utf-8")
D = json.loads(raw[raw.index("logoData = ") + 11:].rstrip().rstrip(";"))


def contours(d):
    """Path SVG (M L H V Q Z, absolutos) -> lista de contornos como polilíneas en unidades de fuente."""
    out, cur, pos = [], None, (0.0, 0.0)
    for cmd, args in re.findall(r"([MLHVQZ])([^MLHVQZ]*)", d):
        n = [float(v) for v in re.findall(r"-?\d*\.?\d+", args)]
        if cmd == "M": cur = [(n[0], n[1])]; out.append(cur); pos = (n[0], n[1])
        elif cmd == "L": pos = (n[0], n[1]); cur.append(pos)
        elif cmd == "H": pos = (n[0], pos[1]); cur.append(pos)
        elif cmd == "V": pos = (pos[0], n[0]); cur.append(pos)
        elif cmd == "Q":
            for i in range(0, len(n), 4):
                (x0, y0), (cx, cy), (x1, y1) = pos, (n[i], n[i + 1]), (n[i + 2], n[i + 3])
                for s in range(1, Q_STEPS + 1):
                    t = s / Q_STEPS
                    cur.append(((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1))
                pos = (x1, y1)
    return [c for c in out if len(c) >= 3]


def area(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2


def rings(geom):
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    return [{"exterior": [list(c) for c in p.exterior.coords[:-1]], "holes": [[list(c) for c in h.coords[:-1]] for h in p.interiors]} for p in polys]


r = lambda v: round(v, 5)
letters = []
for i, l in enumerate(D["letters"]):
    sx, sy = l["w"] / l["vw"], l["h"] / l["vh"]
    cs = [[(r(l["x"] + x * sx - D["width"] / 2), r(.5 - (l["y"] + y * sy))) for x, y in c] for c in contours(l["d"])]
    sign = math.copysign(1, area(max(cs, key=lambda c: abs(area(c)))))       # el contorno mayor define "relleno"
    fill = unary_union([Polygon(c).buffer(0) for c in cs if area(c) * sign > 0])
    holes = [Polygon(c).buffer(0) for c in cs if area(c) * sign < 0]
    shape = fill.difference(unary_union(holes)) if holes else fill
    shape = shape.simplify(0.00004)
    assert shape.is_valid and not shape.is_empty, l["char"]
    polys = rings(shape)
    minx, minz, maxx, maxz = shape.bounds
    letters.append({"id": f"Letter_{i:02d}", "char": l["char"], "index": i, "word": l["word"], "polys": [{"exterior": [[r(x), r(z)] for x, z in p["exterior"]], "holes": [[[r(x), r(z)] for x, z in h] for h in p["holes"]]} for p in polys], "bounds": [r(minx), r(minz), r(maxx), r(maxz)]})
    print(f'{l["char"]}: {len(polys)} polígono(s), {sum(len(p["exterior"]) + sum(map(len, p["holes"])) for p in polys)} puntos, huecos {sum(len(p["holes"]) for p in polys)}')

S = D["symbol"]
out = {"width": D["width"], "unit": "lado del símbolo = 1", "letters": letters,
       "symbol": {"x": -D["width"] / 2, "z": 0, "size": 1, "radius": S["radius"], "L": [[r(x - .5 - D["width"] / 2 + .5), r(.5 - y)] for x, y in S["L"]], "ink": S["ink"], "tones": S["tones"]["site"]}}
(HERE / "logo_polys.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print("logo_polys.json", (HERE / "logo_polys.json").stat().st_size, "bytes")

# Textura del degradado del símbolo (compatible con glTF): diagonal arriba-izquierda -> abajo-derecha.
from PIL import Image
tex = HERE.parent / "assets" / "textures"; tex.mkdir(parents=True, exist_ok=True)
stops = [(o, tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))) for o, c in out["symbol"]["tones"]]
def tone(t):
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if t <= b: k = (t - a) / (b - a); return tuple(round(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
    return stops[-1][1]
N = 512
img = Image.new("RGB", (N, N))
img.putdata([tone(((x + y) / (2 * (N - 1)))) for y in range(N) for x in range(N)])
img.save(tex / "symbol_gradient.png", optimize=True)
print("symbol_gradient.png", (tex / "symbol_gradient.png").stat().st_size, "bytes")
