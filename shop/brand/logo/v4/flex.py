# Цяла свита ръка с юмрук; на мястото на бицепса — сърце. python flex.py → flex.html
HEART = 'M118 130 C 64 100, 44 46, 86 37 C 103 34, 114 44, 118 56 C 122 44, 133 34, 150 37 C 192 46, 172 100, 118 130'
FILLED_HEART = 'M118 130 C 64 100, 44 46, 86 37 C 103 34, 114 44, 118 56 C 122 44, 133 34, 150 37 C 192 46, 172 100, 118 130 Z'
POSES = {
  # ръка: (път на ръката като дебела линия, юмрук x y w h, сърце translate/scale)
  'отвесна': ('M40 182 L 176 182 Q 206 182 206 152 L 206 96', (180, 40, 54, 60), 'translate(30 70) scale(0.7)'),
  'наклонена': ('M40 184 L 172 184 Q 204 184 200 152 L 192 100', (164, 44, 54, 60), 'translate(26 72) scale(0.7)'),
}
n = 0
def mark(size, pose, arm_c, heart_c, bg, style):
    global n; n += 1
    d, (fx, fy, fw, fh), htf = POSES[pose]
    o = f'<svg viewBox="0 0 256 256" width="{size}" height="{size}"><g fill="none" stroke-linejoin="round">'
    W = 40
    if style == 'плътна':
        o += f'<path stroke="{arm_c}" stroke-width="{W}" stroke-linecap="butt" d="{d}"/>'
        o += f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="18" fill="{arm_c}"/>'
    else:  # контур: дебела линия в цвета на ръката, отгоре по-тънка в цвета на фона
        o += f'<path stroke="{arm_c}" stroke-width="{W}" stroke-linecap="butt" d="{d}"/>'
        o += f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="18" fill="{arm_c}"/>'
        o += f'<path stroke="{bg}" stroke-width="{W - 24}" stroke-linecap="butt" d="{d}"/>'
        o += f'<rect x="{fx + 12}" y="{fy + 12}" width="{fw - 24}" height="{fh - 24}" rx="8" fill="{bg}"/>'
        o += f'<path stroke="{bg}" stroke-width="{W - 24}" d="M{fx + fw/2} {fy + fh - 14} L {fx + fw/2} {fy + fh + 6}"/>'
    o += f'<path transform="{htf}" fill="{heart_c}" d="{FILLED_HEART}"/>'
    return o + '</g></svg>'
PAL = [('мастило + домат', '#EEEAE1', '#12140F', '#E5482F'),
       ('зелено + домат', '#EEEAE1', '#173F2E', '#E5482F'),
       ('овес + лайм', '#173F2E', '#EEEAE1', '#D4F04A'),
       ('овес + домат', '#12140F', '#EEEAE1', '#FF6A4D')]
rows = ''
for pose in POSES:
    for style in ('плътна', 'контур'):
        cells = ''.join(f'<div class="c" style="background:{bg}">{mark(170, pose, a, h, bg, style)}</div>' for _, bg, a, h in PAL)
        sm = ''.join(mark(s, pose, PAL[1][2], PAL[1][3], PAL[1][1], style) for s in (64, 32, 16))
        rows += f'<div class="row"><div class="lab"><b>{pose}</b><span>{style} ръка</span></div>{cells}<div class="sz">{sm}</div></div>'
F = 'file:///D:/blag-ai/fonts/'
lock = f'<div class="lk">{mark(110, "отвесна", "#173F2E", "#E5482F", "#fff", "плътна")}<span>здраве и сила</span></div>'
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{{font-family:'Golos Text';src:url({F}GolosText.ttf);font-weight:400 900}}
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:48px 56px;width:1400px}} h1{{font-size:34px;margin:0 0 6px}} .lead{{font-size:18px;color:#55584F;margin:0 0 24px}}
.row{{display:flex;gap:16px;align-items:center;margin:0 0 16px}} .lab{{width:150px}} .lab b{{display:block;font-size:19px}} .lab span{{font-size:15px;color:#55584F}}
.c{{width:200px;height:200px;border-radius:22px;display:grid;place-items:center}} .sz{{display:flex;gap:14px;align-items:end;margin-left:16px}}
.lk{{display:flex;align-items:center;gap:20px;font:700 58px 'Golos Text';letter-spacing:-.02em;color:#173F2E;margin-top:24px}}
</style><div class="wrap"><h1>Свита ръка, на мястото на бицепса — сърце</h1>
<p class="lead">Ръката е цяла и се познава веднага; мускулът е сърцето. Две пози × плътна или само контур.</p>{rows}{lock}</div>'''
open('flex.html', 'w', encoding='utf-8').write(html)
