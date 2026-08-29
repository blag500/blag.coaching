import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import {
  CHECKIN_FIELDS, CHECKIN_GROUPS, AUTO_FIELDS, POSES, valueOf, deltaOf,
} from './checkinFields'
import styles from './CheckinCompare.module.css'

/**
 * Две седмици, една до друга.
 *
 * Това е екранът, заради който чекинът съществува. Формулярът само събира;
 * работата на треньора е да види какво се е променило, а разликата между
 * „237.6" и „232.2" е изваждане, което софтуерът трябва да свърши — при
 * петнайсет клиента по трийсет седмици това са хиляда изваждания наум.
 *
 * Един ред на въпрос, не две колони.
 * Образецът, от който е взет този екран, слага миналия чекин отляво и
 * текущия отдясно като две независими колони. Отговорите обаче са с различна
 * височина, и към долния край дясната се е плъзнала надолу: „Стрес" отляво
 * стои срещу „Енергия" отдясно, а празен отговор разминава всичко след себе
 * си. Точно там, където сравнението значи нещо, то тихо се разпада. Тук
 * редът е въпросът, и двете стойности живеят в него — подравняването не
 * може да се загуби, защото няма какво да се разминава.
 */

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(loc(), { day: '2-digit', month: 'short' })
}

const TREND_ICON = ['↓', '–', '↑']

/** Как се чете една стойност — числата, двойките, стрелките и „да/не". */
function show(field, v, t) {
  if (v == null) return null
  if (field.type === 'trend') return TREND_ICON[v] ?? null
  if (field.type === 'bool')  return v ? t('ck.yes') : t('ck.no')
  if (Array.isArray(v)) {
    const parts = v.filter(x => x != null)
    if (!parts.length) return null
    return parts.join(field.sep ?? ', ')
  }
  return String(v)
}

function Delta({ field, cur, prev }) {
  const info = deltaOf(field, cur, prev)
  if (!info || info.verdict === 'flat') return null
  const cls = info.verdict === 'good' ? styles.good
    : info.verdict === 'bad' ? styles.bad
    : styles.plain
  return (
    <span className={`${styles.delta} ${cls}`}>
      {info.d > 0 ? '+' : ''}{info.d}
    </span>
  )
}

/** Един ред: въпросът, миналата стойност, сегашната, разликата. */
function Row({ field, cur, prev, t }) {
  const a = show(field, valueOf(field, cur), t)
  const b = show(field, valueOf(field, prev), t)
  // Празно и от двете страни не е ред. Клиент без калипер не бива да гледа
  // цяла колона тирета — тя не казва нищо и краде мястото на онова, което казва.
  if (a == null && b == null) return null

  if (field.type === 'text') {
    return (
      <div className={styles.textRow}>
        <span className={styles.label}>{t(field.labelKey)}</span>
        {b && <p className={styles.textPrev}>{b}</p>}
        <p className={styles.textCur}>{a ?? '—'}</p>
      </div>
    )
  }

  return (
    <div className={styles.row}>
      <span className={styles.label}>{t(field.labelKey)}</span>
      <span className={styles.prev}>{b ?? '—'}</span>
      <span className={styles.arrow} aria-hidden="true">→</span>
      <span className={styles.cur}>{a ?? '—'}</span>
      <Delta field={field} cur={cur} prev={prev} />
    </div>
  )
}

export default function CheckinCompare({ current, previous, female = false }) {
  const { t } = useSettings()
  const [zoom, setZoom] = useState(null)

  if (!current) return null

  const autoCur  = current.auto  ?? {}
  const autoPrev = previous?.auto ?? {}
  const photosCur  = current.photos  ?? {}
  const photosPrev = previous?.photos ?? {}

  const posesShown = POSES.filter(p => photosCur[p.key] || photosPrev[p.key])

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <span className={styles.headPrev}>{previous ? fmtDate(previous.date) : t('ck.noPrev')}</span>
        <span className={styles.headArrow} aria-hidden="true">→</span>
        <span className={styles.headCur}>{fmtDate(current.date)}</span>
        {autoCur.weeksOut != null && (
          <span className={styles.weeksOut}>{t('ck.weeksOut', { n: autoCur.weeksOut })}</span>
        )}
      </header>

      {/* Каквото приложението знае само. Стои първо, защото е измерено, а не
          преразказано — и защото клиентът не го е попълвал. */}
      <section className={styles.group}>
        <h3 className={styles.groupTitle}>{t('ck.g.auto')}</h3>
        {AUTO_FIELDS.map(f => (
          <Row key={f.key} field={f} cur={autoCur} prev={autoPrev} t={t} />
        ))}
      </section>

      {CHECKIN_GROUPS.map(g => {
        const fields = CHECKIN_FIELDS.filter(f => f.group === g.id && (!f.femaleOnly || female))
        const rows = fields
          .map(f => <Row key={f.key} field={f} cur={current} prev={previous} t={t} />)
          .filter(Boolean)
        if (!rows.length) return null
        return (
          <section key={g.id} className={styles.group}>
            <h3 className={styles.groupTitle}>{t(g.labelKey)}</h3>
            {rows}
          </section>
        )
      })}

      {posesShown.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>{t('ck.g.photos')}</h3>
          {/* Двойка на поза. Образецът иска щракване вляво, после вдясно, за да
              се получи същото — а щом позите са фиксирани гнезда, двойката е
              вече налична и няма какво да се избира. */}
          {posesShown.map(p => (
            <div key={p.key} className={styles.poseRow}>
              <span className={styles.poseLabel}>{t(p.labelKey)}</span>
              <div className={styles.posePair}>
                {[photosPrev[p.key], photosCur[p.key]].map((url, i) => (
                  url ? (
                    <button
                      key={i}
                      type="button"
                      className={styles.poseShot}
                      onClick={() => setZoom(url)}
                    >
                      <img src={url} alt={t(p.labelKey)} loading="lazy" />
                    </button>
                  ) : (
                    <span key={i} className={styles.poseEmpty} aria-hidden="true" />
                  )
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Порталът е задължителен: страницата седи вътре в таб, който се
          премества с трансформация, а трансформиран предшественик прави
          fixed безсмислен. */}
      {zoom && createPortal(
        <button type="button" className={styles.lightbox} onClick={() => setZoom(null)}>
          <img src={zoom} alt="" />
        </button>,
        document.body,
      )}
    </div>
  )
}
