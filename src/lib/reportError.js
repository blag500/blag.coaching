/**
 * Счупеното стига до треньора.
 *
 * Дотук всяка грешка свършваше в конзолата — а конзолата на телефон никой не
 * отваря. Клиент, на когото екранът е гръмнал, или пише, или просто спира да
 * влиза; и в двата случая новината идва късно и без подробности. Оттук
 * нататък редът пристига сам, в client_errors.
 *
 * Три неща, които тази функция няма право да прави:
 *
 * 1. Да хвърля. Съобщаването на грешка е последната стъпка на нещо, което вече
 *    е счупено; ако то само гръмне, човекът получава втори бял екран вместо
 *    първия.
 * 2. Да се вика само себе си. Грешка вътре в изпращането не се съобщава —
 *    иначе една счупена мрежа става безкраен кръг.
 * 3. Да чака. Никой не стои пред екран, който чака да съобщи, че е счупен.
 */

import { supabase } from './supabase'

/* Двата предпазителя срещу поток.
   Един и същ ред, който гърми при всяко рисуване, би напълнил таблицата за
   секунди — а от втория запис нататък той не казва нищо ново. */
const seen = new Set()
const MAX_PER_SESSION = 12
let sent = 0

/* Вътре ли сме в изпращане. Пази от кръга: ако самото изпращане предизвика
   грешка, глобалната кука ще я подаде обратно тук. */
let sending = false

/* На кой екран е стоял човекът. Пише се при смяна на раздел — ErrorBoundary
   няма как да го знае сам, а „гръмна" без „къде" струва един час търсене. */
let screen = null
export function setErrorScreen(name) { screen = name }

/** Първите редове от стека. Цял минифициран стек е стена. */
function trimStack(stack) {
  if (!stack) return null
  return String(stack).split('\n').slice(0, 8).join('\n').slice(0, 2000)
}

/**
 * Праща един ред. Тихо: без await към викащия, без изключения навън.
 *
 * @param {unknown} error   каквото е било хванато
 * @param {string}  [where] откъде — „екран", „обещание", „прозорец"
 */
export function reportError(error, where = null) {
  try {
    if (sending || sent >= MAX_PER_SESSION) return

    const message = String(
      error?.message ?? error ?? 'непозната грешка'
    ).slice(0, 500)

    const key = `${where}|${message}`
    if (seen.has(key)) return
    seen.add(key)

    sending = true
    sent++

    const row = {
      message:     where ? `[${where}] ${message}` : message,
      screen,
      path:        window.location.pathname + window.location.search,
      app_version: typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : null,
      agent:       navigator.userAgent?.slice(0, 300) ?? null,
      stack:       trimStack(error?.stack),
    }

    /* Редът иска user_id заради политиката; без сесия няма на кого да се
       запише и опитът би се върнал с отказ. Мълчи — човек, който още не се е
       вписал, няма как да е счупил нищо, което да е негово. */
    supabase.auth.getSession()
      .then(({ data }) => {
        const uid = data?.session?.user?.id
        if (!uid) return
        return supabase.from('client_errors').insert({ ...row, user_id: uid })
      })
      .catch(() => { /* точка 2 */ })
      .finally(() => { sending = false })
  } catch {
    sending = false
  }
}

/**
 * Куките, които хващат всичко извън React.
 *
 * ErrorBoundary лови само грешки при рисуване. Счупен обработчик на натискане,
 * отхвърлено обещание от заявка — те минават покрай него и дотук не оставяха
 * следа никъде.
 */
export function installErrorReporting() {
  window.addEventListener('error', e => {
    reportError(e.error ?? e.message, 'прозорец')
  })
  window.addEventListener('unhandledrejection', e => {
    reportError(e.reason, 'обещание')
  })
}
