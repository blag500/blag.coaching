import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import styles from './KnowledgePanel.module.css'

/**
 * Какво знае ботът извън вписаното — и кой го вижда.
 *
 * Знанието влиза през скрипт, който минава хранилището в Obsidian, и това е
 * правилният път за сто бележки. Но после то живее невидимо: не се вижда какво
 * е качено, не се сменя обхватът, не се маха сгрешена бележка, не се добавя
 * бърза мисъл. Мозък, който се управлява само от терминал, е мозък, до който
 * се стига само когато има кой да отвори терминала.
 *
 * Затова тук: списък по източник, с брой парчета и обхват, който се превключва
 * на място, плюс поле за нова бележка.
 *
 * Обхватът е цялата разлика между „моя справка" и „това, което ботът казва на
 * клиентите ми", затова се сменя с изрично натискане и си личи отдалеч.
 * Материал, платен от треньора, стои „само за мен", докато той не реши друго.
 */
export default function KnowledgePanel({ t }) {
  const { user } = useAuth()
  const { lang } = useSettings()
  const [items, setItems]   = useState(null)   // [{ source, chunks, scope }]
  const [open, setOpen]     = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [busy, setBusy]     = useState(false)

  async function load() {
    if (!user?.id) return
    /* Парчетата се броят тук, а не в базата: групирането иска своя функция, а
       сто и двайсет реда с две колони се четат по-евтино, отколкото се пише
       миграция за едно число. */
    const { data } = await supabase
      .from('bot_knowledge')
      .select('source, scope')
      .eq('owner_id', user.id)
      .limit(1000)

    const by = new Map()
    for (const r of data ?? []) {
      const had = by.get(r.source)
      if (had) { had.chunks++; if (had.scope !== r.scope) had.mixed = true }
      else by.set(r.source, { source: r.source, chunks: 1, scope: r.scope })
    }
    setItems([...by.values()].sort((a, b) => a.source.localeCompare(b.source)))
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [user?.id])

  async function flip(item) {
    const next = item.scope === 'shared' ? 'private' : 'shared'
    haptic('toggle')
    setItems(prev => prev.map(x => x.source === item.source ? { ...x, scope: next, mixed: false } : x))
    await supabase.from('bot_knowledge')
      .update({ scope: next }).eq('owner_id', user.id).eq('source', item.source)
  }

  async function forget(item) {
    haptic('success')
    setItems(prev => prev.filter(x => x.source !== item.source))
    await supabase.from('bot_knowledge')
      .delete().eq('owner_id', user.id).eq('source', item.source)
  }

  async function add() {
    const name = title.trim().slice(0, 120)
    const text = body.trim()
    if (!name || text.length < 30 || busy) return
    setBusy(true)
    try {
      /* Минава през функцията, а не направо в таблицата: вгражданията се смятат
         там и без тях парчето е ред, който никое търсене няма да намери. */
      await supabase.functions.invoke('knowledge', {
        body: { source: name, text, scope: 'private', lang },
      })
      setTitle(''); setBody(''); setAdding(false)
      await load()
      haptic('celebrate')
    } catch {
      haptic('reject')
    } finally {
      setBusy(false)
    }
  }

  if (!items) return null

  return (
    <div className={`${styles.wrap} ${open ? styles.open : ''}`}>
      <button
        type="button"
        className={styles.head}
        onClick={() => { haptic('tap'); setOpen(v => !v) }}
        aria-expanded={open}
      >
        {t('know.title')}
        <span className={styles.count}>{items.length}</span>
        <svg className={styles.chevron} viewBox="0 0 24 24" width="16" height="16"
             fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className={styles.body}>
        <div className={styles.inner}>
          {items.length === 0 && <p className={styles.empty}>{t('know.empty')}</p>}

          {items.map(item => (
            <div key={item.source} className={styles.row}>
              <span className={styles.name}>
                {item.source}
                <span className={styles.meta}>
                  {t(item.chunks === 1 ? 'know.chunk.one' : 'know.chunk.other', { n: item.chunks })}
                </span>
              </span>

              {/* Обхватът е цялата разлика между „моя справка" и „това, което
                  ботът казва на клиентите ми" — затова се чете от един поглед. */}
              <button
                type="button"
                className={`${styles.scope} ${item.scope === 'shared' ? styles.shared : ''}`}
                onClick={() => flip(item)}
              >
                {t(item.scope === 'shared' ? 'know.shared' : 'know.private')}
              </button>

              <button
                type="button"
                className={styles.del}
                onClick={() => forget(item)}
                aria-label={t('know.forget')}
              >
                <Pictogram name="close" size={15} />
              </button>
            </div>
          ))}

          {adding ? (
            <div className={styles.form}>
              <input
                className={styles.input}
                value={title}
                maxLength={120}
                placeholder={t('know.namePh')}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea
                className={styles.text}
                value={body}
                rows={5}
                placeholder={t('know.bodyPh')}
                onChange={e => setBody(e.target.value)}
              />
              <div className={styles.formBtns}>
                <button type="button" className={styles.cancel} onClick={() => setAdding(false)}>
                  {t('know.cancel')}
                </button>
                <button
                  type="button"
                  className={styles.save}
                  onClick={add}
                  disabled={busy || !title.trim() || body.trim().length < 30}
                >
                  {busy ? t('know.saving') : t('know.save')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
              <Pictogram name="plus" size={16} />
              {t('know.add')}
            </button>
          )}

          <span className={styles.hint}>{t('know.hint')}</span>
        </div>
      </div>
    </div>
  )
}
