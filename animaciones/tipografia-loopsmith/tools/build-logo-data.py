"""
Genera core/logo-data.js: el lockup de Loop Smith como geometría vectorial.

Fuente de verdad (lockup del sitio, css/styles.css -> .site-brand):
  símbolo de 1em · separación 0.2884em · nombre "Loop Smith" en Outfit 700,
  font-size 0.5023em, letter-spacing -0.045em, line-height 1, centrado en vertical.

Los contornos salen de la propia Outfit (assets/fonts/outfit-variable.woff2, OFL)
instanciada en wght=700 y las posiciones de HarfBuzz (kerning incluido), así que
cada letra es idéntica a la que pinta el navegador con el texto vivo.

Uso:  pip install fonttools brotli uharfbuzz
      python tools/build-logo-data.py
"""
import io, json, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

HERE = pathlib.Path(__file__).resolve().parent
FONT = HERE.parents[2] / "assets" / "fonts" / "outfit-variable.woff2"
OUT = HERE.parent / "core" / "logo-data.js"

TEXT, WEIGHT = "Loop Smith", 700
NAME_SIZE, GAP, TRACKING = 0.5023, 0.2884, -0.045   # en em del símbolo / em del nombre

font = instantiateVariableFont(TTFont(FONT), {"wght": WEIGHT})
font.flavor = None
buf = io.BytesIO(); font.save(buf)
upm = font["head"].unitsPerEm
glyphs = font.getGlyphSet()

hbfont = hb.Font(hb.Face(buf.getvalue()))
hbuf = hb.Buffer(); hbuf.add_str(TEXT); hbuf.guess_segment_properties()
hb.shape(hbfont, hbuf, {"kern": True, "liga": True})

# Línea base dentro de una caja de line-height 1 (métricas hhea, las que usa Chrome).
asc, desc = font["hhea"].ascent, -font["hhea"].descent
baseline = ((upm - (asc + desc)) / 2 + asc) / upm           # en em del nombre, desde arriba
name_top = (1 - NAME_SIZE) / 2                              # caja del nombre centrada en el símbolo
k = NAME_SIZE / upm                                         # unidades de fuente -> em del símbolo

r = lambda v: round(v, 4)
parts, pen_x = [], 0.0
for i, (info, pos) in enumerate(zip(hbuf.glyph_infos, hbuf.glyph_positions)):
    name = font.getGlyphName(info.codepoint)
    char = TEXT[info.cluster]
    bp = BoundsPen(glyphs); glyphs[name].draw(bp)
    if bp.bounds:
        x0, y0, x1, y1 = bp.bounds
        sp = SVGPathPen(glyphs, lambda v: str(int(round(v))) if abs(v - round(v)) < 1e-6 else f"{v:.1f}")
        glyphs[name].draw(TransformPen(sp, (1, 0, 0, -1, -x0, y1)))   # origen arriba-izquierda, y hacia abajo
        parts.append({
            "char": char, "word": 0 if i < TEXT.index(" ") else 1,
            "x": r(1 + GAP + (pen_x + pos.x_offset + x0) * k),
            "y": r(name_top + baseline * NAME_SIZE - y1 * k),
            "w": r((x1 - x0) * k), "h": r((y1 - y0) * k),
            "vw": r(x1 - x0), "vh": r(y1 - y0), "d": sp.getCommands(),
        })
    pen_x += pos.x_advance + TRACKING * upm

width = 1 + GAP + (pen_x) * k
data = {
    "text": TEXT, "font": f"Outfit {WEIGHT}", "width": r(width), "height": 1,
    "nameX": r(1 + GAP), "nameSize": NAME_SIZE,
    # Símbolo: vectorizado a mano desde assets/images/logo-loopsmith.png (512 px) del sitio.
    # Cuadrado redondeado + degradado diagonal + "L" (medidas relativas al lado).
    "symbol": {
        "radius": 0.22,
        "L": [[0.3503, 0.2525], [0.444, 0.2525], [0.444, 0.668], [0.6701, 0.668], [0.6701, 0.7495], [0.3503, 0.7495]],
        "ink": "#152627",
        "tones": {
            "site":   [[0, "#d3f060"], [0.3, "#b8e663"], [0.5, "#6dc769"], [0.75, "#2dab75"], [1, "#12936f"]],
            "render": [[0, "#e6ff00"], [0.3, "#b2ee3c"], [0.5, "#52d355"], [0.62, "#00c765"], [1, "#00a781"]],
        },
    },
    "letters": parts,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    "/* GENERADO por tools/build-logo-data.py. No editar a mano. */\n"
    "window.LoopSmithType = window.LoopSmithType || {};\n"
    "window.LoopSmithType.logoData = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"{OUT.name}: {len(parts)} letras, ancho {width:.4f}em, baseline {baseline:.4f}, hhea {asc}/{desc}, upm {upm}")
for p in parts: print(" ", p["char"], p["x"], p["y"], p["w"], p["h"], len(p["d"]))
