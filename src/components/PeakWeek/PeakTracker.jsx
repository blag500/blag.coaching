import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './PeakTracker.module.css'
import Pictogram from '../Pictogram/Pictogram'

/**
 * Таблицата на пиковата седмица.
 *
 * Планът казва какво да се направи, мереното казва колко тежиш в момента — а
 * това тук казва какво НАИСТИНА е станало в деня, ред по ред. В метода на J3U
 * това е отделен инструмент и причината е една: пиковата седмица не се кара по
 * план, а се чете от миналия път. Когато след година застанеш пред същото шоу,
 * единственото, което помага, е редът от миналата година.
 *
 * Формата е таблица нарочно, макар да е телефон. Смисълът ѝ е сравнението
 * между съседни дни — колко вода, колко натрий, какво е показала сутрешната
 * везна на следващия ден — а сравнение между редове, които не се виждат
 * едновременно, не е сравнение. Затова: тясна таблица, която се плъзга
 * настрани, с закована първа колона, за да се знае кой ред се гледа.
 *
 * Записът е по клетка и с уговорката, научена в дневника на тренировката:
 * пропуснат запис се помни и тръгва пак, вместо да се изхвърли.
 */

const COLS = [
  { key: 'bw_am',       kind: 'num',  w: 62 },
  { key: 'bw_post',     kind: 'num',  w: 62 },
  { key: 'bw_pm',       kind: 'num',  w: 62 },
  { key: 'water_ml',    kind: 'int',  w: 72, icon: 'water' },
  { key: 'sodium_g',    kind: 'num',  w: 56 },
  { key: 'potassium_g', kind: 'num',  w: 56 },
  { key: 'diet',        kind: 'diet', w: 74 },
  /* Трите макроса носят знака и цвета си и в заглавието на колоната: тясна
     колона с три букви иначе се чете два пъти, преди да се разпознае. */
  { key: 'cho',         kind: 'int',  w: 62, icon: 'carbs'   },
  { key: 'pro',         kind: 'int',  w: 62, icon: 'protein' },
  { key: 'fat',         kind: 'int',  w: 62, icon: 'fat'     },
  { key: 'steps',       kind: 'int',  w: 68 },
  { key: 'training',    kind: 'text', w: 96 },
  { key: 'note',        kind: 'text', w: 150 },
]

const DIETS = ['td', 'ntd', 'load', 'show']

/* Запетаята от българската подредба на iOS стига дотук като запетая, а
   parseFloat чете „4,5" като 4. Нормализирането е това, което позволява да се
   запише половин грам натрий. */
const num = v => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const int = v => {
  const n = parseInt(String(v).replace(/\s/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export default function PeakTracker({ week, plan, logsByDate }) {
  const { user } = useAuth()
  const { t } = useSettings()
  const [rows, setRows] = useState({})      // { date: {...} }
  const [saved, setSaved] = useState(null)

  const rowsRef   = useRef(rows)
  const timers    = useRef({})
  const inflight  = useRef({})
  const pending   = useRef({})
  useEffect(() => { rowsRef.current = rows }, [rows])

  useEffect(() => {
    if (!week?.id) return
    let alive = true
    supabase
      .from('peak_week_days')
      .select('*')
      .eq('peak_week_id', week.id)
      .then(({ data }) => {
        if (!alive) return
        const m = {}
        for (const r of data ?? []) m[r.date] = r
        setRows(m)
      })
    return () => { alive = false }
  }, [week?.id])

  if (!week?.id || !plan?.days?.length) return null

  /** Праща реда, чието записване е било пропуснато, докато предишното е в полет. */
  function drain(date) {
    if (!pending.current[date]) return
    pending.current[date] = false
    setTimeout(() => save(date), 60)
  }

  async function save(date) {
    if (!user) return
    if (inflight.current[date]) { pending.current[date] = true; return }
    const r = rowsRef.current[date]
    if (!r) return

    inflight.current[date] = true
    const payload = {
      peak_week_id: week.id,
      user_id: user.id,
      date,
      bw_am:       num(r.bw_am),
      bw_post:     num(r.bw_post),
      bw_pm:       num(r.bw_pm),
      water_ml:    int(r.water_ml),
      sodium_g:    num(r.sodium_g),
      potassium_g: num(r.potassium_g),
      diet:        DIETS.includes(r.diet) ? r.diet : null,
      cho:         int(r.cho),
      pro:         int(r.pro),
      fat:         int(r.fat),
      steps:       int(r.steps),
      training:    String(r.training ?? '').trim() || null,
      note:        String(r.note ?? '').trim() || null,
      updated_at:  new Date().toISOString(),
    }

    const { error } = await supabase
      .from('peak_week_days')
      .upsert(payload, { onConflict: 'peak_week_id,date' })

    inflight.current[date] = false
    drain(date)
    if (error) return

    setSaved(date)
    setTimeout(() => setSaved(s => (s === date ? null : s)), 1200)
  }

  function edit(date, key, value) {
    setRows(prev => ({ ...prev, [date]: { ...(prev[date] ?? {}), [key]: value } }))
    clearTimeout(timers.current[date])
    timers.current[date] = setTimeout(() => save(date), 900)
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t('pt.title')}</h2>
        <p className={styles.sub}>{t('pt.sub')}</p>
      </header>

      {/* Плъзга се настрани, а първата колона стои: без нея, на третата колона
          вече не се знае кой ден се пълни. */}
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.stickyHead}>{t('pt.col.day')}</th>
              {COLS.map(c => (
                <th key={c.key} style={{ minWidth: c.w }}>
                  {c.icon && (
                    <span className={styles.colIcon} style={{ color: `var(--macro-${c.icon})` }}>
                      <Pictogram name={c.icon} size={11} />
                    </span>
                  )}
                  {t(`pt.col.${c.key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.days.map(d => {
              const r = rows[d.date] ?? {}
              /* Мереното през деня стои като бледо число в клетката за сутрин:
                 то вече е записано другаде и пренаписването му на ръка е работа
                 за нищо. */
              const weighed = (logsByDate?.[d.date] ?? [])[0]?.kg
              return (
                <tr key={d.date} className={saved === d.date ? styles.justSaved : ''}>
                  <th className={styles.sticky}>
                    <span className={styles.dayNum}>{d.daysOut === 0 ? '★' : d.daysOut}</span>
                  </th>

                  {COLS.map(c => (
                    <td key={c.key}>
                      {c.kind === 'diet' ? (
                        <select
                          className={styles.select}
                          value={r.diet ?? ''}
                          onChange={e => { edit(d.date, 'diet', e.target.value); haptic('tap') }}
                          aria-label={`${t('pt.col.diet')} — ${d.daysOut}`}
                        >
                          <option value="">–</option>
                          {DIETS.map(v => (
                            <option key={v} value={v}>{t(`pt.diet.${v}`)}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={styles.cell}
                          value={r[c.key] ?? ''}
                          onChange={e => edit(d.date, c.key, e.target.value)}
                          onBlur={() => save(d.date)}
                          inputMode={c.kind === 'text' ? 'text' : 'decimal'}
                          placeholder={c.key === 'bw_am' && weighed != null ? String(weighed) : ''}
                          aria-label={`${t(`pt.col.${c.key}`)} — ${d.daysOut}`}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className={styles.hint}>{t('pt.hint')}</p>
    </section>
  )
}
