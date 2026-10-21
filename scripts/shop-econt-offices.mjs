// Офисите и автоматите на Еконт → public/shop/econt-offices.json.
//
// Касата на магазина ги показва в списък с търсене, вместо купувачът да пише
// офиса на ръка (проучването: 21.10). Списъкът е публичен; пуска се на ръка,
// когато Еконт отвори или затвори офиси:  node scripts/shop-econt-offices.mjs

import { writeFileSync } from 'node:fs'

const res = await fetch('https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ countryCode: 'BGR' }),
})
if (!res.ok) throw new Error(`Еконт: ${res.status}`)
const { offices = [] } = await res.json()

const rows = offices
  .filter((o) => o.address?.city?.name)
  .map((o) => ({
    c: o.code,
    n: o.name,
    t: o.address.city.name,
    a: (o.address.fullAddress || '').replace(/\s+/g, ' ').trim(),
    m: o.isAPS ? 1 : 0, // автомат
  }))
  .sort((x, y) => x.t.localeCompare(y.t, 'bg') || x.n.localeCompare(y.n, 'bg'))

writeFileSync(new URL('../public/shop/econt-offices.json', import.meta.url), JSON.stringify(rows))
console.log(`${rows.length} офиса, ${rows.filter((r) => r.m).length} автомата`)
