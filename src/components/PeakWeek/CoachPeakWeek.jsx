import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import { usePeakWeek } from '../../hooks/usePeakWeek'
import styles from './PeakWeek.module.css'

/**
 * Пиковата седмица откъм треньора — само за четене.
 *
 * Клиентът има екран за правене: едно копче за мерене, едно за звездата, едно
 * за отмятане. Треньорът има нужда от друго — да види осемте дни наведнъж и да
 * забележи какво не е станало. Затова тук няма нито едно поле за писане, а
 * дните стоят като редове един под друг вместо като лента: петнайсет клиента по
 * осем дни се преглеждат с превъртане, не с чукане по дати.
 */

function fmtShort(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(loc(), { day: '2-digit', month: '2-digit' })
}

function dowKey(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return `daysMon.${(new Date(y, m - 1, d).getDay() + 6) % 7}`
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })
}

export default function CoachPeakWeek({ clientId }) {
  const { t } = useSettings()
  const pw = usePeakWeek(clientId)
  const { week, plan, loading, today, logsByDate, lookWeight, doneFor } = pw

  if (loading) return <div className={styles.loadingDot} />

  if (!week || !plan) {
    return <p className={styles.empty}>{t('pw.coach.none')}</p>
  }

  return (
    <div className={styles.page} style={{ padding: 0 }}>
      <header className={styles.head}>
        <h1 className={styles.title}>{t('pw.title')}</h1>
        {week.show_name && <p className={styles.showName}>{week.show_name}</p>}
        <p className={styles.subtitle}>
          {fmtShort(plan.startDate)} – {fmtShort(plan.showDate)} · {t('pw.loadSummary', {
            days: week.load_days, perKg: week.carb_per_kg,
            grams: pw.latestKg ? Math.round(pw.latestKg * week.carb_per_kg) : '—',
          })}
        </p>
      </header>

      <section className={`${styles.card} ${styles.lookCard}`}>
        <div className={styles.cardTitle}>{t('pw.look')}</div>
        <div className={styles.lookRow}>
          <div className={styles.lookCell}>
            <span className={styles.lookVal}>{lookWeight ?? '—'}</span>
            <span className={styles.lookLabel}>{t('pw.lookTarget')}</span>
          </div>
          <div className={styles.lookCell}>
            <span className={styles.lookValSm}>{pw.latestKg ?? '—'}</span>
            <span className={styles.lookLabel}>{t('pw.coach.latest')}</span>
          </div>
        </div>
        {lookWeight == null && <p className={styles.note}>{t('pw.coach.noLook')}</p>}
      </section>

      {plan.days.map(d => {
        const dayLogs = logsByDate[d.date] ?? []
        const done    = doneFor(d.date)
        const past    = d.date < today
        return (
          <section key={d.date} className={styles.card} style={past && !done.length ? { opacity: 0.65 } : undefined}>
            <div className={styles.dayHead}>
              <div>
                <div className={`${styles.phaseTag} ${styles[`tag_${d.phase}`]}`}>{t(`pw.phase.${d.phase}`)}</div>
                <div className={styles.dayDate}>{t(dowKey(d.date))} · {fmtShort(d.date)}</div>
              </div>
              <div className={styles.dayOut}>{d.daysOut === 0 ? '★' : d.daysOut}</div>
            </div>

            <div className={styles.macroRow}>
              {[
                { k: 'pp.macro.carbs',   v: d.carbs != null ? `${d.carbs}g` : '—' },
                { k: 'pp.macro.protein', v: `${d.protein}g` },
                { k: 'pp.macro.fat',     v: `${d.fat}g` },
                { k: 'pw.steps',         v: d.steps ? d.steps.toLocaleString(loc()) : '—' },
              ].map(({ k, v }) => (
                <div key={k} className={styles.macro}>
                  <span className={styles.macroVal}>{v}</span>
                  <span className={styles.macroLabel}>{t(k)}</span>
                </div>
              ))}
            </div>

            {/* Какво е отметнал. Празно на минал ден е информация, не липса. */}
            <div className={styles.checks}>
              {['food', 'train', 'rest', 'steps']
                .filter(id => done.includes(id))
                .map(id => (
                  <span key={id} className={`${styles.check} ${styles.checkOn}`}>
                    <span className={styles.checkBox}>✓</span>{t(`pw.done.${id}`, { n: d.steps ?? '' })}
                  </span>
                ))}
              {past && done.length === 0 && <span className={styles.empty}>{t('pw.coach.nothingTicked')}</span>}
            </div>

            {dayLogs.length > 0 && (
              <ul className={styles.logList}>
                {dayLogs.map(l => (
                  <li key={l.id} className={`${styles.logItem} ${l.is_look ? styles.logLook : ''}`}>
                    <span className={styles.logTime}>{fmtTime(l.logged_at)}</span>
                    {l.photo_url && <img className={styles.logThumb} src={l.photo_url} alt="" loading="lazy" />}
                    <span className={styles.logKg}>{l.kg != null ? `${l.kg} ${t('unit.kg')}` : '—'}</span>
                    {l.is_look && <span className={styles.logStar}>★</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
