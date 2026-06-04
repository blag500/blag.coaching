import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './FormCheckin.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const GYM_PERF = [
  { label: '↓ СПАД',  activeClass: 'tapBtnRed'   },
  { label: '= ЗАДРЖ', activeClass: 'tapBtnAmber'  },
  { label: '↑ РЪСТ',  activeClass: 'tapBtnGreen'  },
]

const GYM_PERF_COLORS = ['#EF5350', '#FFB74D', '#66BB6A']

export default function FormCheckin() {
  const { user } = useAuth()
  const fileRef = useRef()

  const [checkins,      setCheckins]      = useState([])
  const [weight,        setWeight]        = useState('')
  const [sleepHours,    setSleepHours]    = useState('')
  const [gymPerf,       setGymPerf]       = useState(null)
  const [trainDesire,   setTrainDesire]   = useState(null)
  const [weeklyWin,     setWeeklyWin]     = useState('')
  const [weeklyImprove, setWeeklyImprove] = useState('')
  const [showWeekly,    setShowWeekly]    = useState(false)
  const [notes,         setNotes]         = useState('')
  const [photoFile,     setPhotoFile]     = useState(null)
  const [previewUrl,    setPreviewUrl]    = useState(null)
  const [uploading,     setUploading]     = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [lightbox,      setLightbox]      = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('form_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return
        setCheckins(data)
        const today = data.find(c => c.date === todayStr())
        if (today) {
          if (today.weight_kg        != null) setWeight(String(today.weight_kg))
          if (today.sleep_hours      != null) setSleepHours(String(today.sleep_hours))
          if (today.gym_performance  != null) setGymPerf(today.gym_performance)
          if (today.training_desire  != null) setTrainDesire(today.training_desire)
          if (today.weekly_win)               { setWeeklyWin(today.weekly_win);         setShowWeekly(true) }
          if (today.weekly_improve)           { setWeeklyImprove(today.weekly_improve); setShowWeekly(true) }
          if (today.notes)                    setNotes(today.notes)
        }
      })
  }, [user?.id])

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const canSave = !!(
    weight || sleepHours || gymPerf != null || trainDesire != null ||
    weeklyWin.trim() || weeklyImprove.trim() || notes.trim() || photoFile
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return
    setUploading(true)

    // Preserve existing photo unless user picked a new one
    const existing = checkins.find(c => c.date === todayStr())
    let photo_url = existing?.photo_url || null

    if (photoFile) {
      const ext  = photoFile.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('form-checkins')
        .upload(path, photoFile, { contentType: photoFile.type })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('form-checkins').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    const entry = {
      user_id:          user.id,
      date:             todayStr(),
      weight_kg:        weight      ? parseFloat(weight)      : null,
      sleep_hours:      sleepHours  ? parseFloat(sleepHours)  : null,
      gym_performance:  gymPerf,
      training_desire:  trainDesire,
      weekly_win:       weeklyWin.trim()     || null,
      weekly_improve:   weeklyImprove.trim() || null,
      notes:            notes.trim()         || null,
      photo_url,
    }

    const { data } = await supabase
      .from('form_checkins')
      .upsert(entry, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (data) {
      setCheckins(prev => [data, ...prev.filter(c => c.date !== data.date)])
      setSaved(true)
      setPhotoFile(null)
      clearPhoto()
      setTimeout(() => setSaved(false), 2000)
    }
    setUploading(false)
  }

  async function handleDelete(checkin) {
    if (checkin.photo_url) {
      const segments = checkin.photo_url.split('/form-checkins/')
      if (segments[1]) {
        await supabase.storage.from('form-checkins').remove([segments[1]])
      }
    }
    await supabase.from('form_checkins').delete().eq('id', checkin.id)
    setCheckins(prev => prev.filter(c => c.id !== checkin.id))
    if (checkin.date === todayStr()) {
      setWeight(''); setSleepHours(''); setGymPerf(null); setTrainDesire(null)
      setWeeklyWin(''); setWeeklyImprove(''); setNotes('')
      clearPhoto()
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.form}>

        {/* Weight + Sleep */}
        <div className={styles.inputRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ci-weight">ТЕГЛО</label>
            <div className={styles.weightWrap}>
              <input
                id="ci-weight"
                className={styles.input}
                type="number" step="0.1" min="20" max="300"
                placeholder="85.0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
              <span className={styles.unit}>кг</span>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ci-sleep">СЪН</label>
            <div className={styles.weightWrap}>
              <input
                id="ci-sleep"
                className={styles.input}
                type="number" step="0.5" min="0" max="24"
                placeholder="7.5"
                value={sleepHours}
                onChange={e => setSleepHours(e.target.value)}
              />
              <span className={styles.unit}>ч.</span>
            </div>
          </div>
        </div>

        {/* Training section — grouped */}
        <div className={styles.trainingSection}>
          <p className={styles.sectionLabel}>ТРЕНИРОВКА</p>

          <div className={styles.tapRow}>
            {GYM_PERF.map(({ label, activeClass }, i) => (
              <button
                key={i}
                type="button"
                className={[styles.tapBtn, gymPerf === i ? styles[activeClass] : ''].join(' ')}
                onClick={() => setGymPerf(gymPerf === i ? null : i)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.desireRow}>
            <span className={styles.desireLabel}>ЖЕЛАНИЕ</span>
            {[0, 1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`${styles.desireBtn} ${trainDesire === n ? styles.desireBtnActive : ''}`}
                onClick={() => setTrainDesire(trainDesire === n ? null : n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="ci-notes">БЕЛЕЖКА</label>
          <input
            id="ci-notes"
            className={styles.input}
            type="text"
            placeholder="Как се чувствам..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Weekly section — collapsible */}
        <button
          type="button"
          className={styles.weeklyToggle}
          onClick={() => setShowWeekly(v => !v)}
        >
          СЕДМИЧНО РЕЗЮМЕ
          <span className={`${styles.chevron} ${showWeekly ? styles.chevronOpen : ''}`}>▾</span>
        </button>

        {showWeekly && (
          <div className={styles.weeklySection}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ci-win">ПОБЕДА ЗА СЕДМИЦАТА</label>
              <input
                id="ci-win"
                className={styles.input}
                type="text"
                placeholder="Нещо, което мина добре..."
                value={weeklyWin}
                onChange={e => setWeeklyWin(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ci-improve">ЩО ДА ПОДОБРЯ</label>
              <input
                id="ci-improve"
                className={styles.input}
                type="text"
                placeholder="Нещо за следващата седмица..."
                value={weeklyImprove}
                onChange={e => setWeeklyImprove(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Photo */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePhotoChange}
        />

        {previewUrl ? (
          <div className={styles.previewArea}>
            <img src={previewUrl} className={styles.previewImg} alt="Preview" />
            <button type="button" className={styles.removePhotoBtn} onClick={clearPhoto}>
              × Премахни снимката
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.photoPickBtn}
            onClick={() => fileRef.current.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Добави снимка на форма
          </button>
        )}

        <button
          type="submit"
          className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
          disabled={uploading || !canSave}
        >
          {uploading ? '...' : saved ? '✓ Записано' : 'Запази днешния check-in'}
        </button>
      </form>

      {/* Gallery */}
      {checkins.length > 0 && (
        <div className={styles.gallery}>
          {checkins.map(c => (
            <div key={c.id} className={styles.card}>
              {c.photo_url ? (
                <button
                  type="button"
                  className={styles.photoBtn}
                  onClick={() => setLightbox(c.photo_url)}
                >
                  <img src={c.photo_url} className={styles.thumb} alt={c.date} />
                </button>
              ) : (
                <div className={styles.noPhoto}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              )}
              <div className={styles.cardInfo}>
                <span className={styles.cardDate}>
                  {new Date(c.date + 'T12:00').toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
                {c.weight_kg != null && (
                  <span className={styles.cardWeight}>{c.weight_kg} кг</span>
                )}
                <div className={styles.cardChips}>
                  {c.sleep_hours != null && (
                    <span className={styles.chip}>{c.sleep_hours}ч</span>
                  )}
                  {c.gym_performance != null && (
                    <span
                      className={styles.chip}
                      style={{ color: GYM_PERF_COLORS[c.gym_performance], borderColor: GYM_PERF_COLORS[c.gym_performance] + '55' }}
                    >
                      {c.gym_performance === 0 ? '↓' : c.gym_performance === 1 ? '=' : '↑'}
                    </span>
                  )}
                  {c.training_desire != null && (
                    <span className={styles.chip}>{c.training_desire}/5</span>
                  )}
                </div>
                {(c.weekly_win || c.notes) && (
                  <span className={styles.cardNotes}>
                    {c.weekly_win || c.notes}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => handleDelete(c)}
                aria-label="Изтрий"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} className={styles.lightboxImg} alt="Check-in" />
        </div>
      )}
    </div>
  )
}
