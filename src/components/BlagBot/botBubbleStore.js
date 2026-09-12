/**
 * Къде стои балончето и дали изобщо стои.
 *
 * Отделно от компонента, защото и страницата на бота чете същото: там стои
 * бутонът, който го връща, след като човек го е махнал. Две места, един
 * източник — иначе едното показва „махнато", а другото продължава да рисува.
 */

const POS_KEY    = 'blag_bot_bubble_pos'
const HIDDEN_KEY = 'blag_bot_bubble_hidden'

/* Ъгълът по подразбиране: същият, на който стоеше, преди да може да се мести,
   и същият, над който сяда бутонът за писане в потока. */
export const DEFAULT_POS = { right: 18, bottom: 84 }

export function loadPos() {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return DEFAULT_POS
    const p = JSON.parse(raw)
    if (typeof p?.right !== 'number' || typeof p?.bottom !== 'number') return DEFAULT_POS
    return p
  } catch { return DEFAULT_POS }
}

export function savePos(pos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos)) } catch { /* частен режим */ }
}

export function isHidden() {
  try { return localStorage.getItem(HIDDEN_KEY) === '1' } catch { return false }
}

/**
 * Скрива или връща балончето.
 *
 * Известява и останалите слушатели: страницата на бота и самото балонче живеят
 * в различни дървета, а събитието за storage не се вдига в раздела, който е
 * писал. Без това връщането от бутона би искало презареждане, за да се види.
 */
export function setHidden(on) {
  try { localStorage.setItem(HIDDEN_KEY, on ? '1' : '0') } catch { /* частен режим */ }
  window.dispatchEvent(new CustomEvent('blag:bot-bubble', { detail: { hidden: !!on } }))
}
