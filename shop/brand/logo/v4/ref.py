# По табелата: контур на сърце; дясната половина е стегната ръка (бицепсът е горната дясна дъга,
# юмрукът е свит навътре до средата, предмишницата слиза към лакътя вдясно); житен клас долу.
H = 'M128 226 C 80 190, 24 150, 24 98 C 24 60, 50 34, 84 34 C 104 34, 120 46, 128 64 C 136 46, 152 34, 172 34 C 206 34, 232 60, 232 98 C 232 150, 176 190, 128 226 Z'
FIST = ('M150 66 C 140 66, 136 74, 140 80 C 132 82, 132 92, 140 94 C 134 98, 136 108, 146 108 '
        'L 170 108 C 182 108, 190 100, 190 88 L 190 80 C 190 70, 182 64, 172 64 Z')
FINGERS = ['M140 80 L 160 80', 'M140 94 L 162 94', 'M174 64 C 166 70, 164 78, 170 84']   # пръсти и палец
FOREARM = ['M188 98 C 204 108, 218 122, 228 134', 'M178 108 C 194 122, 206 140, 214 156']  # горна и долна линия
WHEAT = ['M128 214 L 128 150'] + [f'M128 {y} C {128 - 16} {y - 6}, {128 - 18} {y - 18}, {128 - 6} {y - 26}' for y in (196, 178, 160)] \
        + [f'M128 {y} C {128 + 16} {y - 6}, {128 + 18} {y - 18}, {128 + 6} {y - 26}' for y in (196, 178, 160)]
def mark(size, ink, accent, bg, wheat=True, sw=11):
    s = f'fill="none" stroke-linecap="round" stroke-linejoin="round"'
    o = f'<svg viewBox="0 0 256 256" width="{size}" height="{size}"><g {s}>'
    o += f'<path stroke="{ink}" stroke-width="{sw}" d="{H}"/>'
    o += ''.join(f'<path stroke="{ink}" stroke-width="{sw}" d="{d}"/>' for d in FOREARM)
    o += f'<path fill="{bg}" stroke="{ink}" stroke-width="{sw}" d="{FIST}"/>'
    o += ''.join(f'<path stroke="{ink}" stroke-width="{sw * 0.75}" d="{d}"/>' for d in FINGERS)
    if wheat: o += ''.join(f'<path stroke="{accent}" stroke-width="{sw * 0.8}" d="{d}"/>' for d in WHEAT)
    return o + '</g></svg>'
PAL = [('#EEEAE1', '#173F2E', '#3FA35B'), ('#173F2E', '#EEEAE1', '#D4F04A'), ('#EEEAE1', '#12140F', '#E5482F'), ('#2C2F2B', '#F1EEE6', '#4CC27A')]
cells = ''.join(f'<div class="c" style="background:{bg}">{mark(200, i, a, bg)}</div>' for bg, i, a in PAL)
cells2 = ''.join(f'<div class="c" style="background:{bg}">{mark(200, i, a, bg, False)}</div>' for bg, i, a in PAL)
F = 'file:///D:/blag-ai/fonts/'
sign = f'<div class="sign"><span>ЗДРАВЕ</span>{mark(120, "#F1EEE6", "#4CC27A", "#2C2F2B")}<span>СИЛА</span></div>'
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{{font-family:'Golos Text';src:url({F}GolosText.ttf);font-weight:400 900}}
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:40px 48px;width:1100px}} h1{{font-size:30px;margin:0 0 6px}} p{{font-size:17px;color:#55584F;margin:0 0 20px}}
.row{{display:flex;gap:16px;margin:0 0 16px}} .c{{width:230px;height:230px;border-radius:22px;display:grid;place-items:center}}
.sign{{display:flex;align-items:center;gap:14px;background:#2C2F2B;border-radius:18px;padding:22px 34px;width:max-content;font:800 76px 'Golos Text';color:#F1EEE6;letter-spacing:.01em;margin-top:8px}}
</style><div class="wrap"><h1>По табелата: сърце, чиято дясна половина е стегната ръка</h1>
<p>Горе — с житен клас, както на снимката; отдолу — без него. Най-долу — както би стояло на табелата.</p>
<div class="row">{cells}</div><div class="row">{cells2}</div>{sign}</div>'''
open('ref.html', 'w', encoding='utf-8').write(html)
