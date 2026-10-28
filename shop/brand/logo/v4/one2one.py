# 1:1 по табелата, без житния клас. python one2one.py → one2one.html
H = 'M128 226 C 80 190, 26 150, 26 96 C 26 58, 50 34, 82 34 C 104 34, 120 46, 128 66 C 136 46, 152 34, 174 34 C 206 34, 230 58, 230 96 C 230 150, 176 190, 128 226 Z'
# Вътрешната линия: юмрук горе (свит навътре), предмишница надолу, бицепс отдолу вляво.
ARM = {
 '1': 'M136 86 C 136 70, 146 56, 162 54 C 180 52, 194 62, 194 78 C 194 90, 186 96, 178 96 L 180 140 C 180 148, 186 152, 192 152 '
      'M180 150 C 172 132, 150 130, 140 150 C 136 158, 130 162, 128 164',
 '2': 'M138 84 C 138 66, 150 54, 166 54 C 184 54, 196 66, 194 82 C 192 94, 184 98, 176 98 C 172 98, 170 104, 172 110 L 176 142 '
      'C 168 128, 146 128, 138 146 C 136 152, 132 156, 128 158',
}
KNUCKLES = {'1': ['M166 54 C 160 62, 160 72, 168 78', 'M150 60 C 146 68, 148 76, 156 80'], '2': ['M168 56 C 162 64, 162 74, 170 80']}
def mark(size, k, rim, fill, bg, sw=13):
    o = f'<svg viewBox="0 0 256 256" width="{size}" height="{size}"><g stroke-linecap="round" stroke-linejoin="round">'
    o += f'<path fill="{fill}" stroke="{rim}" stroke-width="{sw}" d="{H}"/>'
    o += f'<path fill="none" stroke="{rim}" stroke-width="{sw * 0.85}" d="{ARM[k]}"/>'
    o += ''.join(f'<path fill="none" stroke="{rim}" stroke-width="{sw * 0.6}" d="{d}"/>' for d in KNUCKLES[k])
    return o + '</g></svg>'
PAL = [('табела', '#2E3338', '#F4F4F0', '#1F7A45'), ('зелено на овес', '#EEEAE1', '#173F2E', '#EEEAE1'),
       ('плътно зелено', '#EEEAE1', '#EEEAE1', '#1F7A45'), ('мастило', '#EEEAE1', '#12140F', '#EEEAE1')]
rows = ''
for k in ARM:
    rows += '<div class="row">' + ''.join(f'<div><div class="c" style="background:{bg}">{mark(200, k, r, f, bg)}</div><p>{n}</p></div>' for n, bg, r, f in PAL) + '</div>'
F = 'file:///D:/blag-ai/fonts/'
sign = f'<div class="sign"><span>ЗДРАВЕ</span>{mark(116, "1", "#F4F4F0", "#1F7A45", "#2E3338", 15)}<span>СИЛА</span></div>'
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{{font-family:'Golos Text';src:url({F}GolosText.ttf);font-weight:400 900}}
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:40px 48px;width:1060px}} h1{{font-size:30px;margin:0 0 20px}}
.row{{display:flex;gap:16px;margin:0 0 10px}} .c{{width:230px;height:230px;border-radius:22px;display:grid;place-items:center}} p{{font-size:15px;color:#55584F;margin:6px 0 0}}
.sign{{display:flex;align-items:center;gap:14px;background:#2E3338;border-radius:18px;padding:22px 34px;width:max-content;font:800 76px 'Golos Text';color:#F4F4F0;margin-top:14px}}
.sign span{{-webkit-text-stroke:3px #1F7A45;paint-order:stroke fill}}
</style><div class="wrap"><h1>1:1 по табелата, без житния клас</h1>{rows}{sign}</div>'''
open('one2one.html', 'w', encoding='utf-8').write(html)
