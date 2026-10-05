/* BLAG COACHING — „До сцената“. 15 секунди, 1080×1920, без звук.

   Истинската подготовка на Николай, от базата на приложението:
   prep_protocols, weight_logs и peak_week_days. Нищо не е закръглено за
   красота — числата са каквито са въведени (Р5).

   0–2.5    Старт: 15.07, 77,6 кг, Classic Physique.
   2.4–8.6  Кривата: 56 сутрешни мерения до 18.09, лимитът 77 кг.
   8.4–11.2 Пиковата седмица: три мерения на 14.09.
   11–12.8  Сцената: 20.09, Варна, 13:15.
   12.6–15  Знакът: BLAG COACHING · Be Blag, be better. */
import { W, H, FPS, C, E, seg, lerp, clamp, px, roundRect, text, textIn, measure, bloomField, hexA } from './core.js';

const ARM = { img: null };
export const loaded = new Promise(res => {
  const i = new Image(); i.onload = () => res(); i.onerror = () => res();
  i.src = 'arms-hi.webp'; ARM.img = i;
});

/* weight_logs, 15.07–18.09. Мерението от 24.09 е след сцената и не влиза. */
const RAW = `07-15:77.6 07-16:78.25 07-17:77.9 07-18:78.15 07-19:78.25 07-20:78.5 07-21:77.1 07-22:77.85 07-23:77.7 07-25:78 07-26:77.35 07-27:77.45 07-28:77.5 07-30:77.6 08-03:77.1 08-04:77.1 08-05:76.65 08-06:76.4 08-07:76.9 08-08:76.65 08-10:76.6 08-11:76.4 08-12:76.4 08-13:75.95 08-14:75.6 08-15:75 08-16:74.6 08-17:75.9 08-18:74.7 08-19:75.2 08-20:75.4 08-21:75.3 08-22:75.2 08-23:76.4 08-24:75.9 08-25:75.3 08-26:74.5 08-27:74.4 08-28:74 08-29:74 08-30:74.6 09-02:73.8 09-03:74 09-04:74 09-05:73.9 09-06:73 09-07:73.1 09-08:74 09-09:74 09-10:74.2 09-12:74 09-14:73.8 09-15:73.6 09-16:73.3 09-17:73.6 09-18:73`;
const DAY0 = Date.UTC(2026, 6, 15);
const PTS = RAW.split(' ').map(s => {
  const [md, kg] = s.split(':'); const [m, d] = md.split('-').map(Number);
  return { day: (Date.UTC(2026, m - 1, d) - DAY0) / 864e5, kg: Number(kg), label: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}` };
});
const LAST_DAY = PTS[PTS.length - 1].day;          // 65
const kgStr = v => v.toFixed(Math.round(v * 100) % 10 ? 2 : 1).replace('.', ',');
const kg1 = v => v.toFixed(1).replace('.', ',');

/* Плавна линия през точките: Catmull-Rom → кубични Безие, като smoothPath в WeightChart. */
function smooth(ctx, pts) {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
                      p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
}

function kicker(ctx, str, x, y, alpha, align = 'center') {
  text(ctx, str, x, y, { size: 30, weight: 500, color: C.accent, align, alpha, track: 6, display: true });
}

export function draw(ctx, t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bloomField(ctx, t, 540, 420, 1100, hexA(C.accent, 0.35), 0.10);

  /* ════ 1 · Старт ════ */
  const s1 = 1 - seg(t, 2.3, 2.7);
  if (s1 > 0 && t < 2.8) {
    kicker(ctx, 'ПОДГОТОВКА · CLASSIC PHYSIQUE', 540, 640, E.outCubic(seg(t, 0.3, 0.9)) * s1);
    textIn(ctx, '15.07', 540, 900, seg(t, 0.5, 1.3), { size: 230, weight: 600, display: true, color: C.ink, align: 'center', alpha: s1 });
    const cnt = E.outCubic(seg(t, 1.0, 1.9));
    text(ctx, `${kg1(lerp(70, 77.6, cnt))} кг`, 540, 1050, { size: 96, weight: 500, display: true, color: C.accent, align: 'center', alpha: s1 * seg(t, 1.0, 1.2) });
    text(ctx, 'Ден 1 от подготовката', 540, 1130, { size: 38, weight: 400, color: C.soft, align: 'center', alpha: s1 * seg(t, 1.5, 2.0) });
  }

  /* ════ 2 · Кривата ════ */
  const cIn = seg(t, 2.4, 2.9), cOut = 1 - seg(t, 8.3, 8.7);
  if (cIn > 0 && cOut > 0) {
    const a = cIn * cOut;
    const X0 = 110, X1 = 970, Y0 = 760, Y1 = 1340, KMIN = 72.5, KMAX = 79;
    const xOf = d => X0 + (X1 - X0) * d / LAST_DAY;
    const yOf = k => Y1 - (Y1 - Y0) * (k - KMIN) / (KMAX - KMIN);
    const head = E.inOutCubic(seg(t, 2.9, 7.6)) * LAST_DAY;   // докъде е стигнала линията, в дни
    const shown = PTS.filter(p => p.day <= head + 1e-6);
    const cur = shown[shown.length - 1] || PTS[0];

    px(ctx, () => {
      ctx.globalAlpha = a;
      // Хоризонтални деления през 1 кг.
      ctx.lineWidth = 2;
      for (let k = 73; k <= 78; k++) {
        ctx.strokeStyle = hexA(C.faint, 0.18);
        ctx.beginPath(); ctx.moveTo(X0, yOf(k)); ctx.lineTo(X1, yOf(k)); ctx.stroke();
        text(ctx, `${k}`, X0 - 18, yOf(k) + 10, { size: 26, weight: 500, color: C.faint, align: 'right', display: true });
      }
      // Седмиците отдолу.
      for (let w = 0; w <= 9; w++) {
        const d = w * 7; if (d > LAST_DAY) break;
        text(ctx, `С${w + 1}`, xOf(d + 3.5), Y1 + 54, { size: 24, weight: 500, color: C.faint, align: 'center', display: true, alpha: 0.9 });
      }
      // Лимитът на категорията: 77 кг.
      const lim = seg(t, 5.6, 6.2);
      if (lim > 0) {
        ctx.save();
        ctx.setLineDash([14, 12]); ctx.lineWidth = 3; ctx.strokeStyle = hexA(C.ink, 0.55 * lim);
        ctx.beginPath(); ctx.moveTo(X0, yOf(77)); ctx.lineTo(X0 + (X1 - X0) * E.outCubic(lim), yOf(77)); ctx.stroke();
        ctx.restore();
        text(ctx, 'ЛИМИТ 77 КГ', X1, yOf(77) - 16, { size: 24, weight: 500, color: C.ink, align: 'right', display: true, alpha: lim * 0.8, track: 3 });
      }
      // Линията и точките.
      const pts = shown.map(p => ({ x: xOf(p.day), y: yOf(p.kg) }));
      if (pts.length > 1) {
        ctx.save();
        ctx.beginPath(); smooth(ctx, pts);
        ctx.lineWidth = 16; ctx.strokeStyle = hexA(C.accent, 0.12); ctx.lineJoin = 'round'; ctx.stroke();
        ctx.lineWidth = 5; ctx.strokeStyle = C.accent; ctx.stroke();
        ctx.restore();
      }
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = hexA(C.accentHi, 0.75); ctx.fill(); }
      if (pts.length) {
        const hp = pts[pts.length - 1];
        ctx.beginPath(); ctx.arc(hp.x, hp.y, 22, 0, Math.PI * 2); ctx.fillStyle = hexA(C.accent, 0.22); ctx.fill();
        ctx.beginPath(); ctx.arc(hp.x, hp.y, 11, 0, Math.PI * 2); ctx.fillStyle = C.accentHi; ctx.fill();
      }
    });

    // Отчетът отгоре: дата, тегло, разлика от старта.
    kicker(ctx, 'ВСЯКА СУТРИН НА КАНТАРА', 540, 300, a);
    text(ctx, cur.label, 140, 470, { size: 64, weight: 500, display: true, color: C.soft, alpha: a });
    text(ctx, `${kgStr(cur.kg)} кг`, 140, 610, { size: 132, weight: 600, display: true, color: C.ink, alpha: a });
    const delta = cur.kg - PTS[0].kg;
    text(ctx, Math.abs(delta) < 0.05 ? '±0' : delta < 0 ? `−${kg1(-delta)} кг` : `+${kg1(delta)} кг`, 940, 610, { size: 72, weight: 500, display: true, color: C.accent, align: 'right', alpha: a });
    text(ctx, `${shown.length} мерения`, 940, 470, { size: 40, weight: 400, color: C.soft, align: 'right', alpha: a });
    // Подписът отдолу.
    const cap = seg(t, 6.6, 7.2) * cOut;
    if (cap > 0) text(ctx, '9 седмици. 56 сутрешни мерения.', 540, 1480, { size: 44, weight: 500, color: C.ink, align: 'center', alpha: cap });
  }

  /* ════ 3 · Пиковата седмица ════ */
  const pIn = seg(t, 8.5, 8.9), pOut = 1 - seg(t, 10.9, 11.3);
  if (pIn > 0 && pOut > 0) {
    const a = pIn * pOut;
    kicker(ctx, 'ПИКОВА СЕДМИЦА · 14.09', 540, 520, a);
    textIn(ctx, 'Три мерения на ден', 540, 640, seg(t, 8.6, 9.3), { size: 72, weight: 600, display: true, color: C.ink, align: 'center', alpha: pOut });
    const rows = [['Сутрин', 73.75], ['След тренировка', 75.0], ['Вечер', 74.85]];
    rows.forEach(([lab, v], i) => {
      const p = E.outCubic(seg(t, 9.1 + i * 0.35, 9.6 + i * 0.35)) * pOut;
      if (p <= 0) return;
      const y = 800 + i * 190;
      px(ctx, () => {
        ctx.globalAlpha = p;
        roundRect(ctx, 110, y, 860, 150, 20);
        ctx.fillStyle = hexA(C.accent, 0.07); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = hexA(C.accent, 0.35); ctx.stroke();
        // Лента: колко е над сутрешното, мащаб 0–1,5 кг.
        const over = (v - 73.75) / 1.5;
        roundRect(ctx, 150, y + 112, 780 * clamp(0.04 + over) * E.outCubic(seg(t, 9.3 + i * 0.35, 9.9 + i * 0.35)), 10, 5);
        ctx.fillStyle = C.accent; ctx.fill();
      });
      text(ctx, lab, 150, y + 78, { size: 40, weight: 500, color: C.soft, alpha: p });
      text(ctx, `${kgStr(v)} кг`, 930, y + 84, { size: 64, weight: 600, display: true, color: C.ink, align: 'right', alpha: p });
    });
    const cap = seg(t, 10.2, 10.6) * pOut;
    if (cap > 0) text(ctx, 'Водата се вижда в числата.', 540, 1460, { size: 44, weight: 500, color: C.ink, align: 'center', alpha: cap });
  }

  /* ════ 4 · Сцената ════ */
  const sIn = seg(t, 11.1, 11.5), sOut = 1 - seg(t, 12.6, 12.95);
  if (sIn > 0 && sOut > 0) {
    const a = sIn * sOut;
    // Прожектор: конус светлина отгоре.
    px(ctx, () => {
      ctx.globalAlpha = a * 0.55;
      const g = ctx.createLinearGradient(0, 0, 0, 1500);
      g.addColorStop(0, hexA(C.accentHi, 0.55)); g.addColorStop(1, hexA(C.accentHi, 0));
      ctx.fillStyle = g;
      const spread = 140 + 260 * E.outCubic(seg(t, 11.1, 11.9));
      ctx.beginPath(); ctx.moveTo(470, 0); ctx.lineTo(610, 0); ctx.lineTo(540 + spread * 2.2, 1500); ctx.lineTo(540 - spread * 2.2, 1500); ctx.closePath(); ctx.fill();
    });
    kicker(ctx, 'ВАРНА · 13:15', 540, 760, a);
    textIn(ctx, '20.09', 540, 980, seg(t, 11.2, 11.9), { size: 230, weight: 600, display: true, color: C.ink, align: 'center', alpha: sOut });
    text(ctx, 'СЦЕНАТА', 540, 1100, { size: 64, weight: 500, display: true, color: C.accent, align: 'center', alpha: a * seg(t, 11.6, 12.0), track: 14 });
    text(ctx, 'Същата система, която ползват клиентите ми.', 540, 1260, { size: 40, weight: 400, color: C.soft, align: 'center', alpha: a * seg(t, 11.9, 12.3) });
  }

  /* ════ 5 · Знакът ════ */
  const lIn = seg(t, 12.8, 13.5);
  if (lIn > 0) {
    const e = E.outCubic(lIn);
    const img = ARM.img;
    if (img && img.width) {
      const h = 520, w = h * img.width / img.height, cy = 760;
      px(ctx, () => {   // лявата ръка
        ctx.globalAlpha = e;
        ctx.drawImage(img, 70 - (1 - e) * 160, cy - h / 2, w, h);
      });
      px(ctx, () => {   // дясната — огледална
        ctx.globalAlpha = e;
        ctx.translate(1010 + (1 - e) * 160, cy - h / 2); ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, w, h);
      });
    }
    textIn(ctx, 'BLAG', 540, 760, seg(t, 13.0, 13.6), { size: 150, weight: 600, display: true, color: C.accent, align: 'center', track: 10 });
    textIn(ctx, 'COACHING', 540, 860, seg(t, 13.2, 13.8), { size: 64, weight: 500, display: true, color: C.accent, align: 'center', track: 12 });
    px(ctx, () => {
      const lw = 140 * E.outCubic(seg(t, 13.6, 14.0));
      ctx.fillStyle = hexA(C.accent, 0.8); ctx.fillRect(540 - lw / 2, 920, lw, 3);
    });
    text(ctx, 'BE BLAG, BE BETTER', 540, 1020, { size: 40, weight: 500, display: true, color: C.soft, align: 'center', track: 8, alpha: seg(t, 13.8, 14.2) });
    text(ctx, 'blag-coaching.com', 540, 1180, { size: 40, weight: 400, color: C.accent, align: 'center', alpha: seg(t, 14.0, 14.4) });
  }

  const fi = 1 - seg(t, 0, 0.35);
  if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, W, H); }
}
