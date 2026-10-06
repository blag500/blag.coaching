# Builds the board's artwork from the real mark and the real wordmark.
# Mark geometry is copied from cheatcode/brand/chain.svg, only the colour changes.
# Wordmark: Unbounded at wght 800, CHEATCODE, tracking -0.01em, outlined.
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

OUT = os.path.join(os.path.dirname(__file__), "art")
os.makedirs(OUT, exist_ok=True)

INK_L, ACC_L = "#141C17", "#1F6B4E"   # page.html light
INK_D, ACC_D = "#E9F0EA", "#4FBF8E"   # page.html dark
FIELD_DARK = "#141C18"

def chain_group(color, mask_id):
    return f'''<defs><mask id="{mask_id}"><rect width="64" height="64" fill="#fff"/>
<rect x="27" y="23" width="31" height="18" rx="9" fill="none" stroke="#000" stroke-width="12"/></mask></defs>
<g transform="rotate(-35 32 32)" fill="none" stroke="{color}" stroke-width="5.5" stroke-linecap="round">
<rect x="6" y="23" width="31" height="18" rx="9" mask="url(#{mask_id})"/>
<rect x="27" y="23" width="31" height="18" rx="9"/></g>'''

def symbol(color, name):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">{chain_group(color, "m")}</svg>'
    open(os.path.join(OUT, name), "w").write(svg)

# --- wordmark outlines
font = TTFont(os.path.join(os.path.dirname(__file__), "Unbounded-VF.ttf"))  # google/fonts ofl/unbounded, not committed
font = instantiateVariableFont(font, {"wght": 800})
gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
upm = font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight
track = -0.01 * upm

def word_paths(text, x0):
    """Return list of (d, start_x) per glyph, in font units, y-down with baseline at cap."""
    out, x = [], x0
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, cap)))
        out.append(pen.getCommands())
        x += hmtx[g][0] + track
    return out, x - track

cheat, xa = word_paths("CHEAT", 0)
code, xb = word_paths("CODE", xa + track)
# true ink bounds of the whole word
bp = BoundsPen(gs); x = 0
for ch in "CHEATCODE":
    g = cmap[ord(ch)]
    gs[g].draw(TransformPen(bp, (1, 0, 0, 1, x, 0))); x += hmtx[g][0] + track
xmin, ymin, xmax, ymax = bp.bounds
W, H = xmax - xmin, ymax - ymin  # ymax ~ cap (plus overshoot), ymin ~ -overshoot

def wordmark_svg(ink, acc, height=256, pad=0):
    s = height / H
    vb_w = W * s + 2 * pad
    body = (f'<g transform="translate({pad - xmin * s:.2f} {(ymax - cap) * s:.2f}) scale({s:.5f})">'
            f'<path fill="{ink}" d="{" ".join(cheat)}"/><path fill="{acc}" d="{" ".join(code)}"/></g>')
    return vb_w, body

def write_word(ink, acc, name):
    w, body = wordmark_svg(ink, acc)
    open(os.path.join(OUT, name), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} 256" width="{w:.0f}" height="256">{body}</svg>')

# --- horizontal lockup: mark height = 2x cap height, gap = 0.5 cap, wordmark centred on the mark
def lockup(mark_color, ink, acc, name):
    Hl = 256.0
    mark = Hl                  # mark box 0..256 (the chain fills ~86% of its 64 box)
    capH = Hl * 0.82 / 1.5     # chain ink is 82% of its box; wordmark = 2/3 of the chain
    w, body = wordmark_svg(ink, acc, height=capH)
    gap = capH * 0.4 - Hl * 0.025   # box has ~2.5% air beside the ink
    total = mark + gap + w
    open(os.path.join(OUT, name), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total:.1f} {Hl:.0f}" width="{total:.0f}" height="{Hl:.0f}">'
        f'<svg x="0" y="0" width="{mark}" height="{mark}" viewBox="0 0 64 64">{chain_group(mark_color, "lk")}</svg>'
        f'<g transform="translate({mark + gap:.2f} {(Hl - capH) / 2:.2f})">{body}</g></svg>')

symbol(ACC_L, "symbol.svg")
symbol(ACC_D, "symbol-dark.svg")
symbol(FIELD_DARK, "symbol-on-tile.svg")
write_word(INK_L, ACC_L, "wordmark.svg")
write_word(INK_D, ACC_D, "wordmark-dark.svg")
lockup(ACC_L, INK_L, ACC_L, "lockup.svg")
lockup(ACC_D, INK_D, ACC_D, "lockup-dark.svg")
lockup(FIELD_DARK, FIELD_DARK, FIELD_DARK, "lockup-on-tile.svg")
print("ok", round(W), round(H), cap, upm)
