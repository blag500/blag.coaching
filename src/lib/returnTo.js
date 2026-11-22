import { supabase } from './supabase'

/* Връщане след входа. Бележките, таблото и инвестициите живеят зад входа на
   приложението; бутонът „Влез“ там води към /?next=/belezhki/. Тук адресът се
   помни за раздела (sessionStorage — оцелява и през входа с Google), и щом има
   сесия, страницата се сменя с него. Само наши страници от списъка — иначе
   ?next= би пращал хората където поиска някой чужд линк. */
const ALLOWED = ['/belezhki/', '/tablo/', '/invest/']
const KEY = 'blag_next'

export function setupReturnTo() {
  try {
    const url = new URL(window.location.href)
    const next = url.searchParams.get('next')
    if (next) {
      if (ALLOWED.includes(next)) sessionStorage.setItem(KEY, next)
      url.searchParams.delete('next')
      history.replaceState(history.state, '', url.pathname + url.search + url.hash)
    }
    if (!sessionStorage.getItem(KEY)) return
    const go = (session) => {
      const to = sessionStorage.getItem(KEY)
      if (!session || !to) return
      sessionStorage.removeItem(KEY)
      window.location.replace(to)
    }
    supabase.auth.getSession().then(({ data }) => go(data.session))
    supabase.auth.onAuthStateChange((_e, s) => go(s))
  } catch { /* без връщане — приложението си тръгва както винаги */ }
}
