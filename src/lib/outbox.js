import { supabase } from './supabase'

/**
 * Опашка за записите, които мрежата не е поела.
 *
 * Дотук неуспешният запис махаше реда от екрана и вибрираше. Вибрация в
 * джоба, след като човекът вече е прибрал телефона, значи тихо неотчетена
 * храна — а точно там, където се логва, сигнал често няма: сутеренът на
 * залата, щандът в магазина. При това помощната страница обещава на клиентите
 * работа офлайн, което дотук важеше само за четене.
 *
 * Затова несполучилият запис не се изхвърля, а чака. Опитва се пак при
 * връщане на мрежата и при всяко отваряне, и се вижда, че чака.
 *
 * localStorage, не IndexedDB: записите са по няколкостотин байта, четат се
 * наведнъж и се пишат рядко. IndexedDB би бил повече код за същото, а квотата
 * не е проблем при опашка, която се изпразва.
 */

const KEY = 'blag_outbox'
const MAX_TRIES = 6

let subs = []

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) }
  catch { /* частен режим — опашката живее само за тази сесия */ }
  subs.forEach(fn => { try { fn(list.length) } catch { /* чужд слушател */ } })
}

/** Колко чакат в момента. */
export function pending() { return read().length }

/** Кой да научава, когато числото се смени. Връща отписване. */
export function subscribe(fn) {
  subs.push(fn)
  fn(read().length)
  return () => { subs = subs.filter(s => s !== fn) }
}

/**
 * Слага запис в опашката.
 *
 * Тук се случва и сливането. Храна, добавена без мрежа и изтрита преди тя да
 * се върне, не бива да замине и да се върне като призрак — затова изтриване
 * върху още неизпратено добавяне маха и двете. Същото и с поправка: тя влиза
 * направо в чакащия ред, вместо да пътува като отделна стъпка към ред, който
 * сървърът още не познава.
 */
export function enqueue(item) {
  const list = read()
  const temp = item.match?.id != null && String(item.match.id).startsWith('temp-')

  if (temp && item.op === 'delete') {
    write(list.filter(q => q.tempId !== item.match.id))
    return
  }
  if (temp && item.op === 'update') {
    const at = list.findIndex(q => q.tempId === item.match.id)
    if (at >= 0) {
      list[at] = { ...list[at], row: { ...list[at].row, ...item.row } }
      write(list)
      return
    }
  }

  list.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tries: 0 })
  write(list)
}

let flushing = false

/**
 * Опитва всичко по реда, в който е дошло.
 *
 * Редът има значение: добавяне и поправка върху него не са разменяеми. Затова
 * при отказ от мрежата спираме — следващите чакат своя ред, вместо да се
 * изпреварят.
 *
 * Отказ от сървъра е друго. Ред, който базата отхвърля (изтрит, забранен от
 * правилата, невалиден), няма да мине и на стотния опит; след шест се
 * изхвърля, за да не блокира всичко зад себе си завинаги.
 */
export async function flush() {
  if (flushing) return pending()
  flushing = true
  let sent = false
  try {
    let list = read()
    while (list.length) {
      const it = list[0]
      let error = null
      try {
        if (it.op === 'insert') {
          ;({ error } = await supabase.from(it.table).insert(it.row))
        } else if (it.op === 'upsert') {
          ;({ error } = await supabase.from(it.table).upsert(it.row, it.opts))
        } else if (it.op === 'update') {
          ;({ error } = await supabase.from(it.table).update(it.row).match(it.match))
        } else if (it.op === 'delete') {
          ;({ error } = await supabase.from(it.table).delete().match(it.match))
        }
      } catch (e) {
        error = e
      }

      if (!error) {
        list = read().filter(q => q.id !== it.id)
        write(list)
        sent = true
        continue
      }

      // Мрежата я няма: опашката остава както е, редът се пази.
      if (!navigator.onLine) break

      const tries = (it.tries || 0) + 1
      list = read()
      const at = list.findIndex(q => q.id === it.id)
      if (at < 0) continue
      if (tries >= MAX_TRIES) {
        console.error('outbox: изхвърлен след', tries, 'опита', it, error)
        list.splice(at, 1)
      } else {
        list[at] = { ...list[at], tries }
        write(list)
        break                      // пак ще опитаме по-късно, но не в кръг
      }
      write(list)
    }
    return pending()
  } finally {
    flushing = false
    /* Каквото е заминало, вече го има на сървъра — екраните, които го чакат,
       трябва да го поискат наново, иначе временните редове стоят временни до
       следващото отваряне. */
    if (sent) window.dispatchEvent(new CustomEvent('blag:outbox-sent'))
  }
}

/**
 * Изпразва при всяка възможност.
 *
 * Три повода: приложението се отваря, мрежата се връща, разделът пак става
 * видим. Третото е за телефон, който е бил в джоба — там `online` често вече
 * е минало, докато никой не е гледал.
 */
export function startOutbox() {
  const go = () => { if (navigator.onLine) flush() }
  go()
  window.addEventListener('online', go)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') go()
  })
}
