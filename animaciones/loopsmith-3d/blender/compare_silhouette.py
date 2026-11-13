"""Compara la silueta frontal del .blend (render ortográfico) con los contornos 2D de origen: IoU píxel a píxel.
Uso: python compare_silhouette.py   (requiere Pillow y haber corrido verify_render.py)"""
import json, pathlib
from PIL import Image, ImageDraw
import numpy as np
H = pathlib.Path(__file__).resolve().parent
d = json.load(open(H / "logo_polys.json", encoding="utf-8"))
img = Image.open(H.parent / "assets" / "previews" / "blender-silhouette-front.png").convert("RGBA")
W, Hh = img.size; ppu = W / 4.0
render = np.asarray(img)[..., 3] > 127
ref = Image.new("L", (W, Hh), 0); dr = ImageDraw.Draw(ref)
px = lambda p: ((p[0] + 2.0) * ppu, (Hh / 2 - p[1] * ppu))
def rr(cx, cz, s, r, n=64):
    import math; pts = []
    for ccx, ccz, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n); pts.append((cx + ccx * (s / 2 - r) + r * math.cos(a), cz + ccz * (s / 2 - r) + r * math.sin(a)))
    return pts
dr.polygon([px(p) for p in rr(d["symbol"]["x"] + .5, 0, 1, d["symbol"]["radius"])], fill=255)
for L in d["letters"]:
    for poly in L["polys"]:
        dr.polygon([px(p) for p in poly["exterior"]], fill=255)
        for h in poly["holes"]: dr.polygon([px(p) for p in h], fill=0)
ref = np.asarray(ref) > 127
inter, union = (ref & render).sum(), (ref | render).sum()
print(f"IoU silueta frontal Blender vs contornos de origen: {inter / union:.5f}  (px ref {ref.sum()}, px render {render.sum()}, diferencia {abs(int(ref.sum()) - int(render.sum())) / ref.sum() * 100:.3f}%)")
