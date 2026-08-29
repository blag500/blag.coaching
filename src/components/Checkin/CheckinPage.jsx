import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import { useCheckin } from '../../hooks/useCheckin'
import { CHECKIN_FIELDS, CHECKIN_GROUPS, AUTO_FIELDS, POSES } from './checkinFields'
import CheckinCompare from './CheckinCompare'
import styles from './CheckinPage.module.css'

/**
 * Седмичният чекин, от страната на клиента.
 *
 * Редът на екрана носи цялото твърдение: първо какво приложението вече знае за
 * седмицата, после какво то не може да знае. Първата карта не е украса — тя е
 * причината формулярът да е къс. Човек, който вижда, че теглото, тренировките,
 * храненето и сънят му вече са там, разбира защо го питаме за глада и стреса, а
 * не за неща, които сам е записвал седем дни подред.
 */

const TREND = [
  { v: 0, icon: '↓', cls: 'trendDown' },
  { v: 1, icon: '–', cls: 'trendHold' },
  { v: 2, icon: '↑', cls: 'trendUp'   },
]

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(loc(), { day: 'numeric', month: 'long' })
}

export default function CheckinPage({ onBack }) {
  const { t } = useSettings()
  const { user, profile } = useAuth()
  const { current, previous, due, activeDate, auto, save, rows, checkinDay, setCheckinDay } = useCheckin()

  const [values,  setValues]  = useState({})
  const [photos,  setPhotos]  = useState({})
  const [busy,    setBusy]    = useState(null)   // ключът на позата, която се качва
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [view,    setView]    = useState('form') // 'form' | 'compare'
  const fileRefs = useRef({})

  const female = profile?.gender === 'female'

  // Отворен наново същия чекин се дописва, не се почва отначало.
  useEffect(() => {
    if (!current) { setValues({}); setPhotos({}); return }
    const v = {}
    for (const f of CHECKIN_FIELDS) {
      if (f.parts) for (const p of f.parts) { if (current[p] != null) v[p] = current[p] }
      else if (current[f.key] != null) v[f.key] = current[f.key]
    }
    setValues(v)
    setPhotos(current.photos ?? {})
  }, [current?.id])

  function set(key, val) {
    setValues(p => ({ ...p, [key]: val }))
  }

  async function uploadPose(poseKey, file) {
    if (!file || !user) return
    setBusy(poseKey)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${activeDate}-${poseKey}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('form-checkins')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('form-checkins').getPublicUrl(path)
      setPhotos(p => ({ ...p, [poseKey]: data.publicUrl }))
    }
    setBusy(null)
  }

  async function handleSave() {
    setSaving(true)
    // Празното поле е null, не празен низ: базата има проверки за обхват, а
    // '' минава за нула при числата и тихо записва глад нула.
    const clean = {}
    for (const [k, v] of Object.entries(values)) {
      clean[k] = v === '' || v == null ? null : v
    }
    const { error } = await save(clean, photos)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const autoRows = AUTO_FIELDS
    .map(f => ({ f, v: auto?.[f.key] }))
    .filter(({ v }) => v != null)

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        {onBack && (
          <button type="button" className={styles.back} onClick={onBack} aria-label={t('ck.back')}>‹</button>
        )}
        <div className={styles.headText}>
          <span className={styles.eyebrow}>
            {due ? t('ck.due') : t('ck.submitted')}
          </span>
          <h1 className={styles.title}>{t('ck.title')}</h1>
          <span className={styles.forDate}>{fmtDate(activeDate)}</span>
        </div>
      </header>

      {previous && (
        <div className={styles.tabs}>
          {['form', 'compare'].map(v => (
            <button
              key={v}
              type="button"
              className={`${styles.tab} ${view === v ? styles.tabOn : ''}`}
              onClick={() => setView(v)}
            >
              {t(v === 'form' ? 'ck.tabForm' : 'ck.tabCompare')}
            </button>
          ))}
        </div>
      )}

      {view === 'compare' ? (
        <CheckinCompare current={current ?? { date: activeDate, auto, photos }} previous={previous} female={female} />
      ) : (
        <>
          {/* ── Каквото вече знаем ── */}
          {autoRows.length > 0 && (
            <section className={`${styles.card} ${styles.autoCard}`}>
              <h2 className={styles.cardTitle}>{t('ck.g.auto')}</h2>
              <p className={styles.autoNote}>{t('ck.autoNote')}</p>
              <div className={styles.autoGrid}>
                {autoRows.map(({ f, v }) => (
                  <div key={f.key} className={styles.autoCell}>
                    <span className={styles.autoVal}>
                      {v}{f.unitKey ? <span className={styles.autoUnit}>{t(f.unitKey)}</span> : null}
                    </span>
                    <span className={styles.autoLabel}>{t(f.labelKey)}</span>
                  </div>
                ))}
              </div>
              {auto?.weeksOut != null && (
                <p className={styles.autoWeeks}>{t('ck.weeksOut', { n: auto.weeksOut })}</p>
              )}
            </section>
          )}

          {/* ── Въпросите ── */}
          {CHECKIN_GROUPS.map(g => {
            const fields = CHECKIN_FIELDS.filter(f => f.group === g.id && (!f.femaleOnly || female))
            if (!fields.length) return null
            return (
              <section key={g.id} className={styles.card}>
                <h2 className={styles.cardTitle}>{t(g.labelKey)}</h2>
                {fields.map(f => (
                  <div key={f.key} className={styles.field}>
                    <label className={styles.fieldLabel}>
                      {t(f.labelKey)}
                      {f.hintKey && <span className={styles.hint}>{t(f.hintKey)}</span>}
                    </label>

                    {f.type === 'scale' && (
                      <div className={styles.scale}>
                        {Array.from({ length: f.max - f.min + 1 }, (_, i) => f.min + i).map(n => (
                          <button
                            key={n}
                            type="button"
                            className={`${styles.scaleBtn} ${values[f.key] === n ? styles.scaleOn : ''}`}
                            onClick={() => set(f.key, values[f.key] === n ? null : n)}
                          >{n}</button>
                        ))}
                      </div>
                    )}

                    {f.type === 'trend' && (
                      <div className={styles.trend}>
                        {TREND.map(o => (
                          <button
                            key={o.v}
                            type="button"
                            className={`${styles.trendBtn} ${values[f.key] === o.v ? styles[o.cls] : ''}`}
                            onClick={() => set(f.key, values[f.key] === o.v ? null : o.v)}
                          >{o.icon}</button>
                        ))}
                      </div>
                    )}

                    {f.type === 'number' && (
                      <div className={styles.numRow}>
                        <input
                          className={styles.input}
                          type="number"
                          inputMode="decimal"
                          step={f.step ?? '1'}
                          value={values[f.key] ?? ''}
                          onChange={e => set(f.key, e.target.value === '' ? null : Number(e.target.value))}
                        />
                        {f.unitKey && <span className={styles.unit}>{t(f.unitKey)}</span>}
                      </div>
                    )}

                    {(f.type === 'pair' || f.type === 'triple') && (
                      <div className={styles.parts}>
                        {f.parts.map((p, i) => (
                          <input
                            key={p}
                            className={styles.input}
                            type="number"
                            inputMode="decimal"
                            step={f.step ?? '1'}
                            placeholder={f.sep && i === 0 ? t('ck.sys') : f.sep ? t('ck.dia') : String(i + 1)}
                            value={values[p] ?? ''}
                            onChange={e => set(p, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        ))}
                      </div>
                    )}

                    {f.type === 'bool' && (
                      <div className={styles.trend}>
                        {[true, false].map(b => (
                          <button
                            key={String(b)}
                            type="button"
                            className={`${styles.boolBtn} ${values[f.key] === b ? styles.boolOn : ''}`}
                            onClick={() => set(f.key, values[f.key] === b ? null : b)}
                          >{b ? t('ck.yes') : t('ck.no')}</button>
                        ))}
                      </div>
                    )}

                    {f.type === 'text' && (
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        value={values[f.key] ?? ''}
                        onChange={e => set(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </section>
            )
          })}

          {/* ── Позите ── */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t('ck.g.photos')}</h2>
            <p className={styles.autoNote}>{t('ck.photoNote')}</p>
            <div className={styles.poseGrid}>
              {POSES.map(p => (
                <div key={p.key} className={styles.poseSlot}>
                  <button
                    type="button"
                    className={`${styles.poseBtn} ${photos[p.key] ? styles.poseFilled : ''}`}
                    onClick={() => fileRefs.current[p.key]?.click()}
                    disabled={busy === p.key}
                  >
                    {photos[p.key]
                      ? <img src={photos[p.key]} alt={t(p.labelKey)} />
                      : <span className={styles.posePlus}>{busy === p.key ? '…' : '+'}</span>}
                  </button>
                  <span className={styles.poseName}>{t(p.labelKey)}</span>
                  <input
                    ref={el => { fileRefs.current[p.key] = el }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => { uploadPose(p.key, e.target.files?.[0]); e.target.value = '' }}
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            className={`${styles.submit} ${saved ? styles.submitDone : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? t('ck.saved') : saving ? '…' : current ? t('ck.update') : t('ck.send')}
          </button>

          {/* Денят на чекина. Ритуал без ден е молба; с ден е ритуал — и чак
              тогава „дължиш чекин" значи нещо, защото има спрямо какво. */}
          <div className={styles.dayRow}>
            <span className={styles.dayLabel}>{t('ck.day')}</span>
            <div className={styles.days}>
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.dayBtn} ${checkinDay === d ? styles.dayOn : ''}`}
                  onClick={() => setCheckinDay(d)}
                >{t(`daysMon.${d}`)}</button>
              ))}
            </div>
          </div>

          {rows.length > 1 && (
            <p className={styles.history}>{t('ck.history', { n: rows.length })}</p>
          )}
        </>
      )}
    </div>
  )
}
