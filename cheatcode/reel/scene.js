/* CHEAT CODE — „Скъсай веригата“. 15 секунди, 1080×1920, без звук.

   0–5     Старият навик: безличен списък за поръчка, сива верига се
           затваря около него звено по звено и се стяга.
   5–6.5   Скъсване. Звената излитат, трите лъча на chain-burst.svg,
           сивото става ментово.
   6.5–12  Чийт Код: „Грис на стероиди“ се сглобява с плъзгачите —
           истинските снимки от public/cheatcode/.
   12–15   Знакът в скъсано състояние, името, „Сглоби своето.“, адресът.

   Всичко е функция на t. Нито Math.random, нито часовник. */
import { W, H, FPS, C, E, seg, lerp, clamp, mix, hash, wave, px, smear,
         roundRect, text, textIn, measure, bloomField, hexA } from './core.js';

/* ── Снимките ── */
const PHOTOS = ['gris.jpg', 'gris-banan.jpg', 'gris-oba.jpg', 'gris-choko.jpg'];
const img = {};
export const loaded = Promise.all(PHOTOS.map(src => new Promise(res => {
  const i = new Image();
  i.onload = () => (i.decode ? i.decode() : Promise.resolve()).then(() => res());
  i.onerror = () => res();
  i.src = src;
  img[src] = i;
})));

/* ── Цвят ── */
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function mixHex(a, b, p) {
  const x = rgb(a), y = rgb(b), q = clamp(p);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * q)).join(',')})`;
}

/* ── Пътят на веригата: заоблен правоъгълник, параметризиран по дължина ──
   Тръгва от средата на горния ръб, по часовника. */
function rrLength(w, h, r) { return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r; }
function rrPoint(s, cx, cy, w, h, r) {
  const L = rrLength(w, h, r);
  s = ((s % L) + L) % L;
  const hw = w / 2, hh = h / 2, sw = w - 2 * r, sh = h - 2 * r, q = Math.PI * r / 2;
  const segs = [
    ['line', sw / 2, [cx, cy - hh], [1, 0]],
    ['arc', q, [cx + hw - r, cy - hh + r], -Math.PI / 2],
    ['line', sh, [cx + hw, cy - hh + r], [0, 1]],
    ['arc', q, [cx + hw - r, cy + hh - r], 0],
    ['line', sw, [cx + hw - r, cy + hh], [-1, 0]],
    ['arc', q, [cx - hw + r, cy + hh - r], Math.PI / 2],
    ['line', sh, [cx - hw, cy + hh - r], [0, -1]],
    ['arc', q, [cx - hw + r, cy - hh + r], Math.PI],
    ['line', sw / 2, [cx - hw + r, cy - hh], [1, 0]],
  ];
  for (const [kind, len, o, d] of segs) {
    if (s <= len) {
      if (kind === 'line') return { x: o[0] + d[0] * s, y: o[1] + d[1] * s, a: Math.atan2(d[1], d[0]) };
      const ang = d + s / r;
      return { x: o[0] + Math.cos(ang) * r, y: o[1] + Math.sin(ang) * r, a: ang + Math.PI / 2 };
    }
    s -= len;
  }
  return { x: cx, y: cy - hh, a: 0 };
}

/* ── Звено. Четните са капсула отгоре, нечетните — същата капсула отстрани,
   тоест черта. Така се рисува верига, а не наниз от пръстени. ── */
const LINK_L = 128, LINK_H = 64, LINK_W = 15;
function link(ctx, x, y, a, side, color, scale = 1, split = 0) {
  if (scale <= 0.001) return;
  px(ctx, () => {
    ctx.translate(x, y); ctx.rotate(a); ctx.scale(scale, scale);
    ctx.strokeStyle = color; ctx.lineWidth = LINK_W; ctx.lineCap = 'round';
    if (split > 0 && !side) {
      /* Звеното, което поддава: две половини, раздалечени по оста си. */
      const g = 34 * split, hl = LINK_L / 2, r = LINK_H / 2;
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(sgn * g, 0); ctx.rotate(sgn * 0.22 * split);
        ctx.beginPath();
        ctx.moveTo(-sgn * 6, -r);
        ctx.lineTo(sgn * (hl - r), -r);
        ctx.arc(sgn * (hl - r), 0, r, -Math.PI / 2, Math.PI / 2, sgn < 0);
        ctx.lineTo(-sgn * 6, r);
        ctx.stroke();
        ctx.restore();
      }
    } else if (side) {
      ctx.beginPath(); ctx.moveTo(-LINK_L / 2 + 10, 0); ctx.lineTo(LINK_L / 2 - 10, 0); ctx.stroke();
    } else {
      roundRect(ctx, -LINK_L / 2, -LINK_H / 2, LINK_L, LINK_H, LINK_H / 2); ctx.stroke();
    }
  });
}

/* ── Безличният списък. Никаква истинска марка: врагът е навикът. ── */
const MENU = [
  ['Бургер меню', '14,90'], ['Пица „Четири сирена“', '18,50'], ['Дюнер голям', '9,80'],
  ['Пържени картофи XL', '6,40'], ['Наггетс, 9 бр.', '8,90'], ['Хот-дог двоен', '7,20'],
  ['Бургер меню', '14,90'], ['Пица „Пеперони“', '17,90'], ['Дюнер голям', '9,80'],
  ['Пържени картофи XL', '6,40'], ['Наггетс, 9 бр.', '8,90'], ['Бургер меню', '14,90'],
];
const PHONE = { cx: 540, cy: 980, w: 600, h: 980, r: 60 };

/* Превъртането е сбор от отделни замаха, всеки със своето забавяне —
   така се движи палец, а не лента. */
function scrollAt(t) {
  let y = 0;
  for (let k = 0; k < 6; k++) y += 240 * E.outCubic(seg(t, 0.25 + k * 0.78, 0.25 + k * 0.78 + 0.5));
  return y;
}

function drawPhone(ctx, t, k, alpha) {
  const { cx, cy } = PHONE, w = PHONE.w * k, h = PHONE.h * k;
  const x = cx - w / 2, y = cy - h / 2;
  px(ctx, () => {
    ctx.globalAlpha = alpha;
    roundRect(ctx, x, y, w, h, PHONE.r * k);
    ctx.fillStyle = C.greyCard; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = C.greyLine; ctx.stroke();
    ctx.save();
    roundRect(ctx, x, y, w, h, PHONE.r * k); ctx.clip();
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-PHONE.cx, -PHONE.cy);
    const X = PHONE.cx - PHONE.w / 2, Y = PHONE.cy - PHONE.h / 2;
    // Заглавието на екрана.
    text(ctx, 'Поръчай отново', X + 44, Y + 104, { size: 40, weight: 600, color: '#B5BBB8' });
    ctx.fillStyle = C.greyLine; ctx.fillRect(X + 44, Y + 140, PHONE.w - 88, 2);
    // Редовете.
    ctx.save();
    ctx.beginPath(); ctx.rect(X, Y + 150, PHONE.w, PHONE.h - 150); ctx.clip();
    const off = scrollAt(t), rowH = 150;
    // Списъкът няма край — същите неща се връщат отново.
    const first = Math.floor(off / rowH) - 1;
    for (let j = first; j < first + 9; j++) {
      const i = ((j % MENU.length) + MENU.length) % MENU.length;
      const ry = Y + 180 + j * rowH - off;
      if (ry < Y - rowH || ry > Y + PHONE.h + 20) continue;
      roundRect(ctx, X + 44, ry, 104, 104, 22); ctx.fillStyle = '#2A2E2F'; ctx.fill();
      // Сив кръг вместо храна: един и същ, винаги.
      ctx.beginPath(); ctx.arc(X + 96, ry + 52, 28, 0, Math.PI * 2); ctx.fillStyle = '#3A3F40'; ctx.fill();
      text(ctx, MENU[i][0], X + 176, ry + 46, { size: 32, weight: 500, color: '#A6ACA9' });
      text(ctx, MENU[i][1] + ' лв', X + 176, ry + 92, { size: 28, weight: 500, color: '#6E7471' });
      ctx.beginPath(); ctx.arc(X + PHONE.w - 84, ry + 52, 30, 0, Math.PI * 2);
      ctx.lineWidth = 3; ctx.strokeStyle = '#4A4F50'; ctx.stroke();
      text(ctx, '+', X + PHONE.w - 84, ry + 64, { size: 40, weight: 500, color: '#8A908D', align: 'center' });
    }
    ctx.restore();
    // Палецът: меко кръгче, което се плъзга нагоре при всеки замах.
    for (let s = 0; s < 6; s++) {
      const p = seg(t, 0.2 + s * 0.78, 0.2 + s * 0.78 + 0.56);
      if (p <= 0 || p >= 1) continue;
      const fy = lerp(Y + 760, Y + 420, E.outCubic(p));
      ctx.globalAlpha = alpha * Math.sin(p * Math.PI) * 0.35;
      ctx.beginPath(); ctx.arc(X + PHONE.w * 0.62, fy, 46, 0, Math.PI * 2);
      ctx.fillStyle = '#E8ECEA'; ctx.fill();
    }
    ctx.restore();
  });
}

/* ── Знакът в скъсано състояние, по chain-burst.svg, в единиците на SVG ── */
const P_LINK = new Path2D('M15 23 h13 a9 9 0 0 1 0 18 h-13 a9 9 0 0 1 0 -18 z');
const P_CUT  = new Path2D('M34 23 h10 a9 9 0 0 1 9 9');
const P_UP   = new Path2D('M32 23 h11 a9 9 0 0 1 8 5');
const P_DOWN = new Path2D('M32 41 h11 a9 9 0 0 0 8 -5');
const RAYS = [[47.5, 15.5, 5, -5], [54, 23.5, 6.2, -2.57], [42.5, 10, 1.61, -6]];
let off = null;

function burstMark(ctx, cx, cy, size, pDraw, pRays, color) {
  const S = size / 64;
  if (!off) { off = document.createElement('canvas'); }
  const ow = Math.ceil(size), oh = Math.ceil(size);
  if (off.width !== ow) { off.width = ow; off.height = oh; }
  const o = off.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, ow, oh);
  const chainT = g => { g.scale(S, S); g.translate(-2.5, 9); g.scale(0.88, 0.88); g.translate(32, 32); g.rotate(-35 * Math.PI / 180); g.translate(-32, -32); };
  // Лявото звено, с маската на заплитането.
  o.save(); chainT(o);
  o.lineWidth = 5.8; o.lineCap = 'round'; o.strokeStyle = color;
  o.setLineDash([83 * pDraw, 200]); o.stroke(P_LINK);
  o.setLineDash([]);
  o.globalCompositeOperation = 'destination-out';
  o.lineWidth = 12; o.strokeStyle = '#000'; o.stroke(P_CUT);
  o.restore();
  // Поддалото звено — две половини.
  o.save(); chainT(o);
  o.lineWidth = 5.8; o.lineCap = 'round'; o.strokeStyle = color;
  const q = clamp((pDraw - 0.35) / 0.65);
  if (q > 0.001) { o.setLineDash([22 * q, 100]); o.stroke(P_UP); o.stroke(P_DOWN); }
  o.restore();
  // Лъчите — с ход, растат навън от мястото на скъсването.
  if (pRays > 0.001) {
    o.save(); o.scale(S, S); o.translate(0, 5);
    o.lineWidth = 5; o.lineCap = 'round'; o.strokeStyle = color;
    for (const [x, y, dx, dy] of RAYS) {
      o.beginPath(); o.moveTo(x, y); o.lineTo(x + dx * pRays, y + dy * pRays); o.stroke();
    }
    o.restore();
  }
  ctx.drawImage(off, cx - size / 2, cy - size / 2);
}


/* ── Отломки и знакът „скъсване“ по референцията от 2026-10-04 ──
   Две дебели звена по диагонал, фугата между тях — назъбена дупка, и
   плътни парчета наоколо: квадрати, триъгълници, шестоъгълник, точка.
   Само във видеото: на 400+ пиксела плътните отломки се четат. В знака
   под 32 px стават петна — затова chain-burst.svg остава с лъчи. */
const SHARD_KINDS = ['sq', 'tri', 'sq', 'hex', 'tri', 'dot'];
function shard(ctx, kind, x, y, r, rot, color, alpha = 1) {
  if (alpha <= 0 || r <= 0.5) return;
  px(ctx, () => {
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    ctx.beginPath();
    if (kind === 'sq') ctx.rect(-r / 2, -r / 2, r, r);
    else if (kind === 'tri') { ctx.moveTo(0, -r * 0.62); ctx.lineTo(r * 0.58, r * 0.42); ctx.lineTo(-r * 0.58, r * 0.42); ctx.closePath(); }
    else if (kind === 'hex') for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); }
    else ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* Местата на парчетата в осите на знака (x по веригата, y напреко). Две
   групи, от двете страни на фугата — както на референцията. */
const MARK_SHARDS = [
  ['sq', -78, -168, 30, 0.35], ['sq', -8, -196, 22, 0.7], ['tri', -128, -112, 40, -0.4],
  ['tri', -30, -130, 30, 0.9], ['dot', -60, -232, 26, 0],
  ['sq', 84, 150, 26, 0.5], ['tri', 22, 136, 30, 2.6], ['hex', 70, 214, 36, 0.2],
  ['dot', -6, 176, 26, 0], ['tri', 122, 96, 24, 1.9],
];
let markCv = null;
function breakMark(ctx, cx, cy, k, t, color) {
  const LL = 300, LH = 150, LW = 48;          // звено: дължина, височина, ход
  const pIn = E.outCubic(seg(t, 12.25, 12.75));
  const crack = E.outExpo(seg(t, 12.8, 13.1));
  const gap = 14 * crack;
  const size = 980;
  if (!markCv) { markCv = document.createElement('canvas'); markCv.width = markCv.height = size; }
  const o = markCv.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, size, size);
  o.translate(size / 2, size / 2); o.rotate(-Math.PI / 4); o.scale(k, k);
  o.strokeStyle = color; o.lineWidth = LW; o.lineCap = 'round';
  for (const [sx, d] of [[-92, -1], [92, 1]]) {
    const x = sx + d * gap + d * (1 - pIn) * 60;
    roundRect(o, x - LL / 2 + LW / 2, -LH / 2 + LW / 2, LL - LW, LH - LW, (LH - LW) / 2);
    o.globalAlpha = pIn; o.stroke();
  }
  o.globalAlpha = 1;
  if (crack > 0) {
    // Фугата: назъбена ивица напреко, изядена от двете звена.
    o.globalCompositeOperation = 'destination-out';
    o.beginPath();
    const L = [[-26, -120], [-44, -66], [-20, -24], [-48, 22], [-24, 64], [-42, 120]];
    const R = [[34, 120], [16, 62], [44, 18], [20, -28], [42, -74], [24, -120]];
    const w = crack;
    [...L, ...R].forEach(([x, y], i) => o[i ? 'lineTo' : 'moveTo'](x * w, y));
    o.closePath(); o.fill();
    o.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(markCv, cx - size / 2, cy - size / 2);
  // Парчетата излитат от фугата към местата си.
  const pb = E.outBack(seg(t, 12.8, 13.25));
  if (pb > 0) {
    const c = Math.cos(-Math.PI / 4), s = Math.sin(-Math.PI / 4);
    MARK_SHARDS.forEach(([kind, x, y, r, rot], i) => {
      const lx = x * pb * k, ly = y * pb * k;
      shard(ctx, kind, cx + lx * c - ly * s, cy + lx * s + ly * c, r * k,
            rot + (1 - pb) * 3 * (i % 2 ? 1 : -1), color, clamp(pb * 1.5));
    });
  }
}

/* ── Плъзгач, като в page.html: писта 6 → тук 10, палец с ментов пръстен ── */
function slider(ctx, x, y, w, frac, label, value, alpha, touch) {
  px(ctx, () => {
    ctx.globalAlpha = alpha;
    text(ctx, label, x, y, { size: 36, weight: 600, color: C.ink });
    text(ctx, value, x + w, y, { size: 34, weight: 500, color: C.accent, align: 'right' });
    const ty = y + 46;
    roundRect(ctx, x, ty - 5, w, 10, 5); ctx.fillStyle = C.surface2; ctx.fill();
    if (frac > 0.002) { roundRect(ctx, x, ty - 5, w * frac, 10, 5); ctx.fillStyle = C.accent; ctx.fill(); }
    const tx = x + w * frac;
    if (touch > 0) {
      ctx.globalAlpha = alpha * touch * 0.22;
      ctx.beginPath(); ctx.arc(tx, ty, 46, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
      ctx.globalAlpha = alpha;
    }
    ctx.beginPath(); ctx.arc(tx, ty, 20, 0, Math.PI * 2);
    ctx.fillStyle = C.surface; ctx.fill();
    ctx.lineWidth = 9; ctx.strokeStyle = C.accent; ctx.stroke();
  });
}

function photo(ctx, src, x, y, w, h, alpha) {
  const i = img[src]; if (!i || !i.width || alpha <= 0) return;
  const s = Math.max(w / i.width, h / i.height);
  const sw = w / s, sh = h / s;
  px(ctx, () => {
    ctx.globalAlpha *= alpha;
    ctx.drawImage(i, (i.width - sw) / 2, (i.height - sh) / 2, sw, sh, x, y, w, h);
  });
}

/* Стойност, стъпаловидна като на сайта: плъзгачът минава плавно, числото — на стъпки. */
const stepVal = (a, b, p, step) => Math.round(lerp(a, b, p) / step) * step;

export function draw(ctx, t) {
  const frame = Math.round(t * FPS);

  /* ── Фон: сиво до скъсването, после смърчово-тъмното на Чийт Код ── */
  const toGreen = E.outCubic(seg(t, 5.0, 6.2));
  ctx.fillStyle = mixHex(C.greyBg, C.bg, toGreen);
  ctx.fillRect(0, 0, W, H);

  /* ════ СЦЕНА 1–2: веригата ════ */
  if (t < 6.6) {
    const tight = E.inOutCubic(seg(t, 3.0, 4.75)) * 0.075 + E.inQuad(seg(t, 4.75, 5.0)) * 0.02;
    const k = 1 - tight;
    const shake = 7 * seg(t, 3.4, 5.0) * (1 - seg(t, 5.0, 5.05));
    const fall = E.inQuad(seg(t, 5.0, 5.9));
    const phoneA = (1 - seg(t, 5.15, 5.85)) * (1 - 0.35 * seg(t, 3.0, 5.0)) * seg(t, 0, 0.35);

    px(ctx, () => {
      ctx.translate((wave(t * 22, 3) - 0.5) * shake, 1500 * fall);
      drawPhone(ctx, t, 1 - tight * 0.6, phoneA);
    });

    // Звената.
    const cw = (PHONE.w + 150) * k, ch = (PHONE.h + 150) * k, cr = 120 * k;
    const L = rrLength(cw, ch, cr);
    let N = Math.round(L / 96); if (N % 2) N++;
    const pitch = L / N;
    const sBreak = (cw / 2 - cr) + Math.PI * cr / 4;
    let b = Math.round(sBreak / pitch); if (b % 2) b++;   // поддава звено отгоре, не черта
    const pBreak = seg(t, 5.0, 6.4);
    const greyToMint = seg(t, 5.0, 5.35);
    const fade = 1 - seg(t, 5.75, 6.4);

    const drawLinks = tt => {
      const pb = seg(tt, 5.0, 6.4);
      for (let i = 0; i < N; i++) {
        const born = 0.45 + i * (2.3 / N);
        const pIn = seg(tt, born, born + 0.2);
        if (pIn <= 0) continue;
        const pt = rrPoint(i * pitch, PHONE.cx, PHONE.cy, cw, ch, cr);
        let x = pt.x + (wave(tt * 26, i + 7) - 0.5) * shake;
        let y = pt.y + (wave(tt * 26, i + 91) - 0.5) * shake;
        let a = pt.a;
        if (pb > 0) {
          // Разстояние по веригата от скъсването: най-близките летят най-бързо.
          let d = i - b; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
          const near = 1 - Math.abs(d) / (N / 2);
          const ox = x - PHONE.cx, oy = y - PHONE.cy, ol = Math.hypot(ox, oy) || 1;
          const sp = 380 + 1100 * near * near + 160 * hash(i, 5);
          const e = E.outCubic(pb);
          x += (ox / ol) * sp * e + Math.sign(d || 1) * 120 * near * e;
          y += (oy / ol) * sp * e + 1700 * pb * pb;
          a += Math.sign(d || 1) * (1.5 + 2.5 * hash(i, 9)) * e;
        }
        const color = mixHex(C.grey, C.accent, greyToMint);
        px(ctx, () => {
          ctx.globalAlpha *= fade;
          const split = i === b ? E.outExpo(seg(tt, 4.82, 5.0)) : 0;
          link(ctx, x, y, a, i % 2 === 1, i === b && tt < 5.0 ? mixHex(C.grey, C.accent, seg(tt, 4.82, 5.0)) : color, E.outBack(pIn), split);
        });
      }
    };
    if (pBreak > 0 && pBreak < 0.3) smear(ctx, t, drawLinks, 4, 0.5 / FPS);
    else drawLinks(t);

    // Мястото на скъсването: светкавица и трите лъча, летящи навън.
    const bp = rrPoint(b * pitch, PHONE.cx, PHONE.cy, cw, ch, cr);
    const pre = seg(t, 4.82, 5.0);
    if (pre > 0 && t < 5.0) bloomField(ctx, t, bp.x, bp.y, 260, hexA(C.accent, 0.9), 0.5 * pre);
    const fl = seg(t, 5.0, 5.3);
    if (fl > 0 && fl < 1) {
      bloomField(ctx, t, bp.x, bp.y, 900, hexA(C.accent, 0.9), 0.55 * (1 - fl));
    }
    // Отломките: плътни парчета от фугата, навън и надолу. Отделно семе за всяко.
    const rp = seg(t, 5.0, 5.9);
    if (rp > 0 && rp < 1) {
      const out = Math.atan2(bp.y - PHONE.cy, bp.x - PHONE.cx);
      for (let k = 0; k < 12; k++) {
        const ang = out + (hash(k, 31) - 0.5) * 2.4;
        const sp = 260 + 520 * hash(k, 32);
        const e = E.outExpo(rp);
        const x = bp.x + Math.cos(ang) * sp * e;
        const y = bp.y + Math.sin(ang) * sp * e + 900 * rp * rp;
        shard(ctx, SHARD_KINDS[k % SHARD_KINDS.length], x, y, 24 + 26 * hash(k, 33),
              (hash(k, 34) - 0.5) * 9 * rp, C.accent, 1 - E.inQuad(rp));
      }
    }

    // Надписите на навика.
    const capA = 1 - seg(t, 4.7, 5.0);
    if (capA > 0) {
      textIn(ctx, 'Пак същото.', 540, 250, seg(t, 0.5, 1.4),
        { size: 72, weight: 800, display: true, color: '#C9CFCB', align: 'center', alpha: capA });
      textIn(ctx, 'Всяка вечер.', 540, 330, seg(t, 2.2, 2.9),
        { size: 42, weight: 600, color: '#8A908D', align: 'center', alpha: capA });
    }
  }

  /* ════ СЦЕНА 3: Чийт Код сглобява ════ */
  const cIn = E.outQuint(seg(t, 6.2, 6.95));
  const cOut = seg(t, 11.9, 12.4);
  if (cIn > 0 && cOut < 1) {
    bloomField(ctx, t, 540, 300, 1100, hexA(C.accent, 0.5), 0.10);
    const a = cIn * (1 - cOut);
    const lift = (1 - cIn) * 260;
    const sc = 1 - 0.05 * E.inQuad(cOut);

    textIn(ctx, 'Твоето. На грам.', 540, 250, seg(t, 6.6, 7.4),
      { size: 64, weight: 800, display: true, color: C.ink, align: 'center', alpha: 1 - cOut });

    px(ctx, () => {
      ctx.globalAlpha = a;
      ctx.translate(540, 1000 + lift); ctx.scale(sc, sc); ctx.translate(-540, -1000);
      const X = 80, Wd = 920, Y = 360, PH = 640;
      roundRect(ctx, X, Y, Wd, 1170, 44); ctx.fillStyle = C.surface; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke();

      // Снимката: сменя се, щом съставката влезе — като на сайта.
      ctx.save();
      roundRect(ctx, X, Y, Wd, PH, 44); ctx.clip();
      const banana = seg(t, 8.4, 8.75), bisc = seg(t, 9.35, 9.7), choko = seg(t, 10.45, 10.8);
      photo(ctx, 'gris.jpg', X, Y, Wd, PH, 1);
      photo(ctx, 'gris-banan.jpg', X, Y, Wd, PH, banana);
      photo(ctx, 'gris-oba.jpg', X, Y, Wd, PH, bisc);
      photo(ctx, 'gris-choko.jpg', X, Y, Wd, PH, choko);
      ctx.restore();

      text(ctx, 'Грис на стероиди', X + 48, Y + PH + 86, { size: 50, weight: 800, display: true, color: C.ink });

      const sx = X + 48, sw = Wd - 96;
      const g = E.inOutCubic(seg(t, 7.3, 8.05));
      const bn = E.inOutCubic(seg(t, 8.15, 8.85));
      const bs = E.inOutCubic(seg(t, 9.1, 9.8));
      const touch = (a0, a1) => Math.sin(Math.PI * seg(t, a0 - 0.15, a1 + 0.15));
      slider(ctx, sx, Y + PH + 180, sw, lerp(0.15, 0.5, g), 'Оризов грис', `${stepVal(60, 80, g, 10)} г`, 1, touch(7.3, 8.05));
      slider(ctx, sx, Y + PH + 290, sw, lerp(0, 0.67, bn), 'Банан', `${stepVal(0, 100, bn, 25)} г`, 1, touch(8.15, 8.85));
      slider(ctx, sx, Y + PH + 400, sw, lerp(0, 0.5, bs), 'Бисквити', `${stepVal(0, 30, bs, 10)} г`, 1, touch(9.1, 9.8));

      // Отгоре: дарк чоко поръска — чип, който се включва.
      const on = E.outBack(seg(t, 10.3, 10.6));
      const chip = '+ Дарк чоко поръска';
      const cw2 = measure(ctx, chip, 32, 600) + 64, cy2 = Y + PH + 470;
      px(ctx, () => {
        const s2 = 1 + 0.06 * Math.sin(Math.PI * seg(t, 10.3, 10.6));
        ctx.translate(sx + cw2 / 2, cy2 + 34); ctx.scale(s2, s2); ctx.translate(-(sx + cw2 / 2), -(cy2 + 34));
        roundRect(ctx, sx, cy2, cw2, 68, 34);
        ctx.fillStyle = mixHex(C.surface, C.accent, on); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = C.accent; ctx.stroke();
        text(ctx, on > 0.5 ? '✓ Дарк чоко поръска' : chip, sx + 32, cy2 + 45,
          { size: 32, weight: 600, color: mixHex(C.accent, C.bg, on) });
      });
    });
  }

  /* ════ СЦЕНА 4: знакът ════ */
  const mIn = seg(t, 12.25, 13.0);
  if (mIn > 0) {
    bloomField(ctx, t, 540, 720, 700, hexA(C.accent, 0.6), 0.16 * mIn);
    const size = 440;
    breakMark(ctx, 540, 740, 1.25, t, C.accent);
    textIn(ctx, 'CHEAT CODE', 540, 1330, seg(t, 13.1, 13.8),
      { size: 92, weight: 800, display: true, color: C.ink, align: 'center', track: 2 });
    textIn(ctx, 'Храната, която си знае числата', 540, 1420, seg(t, 13.55, 14.2),
      { size: 50, weight: 600, color: C.soft, align: 'center' });
    const ua = E.outCubic(seg(t, 13.9, 14.4));
    px(ctx, () => {
      ctx.globalAlpha = ua;
      ctx.font = `500 34px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center'; ctx.fillStyle = C.accent;
      ctx.fillText('blag-coaching.com/cheatcode', 540, 1500 + (1 - ua) * 16);
    });
  }

  // Влизане от тъмно.
  const fi = 1 - seg(t, 0, 0.35);
  if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, W, H); }
}
