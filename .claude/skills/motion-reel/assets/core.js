/* ───────────────────────────────────────────────────────────────
   SUPER NOTCHY — SHOWREEL
   Ядрото: време, криви, шум, и помощниците за рисуване.

   Единственото правило в целия файл: всичко е чиста функция на `t`.
   Никакво `Math.random`, никакво `Date.now` вътре в рисуването, никакви
   CSS keyframes. Кадърът на 91.4 секунда трябва да изглежда еднакво
   независимо дали е гледан на живо или изваден сам за енкодера — инак
   заснемането трепти и цялата работа отива на вятъра.
   ─────────────────────────────────────────────────────────────── */

/* Размерът и палитрата са променливи, не константи: ядрото се ползва от
   повече от един клип, а вторият е вертикален и с друга марка. ES модулите
   изнасят живи връзки, затова `setSize` стига — стойността се вижда навън.
   Който чете W/H на ниво модул, трябва да го прави СЛЕД setSize; сцените
   долу ги четат вътре във функции, точно заради това. */
export let W = 1920, H = 1080;
export const FPS = 30;

export function setSize(w, h) { W = w; H = h; }

/* ── Палитра ──────────────────────────────────────────────────
   Черното не е черно. #06080A има лек студен уклон, за да не сплесква
   акцентите — чистото #000 изяжда светенето по ръбовете. */
export const C = {
  bg:    '#06080A',
  ink:   '#F4F7FA',
  soft:  '#8B97A6',
  faint: '#3A4450',
  line:  '#18202A',
  cyan:  '#4CE0E8',
  blue:  '#5B8CFF',
  viol:  '#A878FF',
  warn:  '#FFB454',
  hot:   '#FF6B8A',
};

/* Акцентът се върти през продуктовите цветове; един индекс, за да може
   цяла сцена да се пребоядиса от едно място. */
export const ACCENTS = [C.cyan, C.blue, C.viol, C.warn, C.hot];

/* ── Време ────────────────────────────────────────────────────
   `seg` е целият тайминг апарат. Дава 0..1 между две секунди и се
   изрязва извън тях — сцените се пишат като редици от `seg`, не като
   стейт машина. */
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, p) => a + (b - a) * p;
export const mix = (a, b, p) => a + (b - a) * clamp(p);

/* ── Криви ────────────────────────────────────────────────────
   Изборът е тесен нарочно. Четири влизания, две излизания и една
   пружина. Всяка добавена крива е още един начин две неща да се движат
   почти еднакво, но не съвсем — а точно това окото хваща като аматьорско. */
export const E = {
  linear: p => p,
  inQuad:  p => p * p,
  outQuad: p => 1 - (1 - p) * (1 - p),
  outCubic: p => 1 - Math.pow(1 - p, 3),
  inOutCubic: p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  outQuint: p => 1 - Math.pow(1 - p, 5),
  inOutQuint: p => p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2,
  outExpo: p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
  inOutExpo: p => p === 0 ? 0 : p === 1 ? 1
    : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
  outBack: p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2),
  /* Пружина с 5 полупериода. Повече звъни като евтина реклама. */
  spring: p => p >= 1 ? 1 : 1 - Math.pow(2, -9 * p) * Math.cos(p * Math.PI * 5),
};

/* ── Детерминиран шум ─────────────────────────────────────────
   mulberry32: един int вътре, един float навън, същият резултат
   всеки път. Всяка частица си носи собствено семе, вместо да тегли
   от общ поток — така добавянето на частица не размества другите. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
export const hash = (i, s = 1) => { const r = rng(i * 374761393 + s * 668265263); r(); return r(); };

/* Плавен шум за течения и трептене — интерполирани стойности по цяло
   число, не истински Перлин, но за поле от частици разликата не се вижда. */
export function wave(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i, seed), b = hash(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

/* ── Рисуване ─────────────────────────────────────────────── */

export function px(ctx, fn) { ctx.save(); fn(); ctx.restore(); }

/* Темпорално размазване. Истинското motion blur не се прави с филтър —
   прави се с време. Елементът се рисува N пъти в рамките на един кадър,
   всеки път с 1/N плътност. Скъпо е, затова стои само върху нещата,
   които наистина летят. */
export function smear(ctx, t, fn, n = 6, span = 1 / FPS) {
  if (n <= 1) { fn(t); return; }
  ctx.save();
  ctx.globalAlpha = 1 / n;
  for (let k = 0; k < n; k++) fn(t - span * (k / n));
  ctx.restore();
}

export function ring(ctx, x, y, r, a0, a1, w, color, cap = 'round') {
  /* Кръглата шапка превръща дъга с нулева дължина в точка. Без този ред
     всеки пръстен, който още не е тръгнал, стои като прашинка в кадъра. */
  if (Math.abs(a1 - a0) < 1e-4) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.lineWidth = w;
  ctx.lineCap = cap;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

/* Светенето е два хода, не `shadowBlur`: сянката в canvas се смята за
   всяка форма поотделно и на 1920×1080 изяжда кадъра. Дебел прозрачен
   ход отдолу и тънък плътен отгоре дава същото за нищо. */
export function glowRing(ctx, x, y, r, a0, a1, w, color, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.14 * strength;
  ring(ctx, x, y, r, a0, a1, w * 5, color);
  ctx.globalAlpha = 0.22 * strength;
  ring(ctx, x, y, r, a0, a1, w * 2.4, color);
  ctx.restore();
  ring(ctx, x, y, r, a0, a1, w, color);
}

export function roundRect(ctx, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/* Два лица: едно за текст, едно за заглавия. Втората марка има свои и
   затова стоят в променливи, както цветовете и размерът. */
let FONT = '"Inter", system-ui, sans-serif';
let FONT_DISPLAY = FONT;
export function setFonts(body, display) { FONT = body; FONT_DISPLAY = display || body; }

export function text(ctx, str, x, y, o = {}) {
  const {
    size = 40, weight = 500, color = C.ink, align = 'left',
    base = 'alphabetic', alpha = 1, track = 0, blur = 0,
  } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${o.display ? FONT_DISPLAY : FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.letterSpacing = `${track}px`;
  ctx.fillStyle = color;
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function measure(ctx, str, size, weight = 500, track = 0, display = false) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${display ? FONT_DISPLAY : FONT}`;
  ctx.letterSpacing = `${track}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/* Буква по буква. Индексът влиза в закъснението, а не в стойността —
   така целият надпис свършва заедно, независимо колко е дълъг. */
export function textIn(ctx, str, x, y, p, o = {}) {
  const { size = 40, weight = 500, align = 'left', stagger = 0.045, rise = 26 } = o;
  const chars = [...str];
  const total = 1 + stagger * (chars.length - 1);
  let w = 0;
  const widths = chars.map(c => { const m = measure(ctx, c, size, weight, o.track || 0); w += m; return m; });
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  chars.forEach((c, i) => {
    const local = clamp((p * total - stagger * i) / 1);
    if (local <= 0) { cx += widths[i]; return; }
    const e = E.outExpo(local);
    text(ctx, c, cx, y + (1 - e) * rise, {
      ...o, align: 'left', alpha: (o.alpha ?? 1) * e,
    });
    cx += widths[i];
  });
}

/* ── Атмосфера ────────────────────────────────────────────── */

export function vignette(ctx, strength = 0.9) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* Зърното е това, което сваля кадъра от „рендер" към „заснето". Стъпката
   е 3 пиксела: на всеки пиксел става каша, а и струва четири пъти повече. */
export function grain(ctx, frame, amount = 0.05) {
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  const step = 3;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const v = hash(x * 73856093 ^ y * 19349663, frame % 12);
      if (v > 0.68) {
        ctx.fillStyle = v > 0.84 ? '#fff' : '#000';
        ctx.fillRect(x, y, step, step);
      }
    }
  }
  ctx.restore();
}

/* Хоризонт от мека светлина зад сцената. Държи черното да не е плоско. */
export function bloomField(ctx, t, cx, cy, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* Палитрата се подменя на място, за да видят промяната и модулите, които
   вече са я внесли — пресвояване на `C` би им оставило стария обект. */
export function setPalette(next) { Object.assign(C, next); }

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
}

/* Разрез между сцени. Прережда се в черно за 6 кадъра — колкото окото
   да мигне, недостатъчно да го усети като пауза. */
export function cut(ctx, t, at, len = 0.2) {
  const d = Math.abs(t - at);
  if (d > len) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 1 - d / len;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
