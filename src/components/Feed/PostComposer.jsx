import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './Feed.module.css'

const MAX_CHARS = 600

/**
 * Полето за писане, седнало най-отгоре на фийда.
 *
 * Затворено е един ред висок и се разгръща на фокус — най-честото действие
 * тук е четенето, а разтворен формуляр, който бута първия пост под сгъвката,
 * кара страницата да иска нещо от теб, преди да ти е дала нещо.
 */

/** Отметка в кръг: същият знак, с който приложението казва „готово". */
function MarkGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
      <path d="M7.8 12.3l2.9 2.9 5.5-6.1" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PostComposer({ onPost }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()

  const [open, setOpen]         = useState(false)
  const [body, setBody]         = useState('')
  const [photo, setPhoto]       = useState(null)   // { url, path }
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState(null)
  /* Публикувано — за няколко секунди.
     Дотук успешното публикуване изглеждаше точно като нищо: полето се
     затваряше и това беше. Постът наистина се появява отгоре, но човек, който
     е натиснал и е погледнал настрани, няма как да знае, че е минало. */
  const [posted, setPosted]     = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!posted) return
    const id = setTimeout(() => setPosted(false), 3000)
    return () => clearTimeout(id)
  }, [posted])

  const canPost = !busy && (body.trim().length > 0 || photo)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    setBusy(true)
    setError(null)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('post-photos').upload(path, file)
    if (upErr) { setError(t('feed.err.upload')); setBusy(false); return }
    const { data: { publicUrl } } = supabase.storage.from('post-photos').getPublicUrl(path)
    setPhoto({ url: publicUrl, path })
    setBusy(false)
  }

  /* Махната снимка се трие и от кофата. Иначе всеки размислил се човек
     оставя файл, който никой ред в базата вече не сочи. */
  async function dropPhoto() {
    const p = photo
    setPhoto(null)
    if (p?.path) await supabase.storage.from('post-photos').remove([p.path])
  }

  async function submit() {
    if (!canPost) return
    setBusy(true)
    setError(null)
    const { error: err } = await onPost({ body, photoUrl: photo?.url ?? null })
    setBusy(false)
    if (err) {
      setError(t('feed.err.post'))
      // Отказът се усеща, не само се чете: телефонът често вече е свален.
      haptic('reject')
      return
    }
    setBody('')
    setPhoto(null)
    setOpen(false)
    setPosted(true)
    haptic('success')
  }

  return (
    <div className={`${styles.composer} ${open ? styles.composerOpen : ''}`}>
      {posted && (
        <p className={styles.composerPosted} role="status">
          <MarkGlyph />
          {t('feed.posted')}
        </p>
      )}
      <div className={styles.composerTop}>
        <div className={styles.avatar}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className={styles.avatarImg} />
            : (profile?.name || '?')[0].toUpperCase()}
        </div>
        <textarea
          className={styles.composerInput}
          value={body}
          maxLength={MAX_CHARS}
          rows={open ? 3 : 1}
          placeholder={t('feed.composer.placeholder')}
          onFocus={() => setOpen(true)}
          onChange={e => setBody(e.target.value)}
        />
      </div>

      {photo && (
        <div className={styles.composerPhoto}>
          <img src={photo.url} alt="" />
          <button type="button" className={styles.composerPhotoDrop} onClick={dropPhoto} aria-label={t('feed.removePhoto')}>×</button>
        </div>
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}

      {open && (
        <div className={styles.composerActions}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          <button
            type="button"
            className={styles.composerPhotoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {t('feed.composer.photo')}
          </button>
          <span className={styles.composerCount}>{body.length}/{MAX_CHARS}</span>
          <button
            type="button"
            className={styles.composerCancel}
            onClick={() => { setOpen(false); setBody(''); if (photo) dropPhoto() }}
          >
            {t('feed.composer.cancel')}
          </button>
          <button
            type="button"
            className={styles.composerSubmit}
            onClick={submit}
            disabled={!canPost}
          >
            {busy ? '…' : t('feed.composer.post')}
          </button>
        </div>
      )}
    </div>
  )
}
