import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import InsightPicker from './InsightPicker'
import styles from './PostSheet.module.css'

const MAX_CHARS = 600
const MAX_TITLE = 80

/**
 * Писането е екран, не поле.
 *
 * Дотук формулярът седеше най-отгоре на потока и се разгъваше на фокус. Това
 * значеше, че страницата иска нещо от теб, преди да ти е дала нещо — а и че
 * пишеш в прозорче високо три реда, докато клавиатурата яде долната половина
 * от екрана.
 *
 * През портал към body, а не на място: разделите се движат с трансформация при
 * плъзгане, а `position: fixed` вътре в трансформиран родител се закача за
 * него, не за прозореца. Листът би пътувал заедно с фийда под пръста.
 */
export default function PostSheet({ open, onClose, onPost }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()

  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [photo, setPhoto]   = useState(null)    // { url, path }
  const [insight, setInsight] = useState(null)  // { kind, meta, labelKey }
  const [picking, setPicking] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)
  const fileRef  = useRef(null)
  const inputRef = useRef(null)

  /* Клавиатурата тръгва заедно с листа. Отваряш го, за да пишеш — едно
     докосване по средата е стъпка, която никой не е искал. */
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(id)
  }, [open])

  /* Отзад не се скролва, докато листът стои отпред. */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const canPost = !busy && (body.trim().length > 0 || title.trim().length > 0 || photo || insight)

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

  async function close(discard = true) {
    if (discard && photo) await dropPhoto()
    setTitle('')
    setBody('')
    setInsight(null)
    setError(null)
    onClose()
  }

  async function submit() {
    if (!canPost) return
    setBusy(true)
    setError(null)
    const { error: err } = await onPost({
      body,
      title,
      photoUrl: photo?.url ?? null,
      kind: insight?.kind ?? null,
      meta: insight?.meta ?? null,
    })
    setBusy(false)
    if (err) {
      setError(t('feed.err.post'))
      // Отказът се усеща, не само се чете: телефонът често вече е свален.
      haptic('reject')
      return
    }
    setPhoto(null)
    haptic('success')
    close(false)
  }

  return createPortal(
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label={t('feed.composer.title')}>
      <div className={styles.sheet}>
        <header className={styles.head}>
          <button type="button" className={styles.close} onClick={() => close()} aria-label={t('feed.composer.cancel')}>×</button>
          <button
            type="button"
            className={styles.post}
            onClick={submit}
            disabled={!canPost}
          >
            {busy ? '…' : t('feed.composer.post')}
          </button>
        </header>

        <div className={styles.who}>
          <div className={styles.avatar}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className={styles.avatarImg} />
              : (profile?.name || '?')[0].toUpperCase()}
          </div>
          <span className={styles.name}>{profile?.name}</span>
        </div>

        {/* Заглавието стои над текста и е по желание: празно поле не се
            записва и не се рисува. */}
        <input
          className={styles.title}
          value={title}
          maxLength={MAX_TITLE}
          placeholder={t('feed.composer.titlePh')}
          onChange={e => setTitle(e.target.value)}
        />
        <div className={styles.titleRule} />

        <textarea
          ref={inputRef}
          className={styles.input}
          value={body}
          maxLength={MAX_CHARS}
          placeholder={t('feed.composer.placeholder')}
          onChange={e => setBody(e.target.value)}
        />

        {insight && (
          <div className={styles.attached}>
            <span className={styles.attachedIcon}><Pictogram name={insight.icon} size={18} /></span>
            <span className={styles.attachedText}>{t(insight.labelKey)}</span>
            <button type="button" className={styles.attachedDrop} onClick={() => setInsight(null)} aria-label={t('feed.detach')}>×</button>
          </div>
        )}

        {photo && (
          <div className={styles.photo}>
            <img src={photo.url} alt="" />
            <button type="button" className={styles.photoDrop} onClick={dropPhoto} aria-label={t('feed.removePhoto')}>×</button>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.spacer} />

        <footer className={styles.tools}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          <button type="button" className={styles.tool} onClick={() => fileRef.current?.click()} disabled={busy}>
            <Pictogram name="camera" size={17} />
            {t('feed.composer.photo')}
          </button>
          {/* Каквото приложението вече знае за деня ти. Постът за тренировка,
              написан на ръка, е същият пост — само че с числа, преписани от
              друг екран. */}
          <button type="button" className={styles.tool} onClick={() => setPicking(true)} disabled={busy}>
            <Pictogram name="trend" size={17} />
            {t('feed.composer.fromApp')}
          </button>
          <span className={styles.count}>{body.length}/{MAX_CHARS}</span>
        </footer>
      </div>

      {picking && (
        <InsightPicker
          onPick={x => { setInsight(x); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>,
    document.body
  )
}
