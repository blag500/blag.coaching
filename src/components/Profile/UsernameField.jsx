import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './Profile.module.css'

/**
 * Краткото име.
 *
 * Единственото поле в профила, което може да бъде заето от друг, затова е и
 * единственото, което отговаря преди да си натиснал запис: човек, разбрал
 * след три опита, че името е заето, го е разбрал два пъти по-късно от нужното.
 *
 * Проверката е удобство, не гаранция — между отговора „свободно" и записа
 * стои време, в което друг може да го вземе. Истинското правило е уникалният
 * индекс в базата (миграция 092), а тук грешката от него се превежда на
 * човешки.
 */

/** Каквото се напише, слиза до това, което базата приема. */
function normalize(raw) {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

export default function UsernameField() {
  const { profile, updateProfile } = useAuth()
  const { t } = useSettings()

  const [value, setValue]   = useState(profile?.username ?? '')
  const [state, setState]   = useState('idle') // idle | checking | free | taken | short | saving | saved
  const timer = useRef(null)

  useEffect(() => { setValue(profile?.username ?? '') }, [profile?.username])

  const mine  = (profile?.username ?? '')
  const dirty = value !== mine

  useEffect(() => {
    clearTimeout(timer.current)
    if (!dirty)          { setState('idle');  return }
    if (value === '')    { setState('free');  return }  // празно = махам го
    if (value.length < 3) { setState('short'); return }

    setState('checking')
    /* Изчаква пръста да спре. Заявка на всяка буква пита базата шест пъти за
       име, което човекът още не е дописал. */
    timer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('feed_authors')
        .select('id')
        .ilike('username', value)
        .maybeSingle()
      setState(data && data.id !== profile?.id ? 'taken' : 'free')
    }, 450)

    return () => clearTimeout(timer.current)
  }, [value, dirty, profile?.id])

  async function save() {
    setState('saving')
    const { error } = await updateProfile({ username: value || null })
    if (error) {
      // 23505 е нарушен уникален индекс — някой е взел името междувременно.
      setState(error.code === '23505' ? 'taken' : 'idle')
      return
    }
    setState('saved')
    setTimeout(() => setState('idle'), 1800)
  }

  const hint = {
    checking: t('un.checking'),
    free:     value ? t('un.free') : t('un.willClear'),
    taken:    t('un.taken'),
    short:    t('un.short'),
    saved:    t('un.saved'),
  }[state] ?? t('un.hint')

  return (
    <div className={styles.usernameWrap}>
      <label className={styles.label} htmlFor="username-input">{t('un.label')}</label>
      <div className={styles.usernameRow}>
        <span className={styles.usernameAt}>@</span>
        <input
          id="username-input"
          className={styles.usernameInput}
          value={value}
          onChange={e => setValue(normalize(e.target.value))}
          placeholder={t('un.placeholder')}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
        />
        {dirty && (state === 'free' || state === 'saved') && (
          <button
            type="button"
            className={styles.usernameSave}
            onClick={save}
            disabled={state === 'saving'}
          >
            {state === 'saved' ? '✓' : t('profile.save')}
          </button>
        )}
      </div>
      <span className={`${styles.usernameHint} ${state === 'taken' ? styles.usernameHintBad : ''} ${state === 'free' || state === 'saved' ? styles.usernameHintGood : ''}`}>
        {hint}
      </span>
    </div>
  )
}
