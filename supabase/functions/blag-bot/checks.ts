/* Проверките върху чистите функции на бота.
 *
 * Ситото, разчитането и отделянето на източниците са три места, които могат да
 * се счупят тихо: ботът продължава да отговаря, само че вписването с думи спира
 * да се задейства или „откъде знам" изчезва. Нито едно от трите не се вижда в
 * приложението, защото приложението просто получава по-малко.
 *
 * Пуска се с:
 *   npx deno run --allow-read supabase/functions/blag-bot/checks.ts
 *
 * Функциите се изрязват от самия index.ts, а не се преписват тук: така се
 * проверява това, което е пуснато на живо.
 */
// Ситото и разчитането, проверени срещу изречения, които човек наистина пише.
const src = await Deno.readTextFile('supabase/functions/blag-bot/index.ts')

// Двете функции се изрязват от самата функция и се пускат тук: така се
// проверява това, което е пуснато на живо, а не копие от него.
const cut = (name: string) => {
  const i = src.indexOf(`function ${name}(`)
  if (i < 0) throw new Error('няма ' + name)
  let depth = 0, j = src.indexOf('{', i)
  const start = i
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(start, k + 1) }
  }
  throw new Error('незатворена ' + name)
}

const body = cut('looksLikeLog').replace(': string', '') + '\n' +
             cut('parseItems').replace(': string | null', '')
             .replace(/: Record<string, unknown>/g, '')
             .replace(/: \{ name: string; kcal: number \}/g, '')
const mod = new Function(body + '\nreturn { looksLikeLog, parseItems }')()

const вписване = [
  'изядох 200 г извара',
  'хапнах две филии с масло',
  'изпих протеинов шейк',
  'закусих овесени ядки с банан',
  'впиши 150 г пилешко',
  '3 яйца и филия',
  'вечерях 300 г риба с ориз',
]
const въпрос = [
  'колко ми остават калории',
  'какво да ям за вечеря',
  'да ям ли още протеин днес?',
  'защо теглото ми стои',
  'как беше с тренировката',
  'мога ли да хапна сладко',
]

let лошо = 0
for (const q of вписване) {
  if (!mod.looksLikeLog(q)) { console.log('ПРОПУСНАТО:', q); лошо++ }
}
for (const q of въпрос) {
  if (mod.looksLikeLog(q)) { console.log('ХВАНАТО НАПРАЗНО:', q); лошо++ }
}

// Разчитането: JSON с ограда от код, боклук, празен списък.
const ok = mod.parseItems('```json\n{"items":[{"name":"извара","grams":200,"kcal":180,"protein":28,"carbs":8,"fat":4,"meal":"breakfast","approx":false}]}\n```')
if (ok.length !== 1 || ok[0].kcal !== 180 || ok[0].approx !== false) { console.log('ОГРАДА:', JSON.stringify(ok)); лошо++ }
if (mod.parseItems('не съм сигурен').length !== 0) { console.log('БОКЛУК минава'); лошо++ }
if (mod.parseItems('{"items":[]}').length !== 0) { console.log('ПРАЗЕН не е празен'); лошо++ }
const bad = mod.parseItems('{"items":[{"name":"х","grams":-5,"kcal":0,"protein":1,"carbs":1,"fat":1}]}')
if (bad.length !== 0) { console.log('РЕД БЕЗ КАЛОРИИ минава:', JSON.stringify(bad)); лошо++ }
const many = mod.parseItems('{"items":' + JSON.stringify(Array.from({ length: 9 }, () => ({ name: 'х', grams: 1, kcal: 1, protein: 0, carbs: 0, fat: 0 }))) + '}')
if (many.length !== 6) { console.log('ТАВАНЪТ не се спазва:', many.length); лошо++ }

/* Типовете се махат наедро: тук се проверява логиката, а тя е една и същата
   с и без тях. */
const bodyS = cut('splitSources')
  .replace(/\(text: string, context: Record<string, unknown>\)/, '(text, context)')
  .replace(/\(k: string\)/g, '(k)')
  .replace(/ as string\[\]/g, '')
  .replace(/ as Record<string, unknown>/g, '')
const splitSources = new Function(bodyS + '\nreturn splitSources')()

const данни = {
  днес: { kcal: 1482, хранения: ['овес 80г'] },
  тегло: ['2026-09-10: 84 кг'],
  вода: [],
  сън: ['2026-09-11: 7ч'],
  подготовка: null,
}

const проба = (име: string, вход: string, текст: string, изт: string[]) => {
  const r = splitSources(вход, данни)
  if (r.reply !== текст || JSON.stringify(r.sources) !== JSON.stringify(изт)) {
    console.log('ГРЕШКА', име, JSON.stringify(r))
    лошо++
  }
}

проба('прост', 'Днес си на 1482 ккал.\nИЗТОЧНИК: днес', 'Днес си на 1482 ккал.', ['днес'])
проба('няколко', 'Тежиш 84 кг.\nИЗТОЧНИК: тегло, днес', 'Тежиш 84 кг.', ['тегло', 'днес'])
// Празен раздел не е източник: „от водата" при нула вписвания е точно
// твърдението, което ботът не бива да прави.
проба('празен', 'Пиеш малко.\nИЗТОЧНИК: вода', 'Пиеш малко.', [])
// Измислен раздел се изхвърля.
проба('измислен', 'Спиш зле.\nИЗТОЧНИК: сън, кръвни_изследвания', 'Спиш зле.', ['сън'])
проба('null раздел', 'Няма.\nИЗТОЧНИК: подготовка', 'Няма.', [])
проба('без ред', 'Пиши на Николай за това.', 'Пиши на Николай за това.', [])
проба('повторение', 'Х.\nИЗТОЧНИК: днес, днес', 'Х.', ['днес'])
проба('точка накрая', 'Х.\nИЗТОЧНИК: днес.', 'Х.', ['днес'])
проба('малки букви', 'Х.\nизточник: днес', 'Х.', ['днес'])

console.log(лошо === 0 ? 'всичко минава' : `грешки: ${лошо}`)
