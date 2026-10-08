/* ───────────────────────────────────────────────────────────────
   CHEAT CODE — продуктов клип, 15 s, 1920×1080

   По референцията с терминала: глави с моно етикет, текст, който се
   изписва, графика от точки, голямо число в точкова матрица, живият
   продукт, финал със знака.

   Всяко число в клипа е сметнато тук от данните на Телешкия боул в
   cheatcode/page.html (грамове, per100, cost100, опаковка, +€3.35 и
   закръгляне нагоре до 10 цента). Нищо не е написано на ръка — ако
   page.html смени цена или етикет, тази таблица се сверява с него.
   ─────────────────────────────────────────────────────────────── */
import { W, H, C, seg, lerp, clamp, E, hash, wave, roundRect, hexA, cut } from './core.js';

/* ── Данните, от page.html ───────────────────────────────── */
const KAYMA = { kcal: 156, p: 22.51, c: 0.5, f: 6.96, cost: 79.9 };
const ORIZ  = { kcal: 339, p: 8.5,   c: 75,  f: 0,    cost: 19.4 };
const PYURE = { kcal: 20,  p: 1,     c: 3.9, f: 0,    cost: 20 };
const SPICES = 25, PACK = 15, ADDON = 335;          // евроцентове на кутия

function box(k, o, y) {
  const s = { kcal: 0, p: 0, c: 0, f: 0, cost: SPICES + PACK };
  for (const [it, g] of [[KAYMA, k], [ORIZ, o], [PYURE, y]]) {
    s.kcal += it.kcal * g / 100; s.p += it.p * g / 100;
    s.c += it.c * g / 100; s.f += it.f * g / 100; s.cost += it.cost * g / 100;
  }
  s.price = Math.ceil((s.cost + ADDON) / 10) * 10;
  return s;
}
const eur = c => (c / 100).toFixed(2).replace('.', ',') + ' €';

/* Всички кутии, които плъзгачите позволяват: 5 × 5 × 5. */
const CONFIGS = [];
for (let k = 150; k <= 350; k += 50)
  for (let o = 50; o <= 150; o += 25)
    for (let y = 75; y <= 175; y += 25) CONFIGS.push({ k, o, y, ...box(k, o, y) });
CONFIGS.sort((a, b) => a.kcal - b.kcal);
const MID = CONFIGS.findIndex(c => c.k === 250 && c.o === 100 && c.y === 125);
const MIDBOX = CONFIGS[MID];

/* ── Шрифтове и помощници ─────────────────────────────────── */
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Onest', system-ui, sans-serif";
const KCAL = '#D4AC66', PROT = '#5FB2F0';

function t_(ctx, str, x, y, { size = 40, weight = 500, font = MONO, color = C.ink,
  align = 'left', alpha = 1, base = 'alphabetic', track = 0, glow = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  ctx.letterSpacing = `${track}px`;
  ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; ctx.fillText(str, x, y); }
  ctx.shadowBlur = 0;
  ctx.fillText(str, x, y);
  ctx.restore();
}
function w_(ctx, str, size, weight = 500, font = MONO) {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = '0px';
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}
const typed = (str, p) => [...str].slice(0, Math.round([...str].length * clamp(p))).join('');

/* Курсорът: плътна черта под реда, със светене. Мига, когато чака. */
function cursor(ctx, x, y, size, t, typing) {
  const on = typing || Math.floor(t * 2.4) % 2 === 0;
  if (!on) return;
  const w = size * 0.6, h = size * 0.13;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x + w / 2, y, 0, x + w / 2, y, size * 1.3);
  g.addColorStop(0, hexA(C.accent, 0.35)); g.addColorStop(1, hexA(C.accent, 0));
  ctx.fillStyle = g; ctx.fillRect(x - size * 1.3, y - size * 1.3, w + size * 2.6, size * 2.6);
  ctx.restore();
  ctx.fillStyle = '#CFF5E2';
  roundRect(ctx, x, y - h / 2, w, h, h / 2); ctx.fill();
}

function chevron(ctx, x, y, size, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = C.ink; ctx.lineWidth = size * 0.11;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = size * 0.3;
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.95, y); ctx.lineTo(x, y + s); ctx.stroke();
  ctx.restore();
}

/* Мрежата отзад и ъглите на кадъра — рамката, която държи главите заедно. */
function backdrop(ctx, t, a = 1) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.055 * a;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
  const step = 64, off = (t * 6) % step;
  ctx.beginPath();
  for (let x = -step + off; x < W + step; x += step) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
  for (let y = 24; y < H; y += step) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
  ctx.stroke();
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = C.soft; ctx.lineWidth = 2;
  const m = 34, l = 22;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * l); ctx.lineTo(x, y); ctx.lineTo(x + dx * l, y); ctx.stroke();
  }
  ctx.restore();
}

function label(ctx, n, name, p) {
  if (p <= 0) return;
  const a = E.outCubic(p);
  t_(ctx, n, 72, 84, { size: 17, color: C.faint, alpha: a, track: 2 });
  ctx.save(); ctx.globalAlpha = a * 0.6; ctx.fillStyle = C.faint;
  ctx.fillRect(108, 78, 34 * a, 1.5); ctx.restore();
  t_(ctx, typed(name, p * 1.4), 154, 84, { size: 17, color: C.faint, track: 3 });
}

/* ── 00 · курсорът ────────────────────────────────────────── */
/* ── 01 · менюто ──────────────────────────────────────────── */
const L1 = 'Менюто казва какво има в кутията,';
const L2 = 'но не и колко.';

function sceneMenu(ctx, t) {
  backdrop(ctx, t, seg(t, 0.9, 1.6));
  label(ctx, '01', 'МЕНЮТО', seg(t, 1.35, 1.9));
  /* Стрелката се ражда в средата и сяда в началото на реда. */
  const fly = E.inOutCubic(seg(t, 0.95, 1.45));
  const size = lerp(110, 60, fly);
  const cx = lerp(W / 2 - 50, 196, fly), cy = lerp(H / 2, 470, fly);
  chevron(ctx, cx, cy - size * 0.02, size, E.outCubic(seg(t, 0.3, 0.6)));
  const p1 = seg(t, 1.55, 2.65), p2 = seg(t, 2.85, 3.35);
  const x0 = 250, size1 = 60;
  const s1 = typed(L1, p1), s2 = typed(L2, p2);
  t_(ctx, s1, x0, 490, { size: size1, color: C.ink });
  t_(ctx, s2, x0, 584, { size: size1, color: C.ink });
  /* Курсорът е там, където е пишещото място. */
  let kx, ky, typing;
  if (t < 1.5) { kx = cx + size * 0.55; ky = cy + size * 0.32; typing = false; }
  else if (p2 <= 0) { kx = x0 + w_(ctx, s1, size1) + 6; ky = 500; typing = p1 > 0 && p1 < 1; }
  else { kx = x0 + w_(ctx, s2, size1) + 6; ky = 594; typing = p2 < 1; }
  cursor(ctx, kx, ky, t < 1.5 ? size : size1, t, typing);
}

/* ── 02 · грамовете ───────────────────────────────────────── */
function sceneGrams(ctx, t) {
  backdrop(ctx, t);
  label(ctx, '02', 'ГРАМОВЕТЕ', seg(t, 4.0, 4.5));
  const head = '> Телешки боул';
  const ph = seg(t, 4.05, 4.5);
  t_(ctx, typed(head, ph), 72, 168, { size: 38, color: C.ink, weight: 500 });
  if (ph < 1 || Math.floor(t * 2.4) % 2 === 0)
    cursor(ctx, 72 + w_(ctx, typed(head, ph), 38) + 6, 175, 38, t, ph < 1);
  t_(ctx, 'кайма 150–350 г  ·  ориз 50–150 г  ·  доматено пюре 75–175 мл',
    72, 212, { size: 20, color: C.soft, alpha: E.outCubic(seg(t, 4.4, 4.8)) });

  /* Броячът горе вдясно върви заедно с колоните. */
  const grow = seg(t, 4.3, 5.4);
  const n = Math.round(CONFIGS.length * E.outCubic(grow));
  t_(ctx, String(n), W - 72, 176, { size: 76, weight: 700, color: C.accent, align: 'right',
    alpha: seg(t, 4.3, 4.5), glow: 24 });
  t_(ctx, 'кутии от три плъзгача', W - 72, 212, { size: 20, color: C.soft, align: 'right',
    alpha: seg(t, 4.4, 4.7) });

  const x0 = 150, x1 = W - 150, base = 905, top = 330;
  const kmax = 1100, step = (x1 - x0) / CONFIGS.length, dy = 8;
  const yOf = k => base - (k / kmax) * (base - top);

  /* Линиите на калориите. */
  for (const k of [400, 600, 800, 1000]) {
    const y = yOf(k);
    ctx.save(); ctx.globalAlpha = 0.18 * seg(t, 4.2, 4.6);
    ctx.strokeStyle = C.soft; ctx.setLineDash([2, 8]);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore();
    t_(ctx, String(k), x0 - 16, y + 6, { size: 16, color: C.faint, align: 'right', alpha: seg(t, 4.2, 4.6) });
  }
  t_(ctx, 'ккал', x0 - 16, top - 20, { size: 16, color: C.faint, align: 'right', alpha: seg(t, 4.2, 4.6) });

  /* Скенерът тръгва отляво и спира на средната кутия. */
  const scanP = E.inOutCubic(seg(t, 5.35, 6.45));
  const target = x0 + (MID + 0.5) * step;
  const sx = lerp(x0 - 20, target, scanP);
  const landed = seg(t, 6.45, 6.7);

  ctx.save();
  for (let i = 0; i < CONFIGS.length; i++) {
    const c = CONFIGS[i];
    const local = E.outCubic(seg(t, 4.3 + i / CONFIGS.length * 0.9, 4.3 + i / CONFIGS.length * 0.9 + 0.45));
    if (local <= 0) continue;
    const x = x0 + (i + 0.5) * step;
    const dots = Math.round((base - yOf(c.kcal)) / dy * local);
    const isMid = i === MID;
    const passed = scanP > 0 && x < sx;
    for (let d = 0; d < dots; d++) {
      const y = base - d * dy;
      const tw = wave(t * 2.2 + d * 0.37, i * 31 + d) * 0.5 + hash(i * 977 + d, 3) * 0.5;
      let a = 0.16 + 0.42 * tw;
      if (passed) a += 0.18;
      if (d === dots - 1) a += 0.3;
      let col = C.ink, r = 2;
      if (isMid && landed > 0) { col = '#9FF0C6'; a = lerp(a, 1, landed); r = lerp(2, 3, landed); }
      else a *= 1 - 0.45 * landed;          // останалите отстъпват, за да светне избраната
      ctx.globalAlpha = clamp(a);
      ctx.fillStyle = col;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.restore();

  /* Лъчът на скенера: широко прозрачно отдолу, тясно плътно отгоре. */
  if (scanP > 0) {
    const a = 1 - 0.55 * landed;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
    gr.addColorStop(0, hexA(C.accent, 0)); gr.addColorStop(0.5, hexA(C.accent, 0.28 * a)); gr.addColorStop(1, hexA(C.accent, 0));
    ctx.fillStyle = gr; ctx.fillRect(sx - 40, top - 70, 80, base - top + 110);
    ctx.fillStyle = hexA('#CFF5E2', 0.85 * a); ctx.fillRect(sx - 2, top - 70, 4, base - top + 90);
    ctx.fillStyle = hexA(C.accent, 0.9 * a);
    roundRect(ctx, sx - 18, base + 22, 36, 12, 4); ctx.fill();
    ctx.restore();
  }

  /* На спирката: какво има в тази кутия. */
  if (landed > 0) {
    const y = yOf(MIDBOX.kcal) - 40, a = E.outCubic(landed);
    const lx = target + 26;
    /* Табелката стои върху колоните вдясно — плътна земя под текста. */
    ctx.save(); ctx.globalAlpha = 0.92 * a; ctx.fillStyle = C.bg;
    roundRect(ctx, lx - 12, y - 74, 440, 92, 8); ctx.fill();
    ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    t_(ctx, `${Math.round(MIDBOX.kcal)} ккал`, lx, y - 34, { size: 30, weight: 700, color: C.accent, alpha: a, glow: 18 });
    t_(ctx, 'средна кутия · 250 г кайма · 100 г ориз', lx, y, { size: 18, color: C.soft, alpha: a });
  }
}

/* ── 03 · числото ─────────────────────────────────────────── */
/* Точковата матрица се изважда веднъж от истински шрифт: числото се пише в
   невидим canvas и се взима проба на всеки STEP пиксела. */
const STEP = 12;
let matrix = null;
function buildMatrix() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.textAlign = 'right';
  g.font = `700 470px ${MONO}`;
  const str = String(Math.round(MIDBOX.kcal));
  const right = 1270;
  g.fillText(str, right, 650);
  const width = g.measureText(str).width;
  const data = g.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
    if (data[(y * W + x) * 4] > 128) pts.push([x, y]);
  }
  return { pts, left: right - width, right };
}

function sceneNumber(ctx, t) {
  backdrop(ctx, t);
  label(ctx, '03', 'ЧИСЛОТО', seg(t, 7.0, 7.5));
  matrix ??= buildMatrix();
  const zoom = lerp(1, 1.035, seg(t, 7.0, 9.6));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);

  /* Отломки от пикселите преди числото да се събере. */
  for (let i = 0; i < 160; i++) {
    const born = 7.0 + hash(i, 41) * 0.5, life = 0.7;
    const p = seg(t, born, born + life);
    if (p <= 0 || p >= 1) continue;
    const x = 360 + hash(i, 42) * 1200, y = 300 + hash(i, 43) * 420 - p * 30;
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.35;
    ctx.fillStyle = C.accent;
    ctx.fillRect(x, y, 4, 4);
  }

  const pts = matrix.pts;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const born = 7.1 + hash(i, 7) * 0.55 + (x - 400) / 1000 * 0.25;
    const p = seg(t, born, born + 0.22);
    if (p <= 0) continue;
    /* Първите кадри на точката примигват — като пиксел, който се пали. */
    const flick = p < 1 ? (hash(i * 13 + Math.floor(t * 30), 9) > 0.35 ? 1 : 0.25) : 1;
    const shimmer = 0.78 + 0.22 * wave(t * 1.6 + hash(i, 5) * 9, i);
    const a = p * flick * shimmer;
    ctx.globalAlpha = a * 0.22;
    ctx.fillStyle = C.accent;
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#BDF2D8';
    roundRect(ctx, x - 4, y - 4, 8, 8, 1.5); ctx.fill();
  }
  ctx.globalAlpha = 1;
  /* Мекото сияние под матрицата. */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bl = ctx.createRadialGradient(W / 2 - 60, 470, 0, W / 2 - 60, 470, 620);
  bl.addColorStop(0, hexA(C.accent, 0.13 * seg(t, 7.3, 7.9))); bl.addColorStop(1, hexA(C.accent, 0));
  ctx.fillStyle = bl; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  t_(ctx, 'ккал', matrix.right + 34, 640, { size: 92, weight: 600, font: SANS, color: C.accent,
    alpha: E.outCubic(seg(t, 7.65, 8.0)), glow: 26 });
  ctx.restore();

  const a1 = E.outCubic(seg(t, 7.9, 8.3)), a2 = E.outCubic(seg(t, 8.1, 8.5));
  t_(ctx, 'Телешки боул, средна кутия', W / 2, 770, { size: 36, weight: 500, font: SANS, color: C.ink, align: 'center', alpha: a1 });
  const m = MIDBOX;
  t_(ctx, `${Math.round(m.p)} г протеин  ·  ${Math.round(m.c)} г въглехидрати  ·  ${Math.round(m.f)} г мазнини  ·  ${eur(m.price)}`,
    W / 2, 822, { size: 21, color: C.soft, align: 'center', alpha: a2 });
}

/* ── 04 · на живо ─────────────────────────────────────────── */
/* Плъзгачите се местят по стъпките си; числата следват щракането,
   а цената скача с по десет цента, както на страницата. */
const MOVES = [
  { id: 'k', from: 250, to: 300, a: 10.45, b: 10.85 },
  { id: 'k', from: 300, to: 350, a: 11.1,  b: 11.5 },
  { id: 'o', from: 100, to: 75,  a: 11.8,  b: 12.15 },
];
function sliderVal(id, start, t, snap) {
  let v = start;
  for (const m of MOVES) {
    if (m.id !== id || t < m.a) continue;
    const p = seg(t, m.a, m.b);
    v = snap ? (p >= 0.5 ? m.to : m.from) : lerp(m.from, m.to, E.inOutCubic(p));
  }
  return v;
}
function flash(t, ids) {
  let f = 0;
  for (const m of MOVES) {
    if (ids && !ids.includes(m.id)) continue;
    const at = (m.a + m.b) / 2;
    if (t >= at) f = Math.max(f, 1 - seg(t, at, at + 0.6));
  }
  return f;
}

function sceneLive(ctx, t) {
  backdrop(ctx, t);
  label(ctx, '04', 'НА ЖИВО', seg(t, 9.6, 10.1));
  const enter = E.outQuint(seg(t, 9.65, 10.2));
  const px = 440, py = 168, pw = W - 880, ph = 760;
  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(W / 2, H / 2); ctx.scale(lerp(0.965, 1, enter), lerp(0.965, 1, enter)); ctx.translate(-W / 2, -H / 2 + (1 - enter) * 24);

  /* Прозорецът. */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
  ctx.fillStyle = C.surface; roundRect(ctx, px, py, pw, ph, 22); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = hexA(C.ink, 0.09); ctx.lineWidth = 1.5;
  roundRect(ctx, px, py, pw, ph, 22); ctx.stroke();
  ctx.fillStyle = hexA(C.ink, 0.07); ctx.fillRect(px, py + 60, pw, 1);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = hexA(C.ink, 0.18); ctx.beginPath(); ctx.arc(px + 30 + i * 22, py + 30, 6, 0, 7); ctx.fill(); }
  t_(ctx, 'blag-coaching.com/cheatcode', px + 116, py + 37, { size: 18, color: C.soft });
  const chipW = 176;
  ctx.fillStyle = hexA(C.accent, 0.12); roundRect(ctx, px + pw - chipW - 22, py + 15, chipW, 30, 15); ctx.fill();
  ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(px + pw - chipW - 4, py + 30, 4.5, 0, 7); ctx.fill();
  t_(ctx, 'конфигуратор', px + pw - chipW + 10, py + 36, { size: 16, color: C.accent });

  const ix = px + 64, iw = pw - 128;
  t_(ctx, 'Телешки боул', ix, py + 140, { size: 46, weight: 700, font: SANS });
  t_(ctx, 'Телешка кайма, ориз, доматен сос', ix, py + 182, { size: 22, font: SANS, color: C.soft });

  const rows = [
    { id: 'k', name: 'Кайма', unit: 'сурова', start: 250, min: 150, max: 350, step: 50, u: 'г' },
    { id: 'o', name: 'Ориз', unit: 'сух', start: 100, min: 50, max: 150, step: 25, u: 'г' },
    { id: 'y', name: 'Доматено пюре', unit: '', start: 125, min: 75, max: 175, step: 25, u: 'мл' },
  ];
  rows.forEach((r, i) => {
    const y = py + 262 + i * 104;
    const v = sliderVal(r.id, r.start, t, false), vs = sliderVal(r.id, r.start, t, true);
    const fl = flash(t, [r.id]);
    t_(ctx, r.name, ix, y, { size: 26, weight: 600, font: SANS });
    if (r.unit) t_(ctx, r.unit, ix + w_(ctx, r.name, 26, 600, SANS) + 12, y, { size: 20, font: SANS, color: C.faint });
    t_(ctx, `${vs} ${r.u}`, ix + iw, y, { size: 26, weight: 500, color: fl > 0 ? C.accent : C.ink, align: 'right', glow: fl * 16 });
    const ty = y + 36, tx0 = ix, tx1 = ix + iw;
    const f = (v - r.min) / (r.max - r.min);
    ctx.fillStyle = hexA(C.ink, 0.1); roundRect(ctx, tx0, ty - 3, tx1 - tx0, 6, 3); ctx.fill();
    for (let s = r.min; s <= r.max; s += r.step) {
      const sx = lerp(tx0, tx1, (s - r.min) / (r.max - r.min));
      ctx.fillStyle = hexA(C.ink, 0.22); ctx.fillRect(sx - 1, ty + 10, 2, 7);
    }
    ctx.fillStyle = C.accent; roundRect(ctx, tx0, ty - 3, (tx1 - tx0) * f, 6, 3); ctx.fill();
    const kx = lerp(tx0, tx1, f);
    const moving = MOVES.some(m => m.id === r.id && t > m.a - 0.15 && t < m.b + 0.1);
    if (moving) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(kx, ty, 0, kx, ty, 46);
      g.addColorStop(0, hexA(C.accent, 0.45)); g.addColorStop(1, hexA(C.accent, 0));
      ctx.fillStyle = g; ctx.fillRect(kx - 46, ty - 46, 92, 92); ctx.restore();
    }
    ctx.fillStyle = '#F4FBF6'; ctx.beginPath(); ctx.arc(kx, ty, moving ? 15 : 13, 0, 7); ctx.fill();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.stroke();
  });

  /* Сметката отдолу. */
  const k = sliderVal('k', 250, t, true), o = sliderVal('o', 100, t, true);
  const b = box(k, o, 125);
  const fl = flash(t);
  const by = py + ph - 74;
  ctx.fillStyle = hexA(C.ink, 0.08); ctx.fillRect(ix, by - 76, iw, 1);
  t_(ctx, String(Math.round(b.kcal)), ix, by, { size: 52, weight: 700, color: KCAL, glow: fl * 18 });
  t_(ctx, 'ккал', ix + w_(ctx, String(Math.round(b.kcal)), 52, 700) + 12, by, { size: 20, font: SANS, color: C.soft });
  const pX = ix + 300;
  t_(ctx, `${Math.round(b.p)} г`, pX, by, { size: 52, weight: 700, color: PROT, glow: fl * 18 });
  t_(ctx, 'протеин', pX + w_(ctx, `${Math.round(b.p)} г`, 52, 700) + 12, by, { size: 20, font: SANS, color: C.soft });
  t_(ctx, eur(b.price), ix + iw, by, { size: 52, weight: 700, color: C.ink, align: 'right', glow: fl * 14 });
  ctx.restore();
}

/* ── 05 · числата ─────────────────────────────────────────── */
const L5 = 'Храната, която си знае числата.';
function sceneLine(ctx, t) {
  backdrop(ctx, t);
  label(ctx, '05', 'ЧИСЛАТА', seg(t, 12.6, 13.0));
  const size = 66, x0 = 330, y = 560;
  chevron(ctx, x0 - 66, y - size * 0.32, size, seg(t, 12.6, 12.75));
  const p = seg(t, 12.7, 13.4), s = typed(L5, p);
  t_(ctx, s, x0, y, { size, weight: 500 });
  cursor(ctx, x0 + w_(ctx, s, size) + 6, y + 10, size, t, p > 0 && p < 1);
}

/* ── финал · знакът ───────────────────────────────────────── */
const imgs = {};
function load(name) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = name; imgs[name] = i; });
}
export const loaded = Promise.all([load('symbol-on-tile.svg'), load('wordmark-dark.svg')]);

function sceneEnd(ctx, t) {
  backdrop(ctx, t, 1 - seg(t, 14.05, 14.7) * 0.5);
  const tile = 176, wmH = 104, wmW = wmH * 2606.5 / 256, gap = 56;
  const total = tile + gap + wmW, x0 = (W - total) / 2, cy = H / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, 900);
  g.addColorStop(0, hexA(C.accent, 0.1 * seg(t, 14.05, 14.6))); g.addColorStop(1, hexA(C.accent, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* outBack(0) не е нула — без проверката плочката стои в кадъра преди да е родена. */
  const pp = seg(t, 14.02, 14.38), pop = E.outBack(pp);
  if (pp > 0) {
    ctx.save();
    ctx.translate(x0 + tile / 2, cy); ctx.scale(pop, pop);
    ctx.fillStyle = C.accent; roundRect(ctx, -tile / 2, -tile / 2, tile, tile, 40); ctx.fill();
    const sym = imgs['symbol-on-tile.svg'];
    if (sym) { const s = tile * 0.82; ctx.drawImage(sym, -s / 2, -s / 2, s, s); }
    ctx.restore();
  }

  /* Словният знак се изписва зад курсора, като ред в терминала. */
  const wp = E.inOutCubic(seg(t, 14.28, 14.75));
  const wx = x0 + tile + gap, wy = cy - wmH / 2;
  const wm = imgs['wordmark-dark.svg'];
  if (wm && wp > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(wx - 4, wy - 20, wmW * wp + 4, wmH + 40); ctx.clip();
    ctx.drawImage(wm, wx, wy, wmW, wmH);
    ctx.restore();
  }
  if (t > 14.22) cursor(ctx, wx + wmW * wp + 14, wy + wmH + 4, 70, t, wp < 1);
}

/* ── монтажът ─────────────────────────────────────────────── */
export function draw(ctx, t) {
  ctx.save();
  if (t < 4.0) sceneMenu(ctx, t);
  else if (t < 7.0) sceneGrams(ctx, t);
  else if (t < 9.6) sceneNumber(ctx, t);
  else if (t < 12.55) sceneLive(ctx, t);
  else if (t < 14.0) sceneLine(ctx, t);
  else sceneEnd(ctx, t);
  ctx.restore();
  for (const at of [4.0, 7.0, 9.6, 12.55, 14.0]) cut(ctx, t, at, 0.12);
  /* Отваряне от черно и тихо затъмнение накрая. */
  if (t < 0.3) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.3})`; ctx.fillRect(0, 0, W, H); }
}
