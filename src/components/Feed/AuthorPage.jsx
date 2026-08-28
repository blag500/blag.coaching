import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import PostCard from './PostCard'
import styles from './Feed.module.css'

/**
 * Човекът зад поста, на цяла страница.
 *
 * Overlay през portal, а не таб: фийдът остава там, където си го оставил, и
 * връщането е една крачка назад, не презареждане на списък от двайсет поста.
 * Portal към body, защото табовете се движат с transform при суайп и fixed
 * вътре в тях се закача за страницата вместо за екрана.
 *
 * Показва само това, което feed_authors излага, плюс постовете на човека —
 * които и без това вече са публични във фийда. Нищо тук не е ново знание за
 * читателя, само събрано на едно място.
 */

/** „От август 2026" — месец и година, защото точният ден не значи нищо. */
function since(iso, t) {
  if (!iso) return null
  const d = new Date(iso)
  const when = d.toLocaleDateString(loc(), { month: 'long', year: 'numeric' })
  return t('feed.since', { when })
}

export default function AuthorPage({ author, onClose, onMessage }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)

  const authorId = author?.id

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    /* Страницата покрива екрана, а фонът под нея не бива да се движи, когато
       пръстът стигне до края на този списък. */
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    if (!authorId) return
    let alive = true
    setLoading(true)
    supabase
      .from('posts')
      .select('id, user_id, body, photo_url, created_at, kind, meta, post_likes(user_id), post_comments(id)')
      .eq('user_id', authorId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!alive) return
        setPosts((data ?? []).map(r => ({
          id:        r.id,
          userId:    r.user_id,
          body:      r.body,
          photoUrl:  r.photo_url,
          createdAt: r.created_at,
          kind:      r.kind ?? 'post',
          meta:      r.meta ?? null,
          author,
          likeCount: (r.post_likes ?? []).length,
          liked:     (r.post_likes ?? []).some(l => l.user_id === user?.id),
          commentCount: (r.post_comments ?? []).length,
        })))
        setLoading(false)
      })
    return () => { alive = false }
  }, [authorId, user?.id])

  if (!author) return null

  const isCoach = author.role === 'coach'
  const isMe    = author.id === profile?.id

  /* Двете числа под името. Броят се от постовете, които и без това стоят на
     екрана — не от отделна таблица със статистики, която би могла да
     разказва друго от това, което читателят вижда точно под нея. */
  const sessions = posts.filter(p => p.kind === 'training').length
  const perfect  = posts.filter(p => p.kind === 'perfect').length
  const memberSince = since(author.created_at, t)

  return createPortal(
    <div className={styles.authorPage}>
      <header className={styles.authorHero}>
        <button type="button" className={styles.authorBack} onClick={onClose} aria-label={t('header.back')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>

        <div className={styles.authorMark}>
          {author.avatar_url
            ? <img src={author.avatar_url} alt="" />
            : <span>{(author.name || '?').slice(0, 2).toUpperCase()}</span>}
        </div>

        <h1 className={styles.authorName}>{author.name || t('feed.someone')}</h1>
        {author.username && <p className={styles.authorHandle}>@{author.username}</p>}
        <p className={styles.authorMeta}>
          {isCoach && <span className={styles.coachTag}>{t('feed.coachTag')}</span>}
          {memberSince && <span>{memberSince}</span>}
        </p>
      </header>

      <div className={styles.authorBody}>
        {!isMe && (
          <button type="button" className={styles.authorMessage} onClick={onMessage}>
            {t('feed.message')}
          </button>
        )}

        {author.bio
          ? <p className={styles.authorBio}>{author.bio}</p>
          : <p className={styles.authorBioEmpty}>{isMe ? t('feed.bioEmptyMine') : t('feed.bioEmpty')}</p>}

        {(sessions > 0 || perfect > 0) && (
          <div className={styles.authorStats}>
            <div className={styles.authorStat}>
              <span className={styles.authorStatVal}>{sessions}</span>
              <span className={styles.authorStatLabel}>{t('feed.stat.sessions')}</span>
            </div>
            <div className={styles.authorStat}>
              <span className={styles.authorStatVal}>{perfect}</span>
              <span className={styles.authorStatLabel}>{t('feed.stat.perfect')}</span>
            </div>
          </div>
        )}

        <h2 className={styles.authorSection}>{t('feed.recentPosts')}</h2>

        {loading ? (
          <div className={styles.skeletons}>
            {[0, 1].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : posts.length === 0 ? (
          <p className={styles.authorBioEmpty}>{t('feed.noPosts')}</p>
        ) : (
          posts.map(p => (
            /* Картите тук са за четене: харесването и коментарите живеят във
               фийда, където постът стои сред останалите. Профилът е справка,
               не второ място, на което да се случва същото. */
            <PostCard key={p.id} post={p} readOnly />
          ))
        )}
      </div>
    </div>,
    document.body
  )
}
