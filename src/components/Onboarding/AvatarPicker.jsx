import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import AvatarCropper from '../Profile/AvatarCropper'
import { CameraIcon } from './StepIcons'
import styles from './Onboarding.module.css'

/**
 * The face, put on at the very start of onboarding. The client already has a
 * session by the time they reach either flow, so the same bucket and path the
 * Profile screen writes to works here unchanged — and the coach sees a person
 * rather than an initial the moment the intake lands.
 *
 * Self-contained: it owns the hidden file input, the cropper, and the upload,
 * so a step only has to drop <AvatarPicker /> under the heading.
 */
export default function AvatarPicker() {
  const { t } = useSettings()
  const { profile, user, updateProfile } = useAuth()
  const inputRef = useRef(null)
  const [cropFile, setCropFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState(profile?.avatar_url || '')

  function pick(e) {
    const file = e.target.files?.[0]
    if (file) setCropFile(file)
    e.target.value = ''
  }

  async function crop(blob) {
    setCropFile(null)
    if (!user || !blob) return
    setBusy(true)
    const path = `${user.id}/avatar.jpg`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const next = `${publicUrl}?t=${Date.now()}`
      setUrl(next)
      await updateProfile({ avatar_url: next })
    }
    setBusy(false)
  }

  return (
    <>
      {cropFile && (
        <AvatarCropper file={cropFile} onConfirm={crop} onCancel={() => setCropFile(null)} />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={pick}
      />
      {/* A ring of the app's glass, gold-lit — the same treatment the buttons
          wear, rather than a flat well. */}
      <button
        className={styles.avatarPick}
        onClick={() => inputRef.current?.click()}
        type="button"
        aria-label={t('ob.avatar.aria')}
      >
        {url
          ? <img className={styles.avatarImg} src={url} alt="" />
          : <span className={styles.avatarIcon}><CameraIcon /></span>}
        {busy && <span className={styles.avatarBusy} />}
      </button>
      <p className={styles.avatarHint}>{url ? t('ob.avatar.change') : t('ob.avatar.add')}</p>
    </>
  )
}
