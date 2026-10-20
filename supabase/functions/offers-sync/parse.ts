/**
 * Чистата част на офертите: разчитане на страниците и класификация.
 *
 * Нищо тук не говори с мрежата или с базата — получава текст, връща редове.
 * Затова се проверява от checks.ts със същия код, който е пуснат на живо.
 *
 * Макросите не идват от модел: всеки продукт се разпознава по името си срещу
 * таблицата FOODS по-долу и взима нейните стойности на 100 г. Това, което не
 * се разпознае, просто не влиза — по-добре липсваща оферта, отколкото
 * измислени грамове протеин.
 */

export type Store = 'lidl' | 'kaufland'
export type Macro = 'protein' | 'carbs' | 'fat'

/** Каквото дава магазинът, преди да е класифицирано. */
export interface RawOffer {
  store: Store
  ext_id: string
  name: string
  detail: string | null
  pack: string | null
  price: number
  old_price: number | null
  valid_from: string        // YYYY-MM-DD
  valid_to: string
  url: string | null
  image: string | null
}

/** Каквото се записва в store_offers. */
export interface Offer extends RawOffer {
  grams: number | null
  food: string
  macro: Macro | null
  produce: boolean
  kcal: number
  protein: number
  carbs: number
  fat: number
  per_eur: number | null    // грамове от `macro` за 1 €
}

// ─── Храните ──────────────────────────────────────────────────────────────────
//
// Стойностите са на 100 г, суровo, за обичайния вариант на продукта в
// българския магазин. Редът има значение: първото съвпадение печели, затова
// по-тесните са преди по-широките („пилешко филе" преди „пиле", „фъстъчено
// масло" преди „масло").
//
// `per` е теглото на една бройка, за продуктите, които се продават на брой
// (яйцата) — без него „10 бр." няма как да стане грамове.

interface Food {
  re: RegExp
  food: string
  kcal: number; p: number; c: number; f: number
  produce?: boolean
  per?: number
}

const F = (re: RegExp, food: string, kcal: number, p: number, c: number, f: number, extra: Partial<Food> = {}): Food =>
  ({ re, food, kcal, p, c, f, ...extra })

const FOODS: Food[] = [
  // Птиче
  F(/пилеш\S* (гърд|филе|филенц|шницел)/, 'Пилешко филе', 110, 23, 0, 1.5),
  F(/пуешк\S* (филе|гърд|шницел)/, 'Пуешко филе', 105, 24, 0, 1),
  F(/пилеш\S* (бут|подбедр|бедр|горн|долн)/, 'Пилешки бут', 175, 18, 0, 11),
  F(/пилеш\S* крил/, 'Пилешки крилца', 210, 18, 0, 15),
  F(/пилеш\S* (дроб|сърц|воденич)/, 'Пилешки дреболии', 125, 18, 1, 5),
  F(/(^|\s)(пиле|бройлер)(\s|$)|пилешк\S* грил/, 'Пиле', 190, 18, 0, 13),
  F(/пуешк\S* (бут|бедр|крил)/, 'Пуешки бут', 145, 19, 0, 7),
  F(/пъдпъд/, 'Пъдпъдък', 190, 20, 0, 12),

  // Червено месо
  F(/телешк\S* (кайма|мляно)/, 'Телешка кайма', 215, 19, 0, 15),
  F(/телешк\S* (шол|филе|контрафиле|месо|бут|рибиц)/, 'Телешко месо', 150, 21, 0, 7),
  F(/свинск\S* (бон филе|филе|шол|контрафиле)/, 'Свинско филе', 140, 22, 0, 6),
  F(/свинск\S* (кайма|мляно)|кайма от свинско/, 'Свинска кайма', 260, 17, 0, 21),
  F(/свинск\S* (врат|каре|плешк|бут)|свински врат/, 'Свинско месо', 230, 18, 0, 17),
  F(/агнешк\S* (месо|бут|плешк|котлет|каре)/, 'Агнешко месо', 230, 17, 0, 18),
  F(/кайма/, 'Кайма смес', 240, 17, 0, 19),
  F(/шкембе/, 'Шкембе', 95, 15, 0, 4),
  F(/шунка/, 'Шунка', 120, 18, 2, 4),

  // Риба
  F(/риба тон.*(олио|масло)/, 'Риба тон в олио', 190, 26, 0, 9),
  F(/риба тон|(^|\s)тон(\s|$)|жълтоперест/, 'Риба тон', 115, 26, 0, 1),
  F(/сьомга/, 'Сьомга', 200, 20, 0, 13),
  F(/скумрия/, 'Скумрия', 205, 19, 0, 14),
  F(/пъстърва/, 'Пъстърва', 140, 20, 0, 7),
  F(/сардин/, 'Сардини', 210, 24, 0, 12),
  F(/(хек|мерлуза|треска|минтай|пангасиус|тилапия|бяла риба)/, 'Бяла риба', 85, 18, 0, 1),
  F(/скариди/, 'Скариди', 85, 18, 0, 1),
  F(/(паламуд|аншоа|херинга|цаца|сафрид)/, 'Риба', 200, 20, 0, 13),

  // Мляко и яйца
  F(/извара.{0,25}(обезмасл|0[.,]\d\s?%|\b0\s?%)|(обезмасл|0[.,]\d\s?%).{0,25}извара/, 'Обезмаслена извара', 70, 12, 3.5, 0.5),
  F(/извара/, 'Извара', 100, 12, 3, 4),
  F(/(скир|skyr|протеинов\S* (кисело|йогурт|пудинг)|high protein)/, 'Протеиново кисело мляко', 65, 11, 4, 0.2),
  F(/(котидж|cottage)/, 'Котидж сирене', 98, 11, 3.4, 4.3),
  F(/гръцк\S* (кисело|йогурт)/, 'Гръцко кисело мляко', 100, 7, 4, 6),
  F(/кисело мляко|йогурт|кефир/, 'Кисело мляко', 60, 3.4, 4.5, 3),
  F(/прясно мляко|(^|\s)мляко(\s|$)/, 'Прясно мляко', 60, 3.3, 4.8, 3),
  F(/яйц[ае]/, 'Яйца', 145, 12.5, 0.7, 10, { per: 60 }),
  F(/моцарела/, 'Моцарела', 250, 18, 2, 19),
  F(/пармезан|грана падано/, 'Пармезан', 400, 33, 0, 29),
  F(/(кашкавал|гауда|едам(?!аме)|чедър|ементал|трапист)/, 'Кашкавал', 350, 25, 1, 27),
  F(/сирене|фета/, 'Сирене', 260, 16, 1, 21),
  F(/(сметана|заквасена)/, 'Сметана', 200, 2.5, 3, 20),

  // Мазнини
  F(/фъстъчено масло|фъстъчен тахан/, 'Фъстъчено масло', 600, 25, 15, 50),
  F(/тахан/, 'Тахан', 600, 18, 20, 53),
  F(/зехтин|маслиново масло/, 'Зехтин', 900, 0, 0, 100),
  F(/(слънчогледово|рапично|царевично) (масло|олио)|(^|\s)олио/, 'Олио', 900, 0, 0, 100),
  F(/краве масло|масло краве|(^|\s)масло(\s|$)/, 'Краве масло', 740, 0.7, 0.6, 82),
  /* Преди ядките: „овесени ядки" не са ядки. */
  F(/(овесени|овес)/, 'Овесени ядки', 375, 13, 60, 7),
  F(/(бадем|орех|лешник|кашу|шам фъстък|фъстъ|ядки|макадамия|пекан)/, 'Ядки', 600, 20, 15, 52),
  F(/((?<!без )семки|(^|\s)чиа|ленено семе|сусам)/, 'Семена', 560, 22, 15, 47),
  F(/маслини/, 'Маслини', 145, 1, 4, 15),
  F(/авокадо/, 'Авокадо', 160, 2, 9, 15, { produce: true }),

  // Въглехидрати
  F(/(ориз|оризов)/, 'Ориз', 355, 7, 78, 0.6),
  F(/(паста|спагети|макарон|пене|фузили|чифери|фиде|талиатели|лазаня|фарфале|тортелини|кус кус|кускус|булгур)/, 'Паста', 355, 12, 71, 1.5),
  F(/киноа/, 'Киноа', 370, 14, 64, 6),
  F(/(леща|нахут|(^|\s)боб(\s|$)|зрял боб)/, 'Бобови', 340, 24, 55, 1.5),
  F(/(хляб|питка|багета|франзела|земел|лаваш|тортил|пълнозърнест)/, 'Хляб', 250, 8, 48, 2.5),
  F(/(мюсли|корнфлейкс|зърнена закуска)/, 'Зърнена закуска', 380, 9, 70, 6),
  F(/(сладки картофи|батат)/, 'Сладки картофи', 86, 1.6, 20, 0.1, { produce: true }),
  F(/картоф/, 'Картофи', 77, 2, 17, 0.1, { produce: true }),

  // Плодове и зеленчуци
  F(/банан/, 'Банани', 90, 1.1, 23, 0.3, { produce: true }),
  F(/(ябълк|круш|портокал|мандарин|лимон|грейпфрут|грозде|боровинк|ягод|малин|къпин|киви|манго|ананас|(^|\s)нар(\s|$)|праскови|кайсии|сливи|дин[яи]|пъпеш|череш|смокин)/, 'Плодове', 55, 0.7, 13, 0.2, { produce: true }),
  F(/(царевица)/, 'Царевица', 90, 3, 19, 1.2, { produce: true }),
  F(/(гъби|печурк|кладница)/, 'Гъби', 25, 3, 3, 0.3, { produce: true }),
  F(/(морков|домат|краставиц|корнишон|чушк|пипер|зеле|карфиол|броколи|спанак|айсберг|маруля|рукола|тиквичк|патладжан|(^|\s)лук(\s|$)|чесън|целина|цвекло|праз|копър|магданоз|репичк|аспержи|грах|зелен фасул)/, 'Зеленчуци', 30, 1.5, 5, 0.3, { produce: true }),
]

/* Каквото не е храна за дневника или е храна, чиито макроси зависят изцяло от
   рецептата. Проверява се преди FOODS: „паста за зъби" не е паста, „сладолед
   с бадеми" не е ядки, а „готово ястие с пилешко" не е пилешко филе. */
const NOT_FOOD = new RegExp([
  'шоколад', 'бонбон', 'бисквит', 'вафл', 'чипс', 'солен[кч]', 'снакс', 'крекер',
  'сладолед', 'торт(а|и|ичка|ички)(\\s|$)', 'кекс', 'кроасан', 'понич', 'баница', 'кифл', 'пица', 'десерт',
  'мъфин', 'гофрет', 'дражета', 'желирани', 'бар(\\s|$)', 'барче',
  'бира', 'вин[оа](\\s|$)', 'ракия', 'уиски', 'водка', 'джин', 'ликьор', 'ром(\\s|$)',
  'газиран', 'напитк', 'сок(\\s|$)', 'нектар', 'енергийн', 'кафе', '(^|\\s)чай', '(?<!без (добавена )?)захар', 'сироп',
  'конфитюр', 'лютеница', 'кетчуп', 'майонез', 'сос(\\s|$)', 'подправк', 'дресинг',
  'салам(?!урен)', 'луканка', 'суджук', 'наденица', 'кренвирш', 'шпек', 'пастет', 'кебапч', 'кюфт',
  'бургер', 'дюнер', 'готов', 'ястие', 'болонезе', 'карбонара', 'специалитет', 'сандвич', 'суши',
  'салата(?! айсберг)', 'донът', 'донат', '(?<!протеинов )пудинг', 'пръчици', 'тутманик', 'кашкавалка',
  'бутертесто', 'тесто', 'сладки(?! картофи)', 'глазур', 'шоко', 'kit kat', 'макарон(и)? микс', 'медальони',
  'мечета', 'бебешк', 'hipp', 'маргарин', 'брашно', 'слънцезащит', 'адаптирано', 'comfortis', 'сарми', 'пълнен', 'панира', 'хапки', 'наггетс', 'шницели? панир',
  'пелени', 'препарат', 'обезмаслител', 'почиств', 'уред', 'фолио', 'омекотител', 'прах за пране', 'боя', 'шампоан', 'душ гел', 'паста за зъби',
  'котк', 'куче', 'кучешк', 'котешк', 'за птици', 'растени', 'букет', 'саксия', 'семена за',
].join('|'))

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

export function classify(text: string): Food | null {
  const t = norm(text)
  if (!t || NOT_FOOD.test(t)) return null
  return FOODS.find(f => f.re.test(t)) ?? null
}

// ─── Грамовете ────────────────────────────────────────────────────────────────

/* Lidl понякога пише „g/onakoвka" с латински букви вътре — затова
   единиците са и на латиница, и на кирилица. Границата след единицата е
   „не следва буква", защото \b в JavaScript не познава кирилицата. */
const NUM = '(\\d+(?:[.,]\\d+)?)'
const END = '(?![a-zа-я])'
const RE_MULTI = new RegExp(`(\\d+)\\s*[xх×]\\s*${NUM}\\s*(г|гр|g|мл|ml)${END}`, 'i')
const RE_KG    = new RegExp(`${NUM}\\s*(кг|kg|л|l)${END}`, 'i')
const RE_G     = new RegExp(`${NUM}\\s*(г|гр|g|мл|ml)${END}`, 'i')
const RE_PCS   = new RegExp(`(\\d+)\\s*(бр|броя)`, 'i')
const RE_BARE  = new RegExp(`(^|[\\s/])(кг|kg|л|l)${END}`, 'i')

const num = (s: string) => parseFloat(s.replace(',', '.'))

export function gramsOf(text: string, per?: number): number | null {
  const t = norm(text)
  let m = t.match(RE_MULTI)
  if (m) return Math.round(num(m[1]) * num(m[2]))
  m = t.match(RE_KG)
  if (m) return Math.round(num(m[1]) * 1000)
  m = t.match(RE_G)
  if (m) return Math.round(num(m[1]))
  if (per) {
    m = t.match(RE_PCS)
    if (m) return num(m[1]) * per
  }
  if (RE_BARE.test(t)) return 1000
  return null
}

// ─── Сметката ─────────────────────────────────────────────────────────────────

/* Кой макрос продуктът носи, по калориите му — не по това как звучи.
   Сирене с 16 г протеин и 21 г мазнини е 25% протеин: мазнина е, не протеин.
   Прагът за протеин е по-нисък, защото това е, което хората търсят — яйцата
   (34%) трябва да влязат, свинският врат (31%) едва-едва. */
export function macroOf(f: { kcal: number; p: number; c: number; f: number }): Macro | null {
  if (!f.kcal) return null
  if ((4 * f.p) / f.kcal >= 0.30) return 'protein'
  if ((9 * f.f) / f.kcal >= 0.60) return 'fat'
  if ((4 * f.c) / f.kcal >= 0.50) return 'carbs'
  return null
}

const SANE_GRAMS = (g: number | null) => g !== null && g >= 10 && g <= 20000

export function enrich(raw: RawOffer): Offer | null {
  if (!(raw.price > 0)) return null
  const text = [raw.name, raw.detail, raw.pack].filter(Boolean).join(' ')
  const food = classify(text)
  if (!food) return null

  const g = gramsOf([raw.pack, raw.detail, raw.name].filter(Boolean).join(' '), food.per)
  const grams = SANE_GRAMS(g) ? g : null
  /* Зеленчуците влизат в своя списък, но не и в макросите — 30 kcal на 100 г
     не са източник на нищо, колкото и евтини да са. */
  const macro = food.produce && food.kcal < 80 ? null : macroOf(food)
  const of = macro === 'protein' ? food.p : macro === 'carbs' ? food.c : macro === 'fat' ? food.f : 0
  const per_eur = macro && grams ? Math.round((grams / 100) * of / raw.price * 10) / 10 : null

  return {
    ...raw,
    grams,
    food: food.food,
    macro,
    produce: !!food.produce,
    kcal: food.kcal, protein: food.p, carbs: food.c, fat: food.f,
    per_eur,
  }
}

// ─── Датите ───────────────────────────────────────────────────────────────────

export const iso = (d: Date) => d.toISOString().slice(0, 10)

/* „Валидно от 19.10. до 25.10." или „19.10.2026 - 25.10.2026". Годината,
   когато липсва, е тази, в която датата е най-близо до днес — иначе
   седмицата от 29.12. до 04.01. би завършила, преди да е почнала. */
export function datesIn(text: string, today: Date): [string, string] | null {
  const found = [...text.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/g)]
  if (!found.length) return null
  const at = (m: RegExpMatchArray) => {
    const d = +m[1], mo = +m[2]
    let y = m[3] ? +m[3] : today.getUTCFullYear()
    if (!m[3]) {
      const diff = mo - (today.getUTCMonth() + 1)
      if (diff > 6) y--
      else if (diff < -6) y++
    }
    return iso(new Date(Date.UTC(y, mo - 1, d)))
  }
  const from = at(found[0])
  const to = at(found[found.length > 1 ? 1 : 0])
  return to >= from ? [from, to] : [from, from]
}

/** Неделята на седмицата на `today` — когато страницата не казва до кога. */
export function weekEnd(today: Date) {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7))
  return iso(d)
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

export function decode(s: string) {
  return s
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&')
}

const text = (s: string | undefined) => (s ? decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '')

const price = (s: string | undefined) => {
  const m = s?.match(/(\d+(?:[.,]\d{1,2})?)/)
  return m ? num(m[1]) : NaN
}

// ─── Kaufland ─────────────────────────────────────────────────────────────────
//
// Една страница с всичко: секции по категория (`k-product-section`), във
// всяка заглавие, валидност и плочки (`k-product-tile`). Една и съща оферта
// стои и в „Актуални предложения", и в категорията си — пази се тази от
// категорията, защото там е валидността ѝ.

const KAUFLAND_GENERIC = /актуални предложения|всички оферти/i
const KAUFLAND_NOT_FOOD = /дрогерия|домашни потреби|ел\. уреди|текстил|алкохол|уиски|kaufland card/i

export function parseKaufland(html: string, today: Date): RawOffer[] {
  const out = new Map<string, RawOffer & { generic: boolean }>()
  const sections = html.split(/<div class="k-product-section[\s"]/).slice(1)

  for (const sec of sections) {
    const head = text(sec.match(/k-product-section__headline[^>]*>([\s\S]*?)<\/h2>/)?.[1])
    const sub  = text(sec.match(/k-product-section__subheadline[^>]*>([\s\S]*?)<\/div>/)?.[1])
    if (KAUFLAND_NOT_FOOD.test(head)) continue
    const generic = KAUFLAND_GENERIC.test(head)
    const [from, to] = datesIn(`${head} ${sub}`, today) ?? [iso(today), weekEnd(today)]

    for (const tile of sec.split('<a class="k-product-tile"').slice(1)) {
      const title = text(tile.match(/k-product-tile__title">([\s\S]*?)<\/div>/)?.[1])
      const subRaw = tile.match(/k-product-tile__subtitle">([\s\S]*?)<\/div>/)?.[1] ?? ''
      const subtitle = text(subRaw)
      const subFirst = text(subRaw.split('\n')[0])
      const unit = text(tile.match(/k-product-tile__unit-price">([\s\S]*?)<\/div>/)?.[1])
      const p = price(text(tile.match(/k-price-tag__price">([\s\S]*?)<\/div>/)?.[1]))
      const old = price(text(tile.match(/k-price-tag__old-price-line-through">([\s\S]*?)<\/span>/)?.[1]))
      const image = tile.match(/k-product-tile__main-image" src="([^"]+)"/)?.[1] ?? null
      if (!title || !Number.isFinite(p)) continue

      /* Понякога заглавието е марката, а продуктът е в подзаглавието („Брей! /
         Краставици", „Шеф месар / Телешко мляно месо"), понякога обратно
         („Моркови / Клас: I"). Името е онова от двете, което се разпознава
         като храна; марката остава до него. */
      const brandFirst = !!subFirst && !classify(title) && !!classify(subFirst)
      const name = brandFirst ? subFirst : title
      const detail = brandFirst ? title : (subtitle || null)

      const key = `${title}|${subtitle}|${unit}`.toLowerCase()
      const prev = out.get(key)
      if (prev && !prev.generic) continue
      out.set(key, {
        store: 'kaufland',
        ext_id: key.slice(0, 200),
        name, detail, pack: unit || null,
        price: p, old_price: Number.isFinite(old) && old > p ? old : null,
        valid_from: from, valid_to: to,
        url: 'https://www.kaufland.bg/aktualni-predlozheniya/oferti.html',
        image, generic,
      })
    }
  }
  return [...out.values()].map(({ generic: _, ...o }) => o)
}

// ─── Lidl ─────────────────────────────────────────────────────────────────────
//
// Офертите са разпръснати по страници на кампании (/c/<име>/a<номер>), а
// началната страница води към всички тях. На всяка страница всеки продукт
// носи целия си запис като JSON в `data-grid-data`.

export function lidlCampaigns(html: string): string[] {
  const links = [...html.matchAll(/href="(\/c\/[a-z0-9-]+\/a\d+)"/g)].map(m => m[1])
  return [...new Set(links)]
}

const sofiaDate = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' })

export function parseLidl(html: string, today: Date): RawOffer[] {
  const out: RawOffer[] = []
  for (const m of html.matchAll(/data-grid-data="([^"]+)"/g)) {
    // deno-lint-ignore no-explicit-any
    let d: any
    try { d = JSON.parse(decode(m[1])) } catch { continue }
    if (!d?.productId || !d?.price?.price) continue
    const world = d.keyfacts?.wonCategoryPrimary ?? ''
    if (world && !/Храна/.test(world)) continue

    const brand = d.brand?.showBrand ? d.brand?.name : null
    out.push({
      store: 'lidl',
      ext_id: String(d.productId),
      name: d.title || d.fullTitle,
      detail: brand ?? null,
      pack: d.price?.packaging?.text ?? null,
      price: +d.price.price,
      old_price: d.price.oldPrice && +d.price.oldPrice > +d.price.price ? +d.price.oldPrice : null,
      valid_from: d.storeStartDate ? sofiaDate(d.storeStartDate) : iso(today),
      valid_to: d.storeEndDate ? sofiaDate(d.storeEndDate) : weekEnd(today),
      url: d.canonicalUrl ? 'https://www.lidl.bg' + d.canonicalUrl : null,
      image: d.image ?? null,
    })
  }
  return out
}

/** Един ред на оферта: един продукт се среща на няколко страници на Lidl. */
export function unique<T extends RawOffer>(rows: T[]): T[] {
  const seen = new Map<string, T>()
  for (const r of rows) seen.set(`${r.store}|${r.ext_id}|${r.valid_from}`, r)
  return [...seen.values()]
}
