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

function ReadinessRing({ score, label }) {
  const r    = 46
  const circ = 2 * Math.PI * r
  const pct  = score !== null ? score / 100 : 0
  const dash = pct * circ
  const color = scoreColor(score)

  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 100 100" width="110" height="110" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill={color}
          fontSize="24" fontFamily="'Bebas Neue', sans-serif" letterSpacing="1">
          {score ?? '?'}
        </text>
        <text x="50" y="59" textAnchor="middle" fill="rgba(242,232,207,0.35)"
          fontSize="7" fontFamily="'JetBrains Mono', monospace">
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

function HoursLabel(hours) {
  if (hours < 24) return `${hours}ч`
  const d = Math.floor(hours / 24)
  return `${d}д`
}

export default function ReadinessWidget({ onNavigate, client = null }) {
  const { score, components, muscleGroups, loading } = useReadiness(client)
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
    if (s >= 80) return t('readiness.excellent')
    if (s >= 60) return t('readiness.good')
    if (s >= 40) return t('readiness.moderate')
    return t('readiness.low')
  }

  const recoveryLogged = components.find(c => c.id === 'recovery')?.score !== null
  const Tag = onNavigate ? 'button' : 'div'

  return (
    <Tag
      className={styles.card}
      onClick={onNavigate ? () => onNavigate('recovery') : undefined}
      type={onNavigate ? 'button' : undefined}
    >
      <div className={styles.topRow}>
        <div className={styles.left}>
          <span className={styles.cardLabel}>{t('readiness.title')}</span>
          <ReadinessRing score={score} label={scoreLabel(score)} />
        </div>
        <div className={styles.bars}>
          {components.map(c => (
            <ComponentBar
              key={c.id}
              label={t(`readiness.component.${c.id}`)}
              score={c.score}
              color={c.color}
            />
          ))}
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

      {!recoveryLogged && (
        <div className={styles.cta}>
          {t('readiness.cta')}
        </div>
      )}
    </Tag>
  )
}
