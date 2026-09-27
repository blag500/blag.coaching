/**
 * Прави публичната страница на Чийт Код от източника ѝ.
 *
 *   node scripts/build-cheatcode.mjs            # cheatcode/page.html → public/cheatcode/
 *   node scripts/build-cheatcode.mjs <друг.html>
 *
 * Източникът е `cheatcode/page.html` — тялото на страницата без обвивка.
 * Дълго време той живееше като артефакт в Claude и се пренасяше на ръка;
 * оттогава остана разделението, но вече и двете са в repo-то.
 *
 * Разликите между източника и изхода са три и всичките са тук, а не в
 * нечия памет:
 *   1. Източникът няма <!doctype>, <head> и charset — тук се слагат.
 *   2. Снимките се сервират от /cheatcode/, не от съседния файл.
 *   3. Страницата е проба: noindex плюс ред, който го казва на човек.
 *
 * Снимките живеят направо в `public/cheatcode/` и не се копират — само се
 * проверява, че всяка, която страницата иска, наистина е там.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] || 'cheatcode/page.html';
const OUT_DIR = 'public/cheatcode';

let s = readFileSync(SRC, 'utf8');

/* Снимките идват от папката, в която живее страницата. Без наклонената черта
   отпред относителният път се мери спрямо /cheatcode без наклонена и снимките
   се търсят в корена. */
const wanted = new Set();
s = s.replace(/'([\w-]+\.jpe?g)'/g, (_, f) => { wanted.add(f); return `'/cheatcode/${f}'`; });
s = s.replace(/src="([\w-]+\.jpe?g)"/g, (_, f) => { wanted.add(f); return `src="/cheatcode/${f}"`; });

/* Ред, който казва на човека какво гледа. */
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
  '<meta name="theme-color" content="#141C18">\n' +
  /* Самостоятелната страница няма нулиращ стил отникъде. [hidden] е
     задължителното: display:grid го бие иначе. */
  '<style>*,*::before,*::after{box-sizing:border-box}img{max-width:100%}' +
  '[hidden]{display:none!important}html{color-scheme:dark light}body{margin:0}</style>\n';

const bodyAt = s.indexOf('<div class="wrap">');
const out = head + s.slice(0, bodyAt) + '</head>\n<body>\n' + s.slice(bodyAt) + '\n</body>\n</html>\n';

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), out);

console.log(`${OUT_DIR}/index.html — ${(out.length / 1024).toFixed(1)} KB, заглавие „${title}", ${wanted.size} снимки`);

const missing = [...wanted].filter((f) => !existsSync(join(OUT_DIR, f)));
if (missing.length) {
  console.error(`ЛИПСВАТ в ${OUT_DIR}: ${missing.join(', ')}`);
  process.exitCode = 1;
}
