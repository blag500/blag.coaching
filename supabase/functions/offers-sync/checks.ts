/* Проверките върху разчитането на офертите.
 *
 * Три неща могат да се счупят тихо: разпознаването (пастата за зъби става
 * паста, сладоледът с бадеми — ядки), грамовете („2 x 150 г" става 2 г) и
 * самите страници (магазинът сменя разметката и функцията вижда нула).
 * Приложението и в трите случая просто показва по-малко.
 *
 * Пуска се с:
 *   npx deno run supabase/functions/offers-sync/checks.ts
 *
 * Внася се самият parse.ts — проверява се това, което е пуснато на живо.
 * Парчетата HTML са преписани от истинските страници на 20.10.2026.
 */
import { classify, datesIn, enrich, gramsOf, lidlCampaigns, parseKaufland, parseLidl } from './parse.ts'

let bad = 0
const eq = (what: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) { bad++; console.log(`✗ ${what}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`) }
}

// ─── Разпознаване ─────────────────────────────────────────────────────────────

const foods: [string, string | null][] = [
  ['Прясно пилешко филе', 'Пилешко филе'],
  ['ПОРЦИЯ СВЕЖЕСТ Прясна пилешка подбедрица XXL', 'Пилешки бут'],
  ['Прясно пуешко филе', 'Пуешко филе'],
  ['Телешко мляно месо', 'Телешка кайма'],
  ['Кайма от свинско месо от свежата витрина', 'Свинска кайма'],
  ['PILOS Обезмаслена извара', 'Обезмаслена извара'],
  ['Извара 250 г', 'Извара'],
  ['Яйца размер M', 'Яйца'],
  ['ЗЛАТНО ДОБРУДЖАНСКО Слънчогледово масло', 'Олио'],
  ['Фъстъчено масло', 'Фъстъчено масло'],
  ['Краве масло 82%', 'Краве масло'],
  ['K-Classic Кашу сурово', 'Ядки'],
  ['COMBINO Чифери', 'Паста'],
  ['Овесени ядки', 'Овесени ядки'],
  ['Моркови', 'Зеленчуци'],
  ['Мандарини', 'Плодове'],
  ['Картофи мити', 'Картофи'],
  ['Сладки картофи', 'Сладки картофи'],
  ['Пълнозърнести тортили', 'Хляб'],
  ['Кисело мляко без добавена захар', 'Кисело мляко'],
  ['Риба тон в слънчогледово олио', 'Риба тон в олио'],
  // Не са храна за дневника
  ['Паста за зъби', null],
  ['Сладолед с бадеми', null],
  ['CHEF SELECT Готово ястие с пилешко', null],
  ['Протеинов бар', null],
  ['МЛЕЧЕН Шоколад', null],
  ['Боя за коса', null],
  ['Храна за котки с пилешко', null],
  ['Салам Камчия', null],
  ['Живкови Салата Италианска', null],
  ['TUBORG Бира', null],
  // Грешките от първото пускане срещу истинските страници, 20.10.2026
  ['Алуминиево фолио', null],
  ['Грозде микс без семки', 'Плодове'],
  ['Тиквени семки', 'Семена'],
  ['Маслиново масло', 'Зехтин'],
  ['Едамаме', null],
  ['Кашкавалка', null],
  ['Донът с шамфъстък', null],
  ['Сладки с бадеми', null],
  ['Сьомга в бутертесто', null],
  ['Салата херинга с пресен копър', null],
  ['Аншоа маринована в олио', 'Риба'],
  ['Пушен паламуд в растително масло', 'Риба'],
  ['Високопротеинов пудинг със сметана', 'Протеиново кисело мляко'],
  ['Пудинг със сметана', null],
  ['Зърнена закуска NESTLE KIT KAT', null],
  ['Медикс Обезмаслител портокал', null],
  ['Салата Айсберг', 'Зеленчуци'],
  ['Брашно от лимец пълнозърнесто', null],
  ['Бяло саламурено сирене', 'Сирене'],
  ['Агнешки бут пресен', 'Агнешко месо'],
  ['Пуешки бут от свежата витрина', 'Пуешки бут'],
  ['Прясно пилешко бедро XXL', 'Пилешки бут'],
  ['Стек от жълтоперест тон', 'Риба тон'],
  ['Мляко UHT', 'Прясно мляко'],
  ['Слънцезащитно мляко', null],
  ['Адаптирано мляко', null],
  ['Тонер за лице', null],
]
for (const [t, want] of foods) eq(`classify(${t})`, classify(t)?.food ?? null, want)

// ─── Грамове ──────────────────────────────────────────────────────────────────

const grams: [string, number | null, number?][] = [
  ['500 g/опаковка', 500],
  ['150 g/onakoвka', 150],
  ['кг', 1000],
  ['1 кг', 1000],
  ['1,5 кг', 1500],
  ['400 г', 400],
  ['2 x 150 г', 300],
  ['4х125г', 500],
  ['1 л', 1000],
  ['250 мл', 250],
  ['10 бр./опаковка', 600, 60],
  ['бр.', null],
  ['1 връзка', null],
]
for (const [t, want, per] of grams) eq(`gramsOf(${t})`, gramsOf(t, per), want)

// ─── Сметката ─────────────────────────────────────────────────────────────────

const base = {
  store: 'lidl' as const, ext_id: '1', detail: null, old_price: null,
  valid_from: '2026-10-19', valid_to: '2026-10-25', url: null, image: null,
}
const fillet = enrich({ ...base, name: 'Прясно пилешко филе', pack: '1 кг', price: 6.99 })
eq('филе: макрос', fillet?.macro, 'protein')
eq('филе: г протеин/€', fillet?.per_eur, 32.9)            // 230 г / 6,99 €
const cheese = enrich({ ...base, name: 'Сирене краве', pack: '400 г', price: 3.5 })
eq('сирене: мазнина, не протеин', cheese?.macro, 'fat')
const eggs = enrich({ ...base, name: 'Яйца M', pack: '10 бр./опаковка', price: 2.4 })
eq('яйца: грамове от бройките', eggs?.grams, 600)
eq('яйца: протеин', eggs?.macro, 'protein')
const carrots = enrich({ ...base, name: 'Моркови', pack: 'кг', price: 0.54 })
eq('моркови: зеленчук без макрос', [carrots?.produce, carrots?.macro], [true, null])
eq('без цена не влиза', enrich({ ...base, name: 'Извара', pack: '250 г', price: 0 }), null)

// ─── Дати ─────────────────────────────────────────────────────────────────────

const oct = new Date(Date.UTC(2026, 9, 20))
eq('от–до без година', datesIn('Валидно от 19.10. до 25.10.', oct), ['2026-10-19', '2026-10-25'])
eq('с година', datesIn('Вкус от България  19.10.2026 - 25.10.2026', oct), ['2026-10-19', '2026-10-25'])
eq('една дата', datesIn('Предложенията са валидни на 19.10.', oct), ['2026-10-19', '2026-10-19'])
const dec = new Date(Date.UTC(2026, 11, 30))
eq('през Нова година', datesIn('Валидно от 29.12. до 04.01.', dec), ['2026-12-29', '2027-01-04'])

// ─── Kaufland ─────────────────────────────────────────────────────────────────

const ktile = (title: string, sub: string, unit: string, price: string, old = '') => `<a class="k-product-tile" href="#" tabindex="0"><div class="k-product-tile__main"><div class="k-product-tile__image"><img class="k-image k-product-tile__main-image" src="https://kaufland.media.schwarz/is/image/schwarz/x" alt=""></div><div class="k-product-tile__text"><div class="k-product-tile__title">${title}</div><div class="k-product-tile__subtitle">${sub}</div><!----><div class="k-product-tile__unit-price">${unit}</div><div class="k-product-tile__base-price"></div></div></div><div class="k-product-tile__bottom"><div class="k-price-tag k-product-tile__pricetag"><div class="k-price-tag__discount">-23%</div><div class="k-price-tag__price">${price} <!----></div>${old ? `<div class="k-price-tag__old-price"><span class="k-price-tag__old-price-line-through">${old}</span></div>` : ''}</div></div></a>`
const ksec = (head: string, sub: string, tiles: string) => `<div class="k-product-section k-product-section--colored" id="cat"><div class="k-product-section__header"><div class="k-product-section__header-text"><h2 class="k-product-section__headline">${head}</h2><div class="k-product-section__subheadline">${sub}</div></div></div><div class="k-grid">${tiles}</div></div>`

const khtml =
  ksec('Актуални предложения', 'Предложенията са валидни на 19.10.',
    ktile('Моркови', '', 'кг', '0,54 €', '1,29 €')) +
  ksec('Плодове и зеленчуци', 'Валидно от 19.10. до 25.10.',
    ktile('Моркови', '', 'кг', '0,54 €', '1,29 €') +
    ktile('Брей!', 'Краставици', '1 кг', '1,19 €')) +
  ksec('Месо, птиче месо, колбаси', 'Валидно от 19.10. до 25.10.',
    ktile('Шеф месар', 'Телешко мляно месо', '400 г', '3,99 €', '4,99 €')) +
  ksec('Дрогерия, храна за домашни любимци', 'Валидно от 19.10. до 25.10.',
    ktile('Palette', 'Боя за коса\nразлични цветове', '1 бр.', '5,99 €'))

const k = parseKaufland(khtml, oct)
eq('kaufland: брой (без дрогерията, морковите веднъж)', k.length, 3)
const carrot = k.find(o => o.name === 'Моркови')
eq('kaufland: валидността е от категорията', [carrot?.valid_from, carrot?.valid_to], ['2026-10-19', '2026-10-25'])
eq('kaufland: стара цена', carrot?.old_price, 1.29)
const mince = k.find(o => o.detail === 'Шеф месар')
eq('kaufland: марката отива в detail', mince?.name, 'Телешко мляно месо')
eq('kaufland: кайма → протеин', enrich(mince!)?.macro, 'protein')

// ─── Lidl ─────────────────────────────────────────────────────────────────────

const lgrid = (d: unknown) => `<li class="AProductGridbox__GridTilePlaceholder" data-grid-data="${JSON.stringify(d).replace(/"/g, '&quot;')}"></li>`
const lhtml = `<a href="/c/aktsiya/a10104729">Акция</a><a href="/c/aktsiya/a10104729">x</a><a href="/c/khrani-i-napitki/s10068374">y</a>` +
  lgrid({
    productId: 10064534, title: 'Чифери', fullTitle: 'COMBINO Чифери',
    brand: { name: 'COMBINO', showBrand: true },
    price: { price: 0.3, oldPrice: 0.61, packaging: { text: '500 g/опаковка' } },
    storeStartDate: 1791752400, storeEndDate: 1794175199,
    canonicalUrl: '/p/combino-ciferi/p10064534', image: 'https://img/x.png',
    keyfacts: { wonCategoryPrimary: 'Светове на нуждата/Храна и близки до нея храни/Основни храни' },
  }) +
  lgrid({
    productId: 1, title: 'Омекотител', price: { price: 2.99 },
    keyfacts: { wonCategoryPrimary: 'Светове на нуждата/Кухня и домакинство' },
  })

eq('lidl: кампаниите, без повторения', lidlCampaigns(lhtml), ['/c/aktsiya/a10104729'])
const l = parseLidl(lhtml, oct)
eq('lidl: само храната', l.length, 1)
eq('lidl: полетата', [l[0].name, l[0].detail, l[0].pack, l[0].price, l[0].old_price, l[0].valid_from],
  ['Чифери', 'COMBINO', '500 g/опаковка', 0.3, 0.61, '2026-10-12'])   // 1791752400 е полунощ на 12.10. в София
const pasta = enrich(l[0])
eq('lidl: чиферите са въглехидрати', [pasta?.macro, pasta?.per_eur], ['carbs', 1183.3])

console.log(bad ? `\n${bad} проверки паднаха` : 'всички проверки минаха')
if (bad) Deno.exit(1)
