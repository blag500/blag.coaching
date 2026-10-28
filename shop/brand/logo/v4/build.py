# Полусърце, полубицепс — лист за избор (v3). python build.py → sheet.html
P = ('M128 224 C 92 194, 36 152, 36 104 C 36 70, 60 46, 88 46 C 108 46, 123 58, 128 76 '
     'C 133 60, 148 48, 164 50 C 184 53, 194 72, 186 97 L 188 84 '
     'L 187 42 Q 187 26 203 26 L 224 26 Q 240 26 240 42 L 240 68 Q 240 80 232 86 '
     'C 236 112, 236 134, 226 154 C 216 170, 202 178, 186 184 Z')
open('arm-v3.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="#12140F" d="{P}"/></svg>')
n = 0
def mark(size, heart, arm):
    global n; n += 1
    return (f'<svg viewBox="0 0 256 256" width="{size}" height="{size}"><defs>'
            f'<clipPath id="l{n}"><rect width="128" height="256"/></clipPath><clipPath id="r{n}"><rect x="128" width="128" height="256"/></clipPath></defs>'
            f'<path clip-path="url(#l{n})" fill="{heart}" d="{P}"/><path clip-path="url(#r{n})" fill="{arm}" d="{P}"/></svg>')
PAL = [('едноцветен', '#EEEAE1', '#12140F', '#12140F', '#12140F'),
       ('домат + мастило', '#EEEAE1', '#E5482F', '#12140F', '#12140F'),
       ('домат + зелено', '#EEEAE1', '#E5482F', '#173F2E', '#173F2E'),
       ('зелено + лайм', '#173F2E', '#D4F04A', '#EEEAE1', '#EEEAE1'),
       ('върху мастило', '#12140F', '#FF6A4D', '#EEEAE1', '#EEEAE1')]
F = 'file:///D:/blag-ai/fonts/'
cells = ''.join(f'<div><div class="c" style="background:{bg}">{mark(150, h, a)}</div><p>{name}</p></div>' for name, bg, h, a, _ in PAL)
sizes = ''.join(f'<div class="sz">{mark(64,h,a)}{mark(32,h,a)}{mark(16,h,a)}</div>' for name, bg, h, a, _ in PAL[1:3])
def lock(font, weight, text, heart, arm, ink, extra=''):
    return f'<div class="lk" style="color:{ink}">{mark(96, heart, arm)}<span style="font-family:\'{font}\';font-weight:{weight};{extra}">{text}</span></div>'
locks = (lock('Unbounded', 600, 'здраве и сила', '#E5482F', '#12140F', '#12140F', "letter-spacing:-.03em;font-feature-settings:'locl' 0")
         + lock('Golos Text', 700, 'здраве и сила', '#E5482F', '#173F2E', '#173F2E', 'letter-spacing:-.02em')
         + lock('Oswald', 700, 'ЗДРАВЕ И СИЛА', '#E5482F', '#12140F', '#12140F', 'letter-spacing:.01em'))
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{{font-family:Unbounded;src:url({F}Unbounded.ttf);font-weight:200 900}}
@font-face{{font-family:'Golos Text';src:url({F}GolosText.ttf);font-weight:400 900}}
@font-face{{font-family:Oswald;src:url({F}Oswald.ttf);font-weight:200 700}}
body{{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}}
.wrap{{padding:48px 56px;width:1300px}} h1{{font-size:34px;margin:0 0 6px}} .lead{{font-size:18px;color:#55584F;margin:0 0 28px}}
h2{{font-size:20px;margin:34px 0 14px}} .row{{display:flex;gap:18px}} .c{{width:210px;height:210px;border-radius:24px;display:grid;place-items:center}}
.row p{{font-size:15px;color:#55584F;margin:8px 0 0}} .sz{{display:flex;gap:16px;align-items:end;margin-right:40px}}
.lk{{display:flex;align-items:center;gap:20px;font-size:58px;margin:10px 0 18px}}
</style><div class="wrap"><h1>Полусърце, полубицепс · нова проба</h1>
<p class="lead">Ръката е в позата, която всеки познава: юмрукът горе, бицепсът изпъкнал. Лявата половина е сърце, дясната — свита ръка; двата цвята казват „здраве“ и „сила“.</p>
<div class="row">{cells}</div><h2>64 · 32 · 16 px</h2><div class="row">{sizes}</div><h2>С името — три шрифта</h2>{locks}</div>'''
open('sheet.html', 'w', encoding='utf-8').write(html)
