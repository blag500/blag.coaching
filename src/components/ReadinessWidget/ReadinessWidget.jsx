import { useId } from 'react'
import { useReadiness } from '../../hooks/useReadiness'
import { useSettings } from '../../contexts/SettingsContext'
import Skeleton from '../Skeleton/Skeleton'
import styles from './ReadinessWidget.module.css'

function scoreColor(score) {
  if (score === null) return 'rgba(242,232,207,0.2)'
  if (score >= 80) return '#81C784'
  if (score >= 60) return 'var(--accent)'
  if (score >= 40) return '#ff8a65'
  return '#ef5350'
}

function ReadinessRing({ score, label, provisional }) {
  const r    = 46
  const sw   = 7
  const circ = 2 * Math.PI * r
  const pct  = score !== null ? score / 100 : 0
  const dash = pct * circ
  const color = scoreColor(score)
  // Ids are global to the document and this widget can appear more than once —
  // on Today, on the recovery screen, and once per client for the coach.
  const uid = useId().replace(/:/g, '')

  // Alive when the score is genuine (not provisional) and worth celebrating.
  // Under 55 the heart stays quiet — this is a signal, not decoration.
  const alive = score !== null && !provisional && score >= 55

  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 100 100" width="110" height="110" aria-hidden="true">
        <defs>
          {/* Lit from the top left, like every card on the screen. */}
          <linearGradient id={`${uid}-sheen`} x1="0.1" y1="0" x2="0.8" y2="1">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.34" />
            <stop offset="38%"  stopColor="#fff" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-bloom`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
        </defs>

        {/* Heartbeat waves — three concentric rings emanating out from the
            score arc, staggered so a wave is always in flight. Cast in the
            score's own colour, so the pulse stays consistent with the state
            of the ring rather than reading as decorative overlay. */}
        {alive && (
          <g style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                cx="50" cy="50" r={r}
                fill="none" stroke={color} strokeWidth="1.6"
                style={{
                  transformOrigin: '50px 50px',
                  animation: `readinessPulse 2.4s cubic-bezier(0.22, 0.7, 0.28, 1) ${i * 0.8}s infinite`,
                  opacity: 0,
                }}
              />
            ))}
          </g>
        )}

        {/* The arc again, blurred, underneath — so the colour spills onto the
            card the way a lit edge does instead of stopping at the stroke. */}
        {score !== null && (
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            opacity={provisional ? 0.2 : 0.42}
            filter={`url(#${uid}-bloom)`}
          />
        )}

        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        {/* Darkened where the ring is empty, so it reads as a channel the
            colour is filling rather than as two shades of paint. */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth={sw} />

        {/* A provisional reading is drawn at reduced strength, so the ring says
            "not the whole picture" before any label has been read. */}
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          opacity={provisional ? 0.4 : 1}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />

        {/* The bevel: a half-width arc outside catching light, another inside
            falling into shadow. Outside the rotation, so the highlight stays
            where the light is rather than turning with the score. */}
        <circle cx="50" cy="50" r={r + sw / 4} fill="none"
          stroke={`url(#${uid}-sheen)`} strokeWidth={sw / 2} />
        <circle cx="50" cy="50" r={r - sw / 4} fill="none"
          stroke="#000" strokeOpacity="0.22" strokeWidth={sw / 2} />

        {/* Oswald, not Bebas — Bebas ships no Cyrillic and this sat on a
            fallback font ever since the heading face was swapped. */}
        <text x="50" y="46" textAnchor="middle" fill={color}
          fontSize="24" fontFamily="var(--font-heading)" letterSpacing="1"
          opacity={provisional ? 0.75 : 1}>
          {score === null ? '?' : provisional ? `≈${score}` : score}
        </text>
        <text x="50" y="59" textAnchor="middle" fill="rgba(242,232,207,0.35)"
          fontSize="7" fontFamily="var(--font-body)">
          {label}
        </text>
      </svg>
    </div>
  )
}

function ComponentBar({ label, score, color }) {
  const pct = score !== null ? score : 0
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, background: color, opacity: score === null ? 0 : 1 }}
        />
      </div>
      <span className={styles.barVal} style={{ color: score !== null ? color : 'var(--muted)' }}>
        {score !== null ? score : '—'}
      </span>
    </div>
  )
}

// Written out rather than abbreviated. "2д" set in Bulgarian lowercase looks
// close enough to "2g" to be read as grams, which in a food-tracking app is the
// one misreading worth spending four characters to avoid.
function HoursLabel(hours) {
  if (hours < 24) return `${hours} ч`
  const d = Math.floor(hours / 24)
  return d === 1 ? '1 ден' : `${d} дни`
}

/**
 * The one thing worth saying about today, chosen from whatever is weakest.
 *
 * The five bars and the muscle rows are a diagnosis, and a diagnosis is for
 * when you have gone looking. On the morning dashboard the card gets a glance,
 * so it has to answer "am I ready" and "what do I do" in a single line, and
 * leave the working out to the screen behind the tap.
 */
function verdictFor({ score, provisional, components, muscleGroups, weakFactors, t }) {
  if (provisional) return { key: 'readiness.verdict.checkin' }

  const weakest = components
    .filter(c => c.score !== null && c.score < 60)
    .sort((a, b) => a.score - b.score)[0]

  // A caution must not contradict the headline. At 85 the ring says ОТЛИЧНО,
  // and "днес по-леко" underneath it asks the reader to believe both — one
  // component can be under par while the day as a whole is plainly good, and
  // when it is, the day is what the card should be reporting.
  const headlineIsGood = score !== null && score >= 80

  if (weakest && !headlineIsGood) {
    // For recovery the app already knows which of the five answers was low, and
    // a cause you can act on beats a verdict you cannot.
    if (weakest.id === 'recovery' && weakFactors.length) {
      const why = weakFactors.map(f => t(`readiness.factor.${f}`)).join(' и ')
      return { key: 'readiness.verdict.recoveryWhy', vars: { why } }
    }
    return { key: `readiness.verdict.${weakest.id}` }
  }

  // Nothing is wrong, so the useful thing left to say is which muscle group is
  // still short of recovered — the only line here that decides today's session.
  const sore = muscleGroups.filter(g => g.pct < 80).sort((a, b) => a.pct - b.pct)[0]
  if (sore) return { key: 'readiness.verdict.muscle', vars: { g: sore.label, p: sore.pct } }

  // Good day, one soft number: worth mentioning, not worth a warning.
  if (weakest) {
    return { key: 'readiness.verdict.goodBut', vars: { what: t(`readiness.soft.${weakest.id}`) } }
  }

  return { key: 'readiness.verdict.ok' }
}

export default function ReadinessWidget({
  onNavigate, client = null, detailed = false, ring = true,
}) {
  const { score, components, muscleGroups, provisional, covered,
          personalised, checkins, weakFactors, loading } = useReadiness(client)
  const { t } = useSettings()

  if (loading) return (
    <div className={styles.card} style={{ pointerEvents: 'none' }}>
      <div className={styles.topRow}>
        <div className={styles.left}>
          <Skeleton circle width={110} />
        </div>
        <div className={styles.bars}>
          {[80, 100, 70, 90, 60].map((w, i) => (
            <div key={i} className={styles.barRow}>
              <Skeleton width={90} height={8} style={{ borderRadius: 4 }} />
              <Skeleton height={4} style={{ flex: 1, borderRadius: 2 }} />
              <Skeleton width={22} height={8} style={{ borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  function scoreLabel(s) {
    if (s === null) return '—'
    // Without the check-in the widget knows nothing about sleep, energy, stress
    // or soreness, so it does not get to call the day excellent.
    if (provisional) return t('readiness.partial')
    if (s >= 80) return t('readiness.excellent')
    if (s >= 60) return t('readiness.good')
    if (s >= 40) return t('readiness.moderate')
    return t('readiness.low')
  }

  const Tag = onNavigate ? 'button' : 'div'

  const basis = personalised
    ? t('readiness.personal')
    : checkins > 0
      ? t('readiness.building').replace('{n}', Math.min(checkins, 5))
      : t('readiness.coverage').replace('{n}', covered)

  // ── The glance version ──────────────────────────────────────────────
  if (!detailed) {
    const v = verdictFor({ score, provisional, components, muscleGroups, weakFactors, t })
    let verdict = t(v.key)
    if (v.vars) for (const [k, val] of Object.entries(v.vars)) {
      verdict = verdict.replace(`{${k}}`, val)
    }

    return (
      <Tag
        className={`${styles.card} ${styles.compact}`}
        onClick={onNavigate ? () => onNavigate('recovery') : undefined}
        type={onNavigate ? 'button' : undefined}
      >
        <div className={styles.compactRow}>
          <ReadinessRing score={score} label={scoreLabel(score)} provisional={provisional} />
          <div className={styles.compactText}>
            <span className={styles.cardLabel}>{t('readiness.title')}</span>
            <p className={styles.verdict}>{verdict}</p>
            <span className={styles.basis}>{basis}</span>
          </div>
        </div>

        {provisional && (
          <span className={styles.checkinBtn}>{t('readiness.checkinBtn')}</span>
        )}
      </Tag>
    )
  }

  // ── The full breakdown, for the recovery screen and the coach ────────
  return (
    <Tag
      className={styles.card}
      onClick={onNavigate ? () => onNavigate('recovery') : undefined}
      type={onNavigate ? 'button' : undefined}
    >
      <div className={styles.topRow}>
        {ring && (
          <div className={styles.left}>
            <span className={styles.cardLabel}>{t('readiness.title')}</span>
            <ReadinessRing score={score} label={scoreLabel(score)} provisional={provisional} />
            {/* What the number is measured against. A score that means "compared
                with your own normal" is a different claim from one measured on a
                fixed table, and the card should not hide which it is. */}
            <span className={styles.coverage}>{basis}</span>
          </div>
        )}
        <div className={styles.bars}>
          {!ring && <span className={styles.cardLabel}>{t('readiness.title')}</span>}
          {components.map(c => (
            <ComponentBar
              key={c.id}
              label={t(`readiness.component.${c.id}`)}
              score={c.score}
              color={c.color}
            />
          ))}
          <span className={styles.footnote}>{t('readiness.footnote')}</span>
        </div>
      </div>

      {muscleGroups.length > 0 && (
        <div className={styles.muscleSection}>
          <span className={styles.muscleSectionLabel}>МУСКУЛНА ГОТОВНОСТ</span>
          {muscleGroups.map(g => (
            <div key={g.group} className={styles.muscleRow}>
              <span className={styles.muscleLabel}>{g.label}</span>
              <div className={styles.muscleTrack}>
                <div
                  className={styles.muscleFill}
                  style={{ width: `${g.pct}%`, background: g.color }}
                />
              </div>
              <span className={styles.musclePct} style={{ color: g.color }}>{g.pct}%</span>
              <span className={styles.muscleHours}>{HoursLabel(g.hours)}</span>
            </div>
          ))}
        </div>
      )}

      {provisional && (
        <div className={styles.cta}>
          {t('readiness.cta')}
        </div>
      )}
    </Tag>
  )
}
