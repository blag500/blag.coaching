# Цяла свита ръка (органичен силует), сърцето е бицепсът. python flex2.py → flex2.html
HEART = 'M118 130 C 64 100, 44 46, 86 37 C 103 34, 114 44, 118 56 C 122 44, 133 34, 150 37 C 192 46, 172 100, 118 130 Z'
ARMS = {
 'A': ('M28 160 Q 28 150 38 150 L 166 152 C 172 136, 174 118, 172 100 C 160 92, 156 70, 166 52 C 178 30, 214 24, 232 44 C 246 60, 242 84, 228 98 C 236 128, 240 160, 232 188 C 226 210, 206 222, 182 222 L 38 222 Q 28 222 28 212 Z',
       'translate(-4 40) scale(0.9)'),
 'B': ('M24 156 C 24 150, 30 148, 38 148 L 164 150 C 170 134, 170 116, 166 100 C 150 92, 148 64, 162 46 C 178 24, 216 22, 234 44 C 248 62, 244 88, 228 102 C 238 132, 242 164, 232 192 C 224 214, 204 226, 178 226 C 140 226, 80 222, 38 220 C 30 220, 24 214, 24 206 Z',
       'translate(-6 38) scale(0.92)'),
}
n = 0
def mark(size, k, arm_c, heart_c, style, sw=16):
    d, htf = ARMS[k]
    a = f'<path fill="{arm_c}" d="{d}"/>' if style == 'плътна' else f'<path fill="none" stroke="{arm_c}" stroke-width="{sw}" stroke-linejoin="round" d="{d}"/>'
    return f'<svg viewBox="0 0 256 256" width="{size}" height="{size}">{a}<path transform="{htf}" fill="{heart_c}" d="{HEART}"/></svg>'
PAL = [('#EEEAE1', '#12140F', '#E5482F'), ('#EEEAE1', '#173F2E', '#E5482F'), ('#173F2E', '#EEEAE1', '#D4F04A'), ('#12140F', '#EEEAE1', '#FF6A4D')]
rows = ''
for k in ARMS:
    for style in ('плътна', 'контур'):
        cells = ''.join(f'<div class="c" style="background:{bg}">{mark(170, k, a, h, style)}</div>' for bg, a, h in PAL)
        sm = ''.join(mark(s, k, PAL[1][1], PAL[1][2], style, 16 if s > 40 else 24) for s in (64, 32, 16))
        rows += f'<div class="row"><div class="lab"><b>ръка {k}</b><span>{style}</span></div>{cells}<div class="sz">{sm}</div></div>'
F = 'file:///D:/blag-ai/fonts/'
lock = f'<div class="lk">{mark(110, "A", "#173F2E", "#E5482F", "плътна")}<span>здраве и сила</span></div>'
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{{font-family:'Golos Text';src:url({F}GolosText.ttf);font-weight:400 900}}
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:48px 56px;width:1400px}} h1{{font-size:34px;margin:0 0 6px}} .lead{{font-size:18px;color:#55584F;margin:0 0 24px}}
.row{{display:flex;gap:16px;align-items:center;margin:0 0 16px}} .lab{{width:150px}} .lab b{{display:block;font-size:19px}} .lab span{{font-size:15px;color:#55584F}}
.c{{width:200px;height:200px;border-radius:22px;display:grid;place-items:center}} .sz{{display:flex;gap:14px;align-items:end;margin-left:16px}}
.lk{{display:flex;align-items:center;gap:20px;font:700 58px 'Golos Text';letter-spacing:-.02em;color:#173F2E;margin-top:24px}}
</style><div class="wrap"><h1>Свита ръка, на мястото на бицепса — сърце</h1>
<p class="lead">Цял силует: рамо, лакът, предмишница, юмрук. Мускулът е сърцето.</p>{rows}{lock}</div>'''
open('flex2.html', 'w', encoding='utf-8').write(html)
