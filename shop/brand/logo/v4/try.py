import sys
HEART = 'M128 224 C 92 194, 36 152, 36 104 C 36 70, 60 46, 88 46 C 108 46, 123 58, 128 76 '
V = {
 'a': 'C 132 58, 146 46, 164 46 C 184 46, 198 60, 198 80 Q 199 86 204 82 L 196 56 C 192 40, 198 24, 214 22 C 232 20, 244 36, 238 54 C 236 64, 236 72, 238 82 C 242 108, 238 130, 226 150 C 214 168, 196 178, 172 186 Z',
 'b': 'C 132 56, 148 42, 168 44 C 188 46, 200 62, 198 84 Q 202 88 206 84 L 202 58 C 200 42, 208 28, 222 28 C 238 28, 246 44, 240 58 C 238 66, 238 74, 240 86 C 244 112, 238 134, 224 152 C 212 168, 194 178, 170 186 Z',
}
out = ''
for k, d in V.items():
    p = HEART + d
    out += (f'<svg viewBox="0 0 256 256" width="256" height="256"><defs><clipPath id="l{k}"><rect width="128" height="256"/></clipPath><clipPath id="r{k}"><rect x="128" width="128" height="256"/></clipPath></defs>'
            f'<path clip-path="url(#l{k})" fill="#E5482F" d="{p}"/><path clip-path="url(#r{k})" fill="#173F2E" d="{p}"/></svg>'
            f'<svg viewBox="0 0 256 256" width="256" height="256"><path fill="none" stroke="#173F2E" stroke-width="16" stroke-linejoin="round" d="{p}"/></svg>')
open('try.html', 'w', encoding='utf-8').write(f'<!doctype html><body style="margin:0;background:#EEEAE1"><div class="wrap" style="display:flex;gap:20px;padding:20px;width:max-content">{out}</div>')
