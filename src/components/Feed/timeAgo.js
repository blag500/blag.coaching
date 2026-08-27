/**
 * „преди 4 мин" — не часовник.
 *
 * Във фийд точният час на нещо отпреди половин час не носи нищо; носи го
 * разстоянието. Датата се връща чак когато е минала седмица, защото оттам
 * нататък „преди 9 дни" е по-трудно за четене от самата дата.
 */
export function timeAgo(iso, t, lang = 'bg') {
  const then = new Date(iso).getTime()
  const mins = Math.floor((Date.now() - then) / 60000)

  if (mins < 1)     return t('feed.ago.now')
  if (mins < 60)    return t('feed.ago.min',  { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24)   return t('feed.ago.hour', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7)     return t('feed.ago.day',  { n: days })

  const locale = lang === 'en' ? 'en-GB' : 'bg-BG'
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })
}
