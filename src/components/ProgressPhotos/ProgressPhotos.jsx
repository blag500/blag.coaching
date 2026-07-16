import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ProgressPhotos.module.css'

function fmtDate(iso) {
  return new Date(iso + 'T12:00').toLocaleDateString('bg-BG', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function ProgressPhotos() {
  const { user } = useAuth()
  const [photos,   setPhotos]   = useState([])  // checkins with photo_url
  const [lightbox, setLightbox] = useState(null)
  const [compare,  setCompare]  = useState([])  // max 2 selected ids for compare

  useEffect(() => {
    if (!user) return
    supabase
      .from('form_checkins')
      .select('id, date, photo_url, weight_kg')
      .eq('user_id', user.id)
      .not('photo_url', 'is', null)
      .order('date', { ascending: false })
      .then(({ data }) => setPhotos(data ?? []))
  }, [user?.id])

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".3">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <p className={styles.emptyText}>Добави снимка в Check-in за да видиш прогреса си тук</p>
      </div>
    )
  }

  function toggleCompare(id) {
    setCompare(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2)  return [prev[1], id]
      return [...prev, id]
    })
  }

  const comparePhotos = compare.length === 2
    ? compare.map(id => photos.find(p => p.id === id)).filter(Boolean)
    : null

  // oldest first for compare (before left, after right)
  const [before, after] = comparePhotos
    ? [...comparePhotos].sort((a, b) => a.date.localeCompare(b.date))
    : [null, null]

  return (
    <div className={styles.wrap}>
      {/* ── Compare strip ── */}
      {compare.length > 0 && (
        <div className={styles.compareBar}>
          <span className={styles.compareHint}>
            {compare.length === 1 ? 'Избери втора снимка за сравнение' : ''}
          </span>
          {compare.length === 2 && (
            <button className={styles.compareBtn} onClick={() => setLightbox('compare')} type="button">
              СРАВНИ →
            </button>
          )}
          <button className={styles.compareClear} onClick={() => setCompare([])} type="button">
            ✕
          </button>
        </div>
      )}

      {/* ── Timeline grid ── */}
      <div className={styles.grid}>
        {photos.map(p => {
          const selected = compare.includes(p.id)
          const selIdx   = compare.indexOf(p.id)
          return (
            <div
              key={p.id}
              className={`${styles.cell} ${selected ? styles.cellSelected : ''}`}
            >
              <button
                className={styles.photoBtn}
                onClick={() => setLightbox(p.photo_url)}
                type="button"
              >
                <img src={p.photo_url} className={styles.photo} alt={p.date} loading="lazy" />
                <div className={styles.overlay}>
                  <span className={styles.overlayDate}>{fmtDate(p.date)}</span>
                  {p.weight_kg != null && (
                    <span className={styles.overlayWeight}>{p.weight_kg} кг</span>
                  )}
                </div>
                {selected && (
                  <div className={styles.selectedBadge}>
                    {selIdx === 0 ? 'A' : 'B'}
                  </div>
                )}
              </button>
              <button
                className={`${styles.selectBtn} ${selected ? styles.selectBtnOn : ''}`}
                onClick={() => toggleCompare(p.id)}
                type="button"
              >
                {selected ? '✓' : '+'}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Lightbox (single photo) ── */}
      {lightbox && lightbox !== 'compare' && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} className={styles.lightboxImg} alt="Progress" />
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)} type="button">✕</button>
        </div>
      )}

      {/* ── Compare lightbox ── */}
      {lightbox === 'compare' && before && after && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <div className={styles.compareView} onClick={e => e.stopPropagation()}>
            {[{ label: 'ПРЕДИ', p: before }, { label: 'СЛЕД', p: after }].map(({ label, p }) => (
              <div key={p.id} className={styles.comparePane}>
                <img src={p.photo_url} className={styles.compareImg} alt={label} />
                <div className={styles.compareLabel}>
                  <span className={styles.compareLabelTag}>{label}</span>
                  <span className={styles.compareLabelDate}>{fmtDate(p.date)}</span>
                  {p.weight_kg != null && (
                    <span className={styles.compareLabelWeight}>{p.weight_kg} кг</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)} type="button">✕</button>
        </div>
      )}
    </div>
  )
}
