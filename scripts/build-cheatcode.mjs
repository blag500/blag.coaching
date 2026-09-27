/**
 * Прави публичната страница на Чийт Код от артефакта.
 *
 * Артефактът е източникът: той се пише и гледа, а `/cheatcode` е това, което
 * излиза навън. Дотук двете се разминаваха, защото всяка промяна се пренасяше
 * на ръка — тринайсет версии разлика в един ден. Оттук нататък:
 *
 *   node scripts/build-cheatcode.mjs <път-до-артефакта.html>
 *
 * Разликите между двете са три и всичките са тук, а не в нечия памет:
 *   1. Артефактът няма <!doctype>, <head> и charset — обвивката му ги слага.
 *   2. Снимките се сервират от /cheatcode/, не от съседния файл.
 *   3. Страницата е проба: noindex плюс ред, който го казва на човек.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('Употреба: node scripts/build-cheatcode.mjs <артефакт.html>');
  process.exit(1);
}

const OUT_DIR = 'public/cheatcode';
const PHOTOS = [
  'yagodi.jpg', 'banan.jpg', 'protein.jpg', 'kakao.jpg', 'kayma.jpg',
  'gris.jpg', 'gris-banan.jpg', 'gris-biskviti.jpg', 'gris-oba.jpg',
];

/* Разновидностите на гриса са четири снимки, а заснети са две. Липсващата се
   замества с най-близката, вместо да остави счупено квадратче: страницата
   работи, а денят, в който истинската влезе в папката, я изважда от тук сама.
   Заместникът е близък, но не е верен — затова се изписва при всяко пускане. */
const STAND_IN = {
  'gris.jpg': 'gris-banan.jpg',          // чистият грис още не е сниман
  'gris-biskviti.jpg': 'gris-oba.jpg',   // нито само с бисквити
};

let s = readFileSync(src, 'utf8');

/* Снимките идват от папката, в която живее страницата. Без наклонената черта
   отпред относителният път се мери спрямо /cheatcode без наклонена и снимките
   се търсят в корена. */
for (const f of PHOTOS) {
  s = s.replaceAll(`'${f}'`, `'/cheatcode/${f}'`);
  s = s.replaceAll(`src="${f}"`, `src="/cheatcode/${f}"`);
}

/* Ред, който казва на човека какво гледа. Артефактът е за преглед вътре;
   това е адрес, на който може да попадне някой отвън. */
const notice =
  '  <p class="foot">Пробна страница. Още не приемаме поръчки — бутонът само ' +
  'показва какво би отишло в кутията.</p>\n';
s = s.replace('</div>\n\n<div class="order">', notice + '</div>\n\n<div class="order">');

const title = (s.match(/<title>([^<]*)<\/title>/) || [, 'Чийт Код'])[1];

const head =
  '<!doctype html>\n<html lang="bg">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="robots" content="noindex, nofollow">\n' +
  '<meta name="description" content="Конфигурируемо ястие — избираш грамажа, макросите се смятат.">\n' +
  '<meta name="theme-color" content="#101613">\n' +
  /* Обвивката на артефакта носи свой нулиращ стил; самостоятелната страница
     няма такава. [hidden] е задължителното: display:grid го бие иначе. */
  '<style>*,*::before,*::after{box-sizing:border-box}img{max-width:100%}' +
  '[hidden]{display:none!important}html{color-scheme:dark light}body{margin:0}</style>\n';

const bodyAt = s.indexOf('<div class="wrap">');
const out = head + s.slice(0, bodyAt) + '</head>\n<body>\n' + s.slice(bodyAt) + '\n</body>\n</html>\n';

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), out);

const srcDir = dirname(src);
let copied = 0;
const borrowed = [];
for (const f of PHOTOS) {
  let from = join(srcDir, f);
  let own = existsSync(from);
  if (!own && STAND_IN[f]) {
    from = join(srcDir, STAND_IN[f]);
    if (existsSync(from)) { borrowed.push(`${f} ← ${STAND_IN[f]}`); own = true; }
  }
  if (own) { copyFileSync(from, join(OUT_DIR, f)); copied++; }
  else console.warn(`липсва снимка: ${basename(join(srcDir, f))}`);
}

console.log(`${OUT_DIR}/index.html — ${(out.length / 1024).toFixed(1)} KB, заглавие „${title}", ${copied} снимки`);
for (const b of borrowed) console.warn(`временна снимка: ${b}`);
