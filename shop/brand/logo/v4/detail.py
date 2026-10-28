# Свита ръка с юмрук, пръсти и палец; бицепсът е сърце. python detail.py → detail.html
HEART = 'M118 130 C 64 100, 44 46, 86 37 C 103 34, 114 44, 118 56 C 122 44, 133 34, 150 37 C 192 46, 172 100, 118 130 Z'
# Контурът на ръката: рамо → горна страна на мишницата → сгъвката → вътрешна страна на предмишницата →
# пръстите (четири издутини) → горе → палецът отдясно → външна страна → лакът → долна страна → рамо.
OUTLINE = ('M40 150 L 160 150 C 168 150, 172 140, 172 128 L 174 112 '
           'C 162 110, 158 100, 166 94 A 9 9 0 0 1 166 76 A 9 9 0 0 1 166 58 A 9 9 0 0 1 168 40 '
           'C 172 30, 182 26, 196 26 L 208 26 C 224 26, 232 38, 230 56 C 228 72, 222 86, 216 104 '
           'C 228 132, 232 162, 228 186 C 224 206, 208 216, 186 216 L 40 216 C 24 216, 18 196, 18 183 C 18 168, 24 150, 40 150 Z')
DETAILS = [
  'M166 76 L 190 76', 'M166 58 L 192 58', 'M168 40 L 188 40', 'M166 94 L 186 94',   # пръстите
  'M224 62 C 206 58, 190 62, 186 72 C 184 80, 192 84, 202 82',                    # палецът
  'M176 112 C 190 116, 204 116, 216 106',                                          # китката
  'M172 128 C 176 140, 184 148, 196 152',                                          # сгъвката на лакътя
]
def mark(size, arm, heart, bg, style, sw=9):
    o = f'<svg viewBox="0 0 256 256" width="{size}" height="{size}"><g stroke-linejoin="round" stroke-linecap="round">'
    if style == 'плътна':
        o += f'<path fill="{arm}" d="{OUTLINE}"/>'
        o += ''.join(f'<path fill="none" stroke="{bg}" stroke-width="{sw * 0.8}" d="{d}"/>' for d in DETAILS)
    else:
        o += f'<path fill="{bg}" stroke="{arm}" stroke-width="{sw}" d="{OUTLINE}"/>'
        o += ''.join(f'<path fill="none" stroke="{arm}" stroke-width="{sw * 0.8}" d="{d}"/>' for d in DETAILS)
    o += f'<path transform="translate(-6 30) scale(0.98)" fill="{heart}" stroke="{bg}" stroke-width="{sw * 0.9}" d="{HEART}"/>'
    return o + '</g></svg>'
PAL = [('#EEEAE1', '#12140F', '#E5482F'), ('#EEEAE1', '#173F2E', '#E5482F'), ('#173F2E', '#EEEAE1', '#D4F04A'), ('#12140F', '#EEEAE1', '#FF6A4D')]
rows = ''
for style in ('контур', 'плътна'):
    cells = ''.join(f'<div class="c" style="background:{bg}">{mark(190, a, h, bg, style)}</div>' for bg, a, h in PAL)
    sm = ''.join(mark(s, PAL[1][1], PAL[1][2], PAL[1][0], style, 9 if s > 40 else 14) for s in (96, 48, 32))
    rows += f'<div class="row"><div class="lab"><b>{style}</b></div>{cells}<div class="sz" style="background:#EEEAE1">{sm}</div></div>'
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:40px 48px;width:1460px}} h1{{font-size:32px;margin:0 0 20px}}
.row{{display:flex;gap:16px;align-items:center;margin:0 0 16px}} .lab{{width:90px;font-size:19px}}
.c{{width:220px;height:220px;border-radius:22px;display:grid;place-items:center}} .sz{{display:flex;gap:14px;align-items:end;padding:14px;border-radius:16px}}
</style><div class="wrap"><h1>Юмрук, пръсти, палец, китка, лакът — бицепсът е сърце</h1>{rows}</div>'''
open('detail.html', 'w', encoding='utf-8').write(html)
