# Полусърце, полубицепс — само очертано (v4). python build-line.py → line.html
HEART = 'M128 222 C 92 192, 40 152, 40 106 C 40 72, 62 50, 90 50 C 109 50, 123 61, 128 78 '
ARMS = {
  'тънка ръка': 'C 134 64, 148 57, 161 59 C 178 62, 186 77, 183 95 L 189 81 L 189 48 Q 189 36 201 36 L 217 36 Q 229 36 229 48 L 229 66 Q 229 75 222 79 C 226 102, 224 124, 214 142 C 204 158, 188 166, 170 174 Z',
  'по-стройна': 'C 135 66, 148 60, 160 62 C 175 65, 182 78, 180 94 L 188 82 L 188 52 Q 188 42 198 42 L 212 42 Q 222 42 222 52 L 222 68 Q 222 76 216 80 C 220 102, 218 122, 208 138 C 198 152, 184 160, 168 168 Z',
}
n = 0
def mark(size, arm, heart_c, arm_c, sw):
    global n; n += 1
    d = HEART + ARMS[arm]
    s = f'fill="none" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"'
    return (f'<svg viewBox="0 0 256 256" width="{size}" height="{size}"><defs>'
            f'<clipPath id="l{n}"><rect x="-10" width="138" height="266"/></clipPath><clipPath id="r{n}"><rect x="128" width="138" height="266"/></clipPath></defs>'
            f'<path clip-path="url(#l{n})" stroke="{heart_c}" {s} d="{d}"/><path clip-path="url(#r{n})" stroke="{arm_c}" {s} d="{d}"/></svg>')
PAL = [('домат + мастило', '#EEEAE1', '#E5482F', '#12140F'),
       ('домат + зелено', '#EEEAE1', '#E5482F', '#173F2E'),
       ('лайм + овес', '#173F2E', '#D4F04A', '#EEEAE1'),
       ('домат + овес', '#12140F', '#FF6A4D', '#EEEAE1')]
rows = ''
for arm in ARMS:
    for sw in (14, 20):
        cells = ''.join(f'<div class="c" style="background:{bg}">{mark(150, arm, h, a, sw)}</div>' for _, bg, h, a in PAL)
        small = f'<div class="sz">{mark(64, arm, PAL[0][2], PAL[0][3], sw)}{mark(32, arm, PAL[0][2], PAL[0][3], sw + 4)}{mark(16, arm, PAL[0][2], PAL[0][3], sw + 10)}</div>'
        rows += f'<div class="row"><div class="lab"><b>{arm}</b><span>линия {sw}</span></div>{cells}{small}</div>'
F = 'file:///D:/blag-ai/fonts/'
lock = f'<div class="lk">{mark(100, "тънка ръка", "#E5482F", "#173F2E", 16)}<span>здраве и сила</span></div>'
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{{font-family:'Golos Text';src:url({F}GolosText.ttf);font-weight:400 900}}
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:48px 56px;width:1460px}} h1{{font-size:34px;margin:0 0 6px}} .lead{{font-size:18px;color:#55584F;margin:0 0 24px}}
.row{{display:flex;gap:16px;align-items:center;margin:0 0 16px}} .lab{{width:150px}} .lab b{{display:block;font-size:19px}} .lab span{{font-size:15px;color:#55584F}}
.c{{width:190px;height:190px;border-radius:22px;display:grid;place-items:center}} .sz{{display:flex;gap:14px;align-items:end;margin-left:16px}}
.lk{{display:flex;align-items:center;gap:20px;font:700 58px 'Golos Text';letter-spacing:-.02em;color:#173F2E;margin-top:28px}}
</style><div class="wrap"><h1>Полусърце, полубицепс · само очертано</h1>
<p class="lead">Ръката е по-тънка и само с контур. Два варианта на ръката × две дебелини на линията. На 32 и 16 px линията е по-дебела, иначе изчезва.</p>{rows}{lock}</div>'''
open('line.html', 'w', encoding='utf-8').write(html)
