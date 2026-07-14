import { useReadiness } from '../../hooks/useReadiness'
import styles from './ReadinessWidget.module.css'

function scoreColor(score) {
  if (score === null) return 'rgba(242,232,207,0.2)'
  if (score >= 80) return '#81C784'
  if (score >= 60) return '#ffb74d'
  if (score >= 40) return '#ff8a65'
  return '#ef5350'
}

function scoreLabel(score) {
  if (score === null) return '—'
  if (score >= 80) return 'ОТЛИЧНО'
  if (score >= 60) return 'ДОБРО'
  if (score >= 40) return 'УМЕРЕНО'
  return 'НИСКО'
}

function ReadinessRing({ score }) {
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
          {scoreLabel(score)}
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

export default function ReadinessWidget({ onNavigate, client = null }) {
  const { score, components, loading } = useReadiness(client)

  if (loading) return null

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
          <span className={styles.cardLabel}>ГОТОВНОСТ</span>
          <ReadinessRing score={score} />
        </div>
        <div className={styles.bars}>
          {components.map(c => (
            <ComponentBar key={c.id} label={c.label} score={c.score} color={c.color} />
          ))}
        </div>
      </div>

      {!recoveryLogged && (
        <div className={styles.cta}>
          Попълни чек-ин за по-точен резултат →
        </div>
      )}
    </Tag>
  )
}
