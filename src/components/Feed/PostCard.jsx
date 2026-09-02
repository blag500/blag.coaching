import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { usePostComments } from '../../hooks/useFeed'
import { timeAgo } from './timeAgo'
import Pictogram from '../Pictogram/Pictogram'
import styles from './Feed.module.css'

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill={filled ? 'currentColor' : 'none'}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
)

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

function Avatar({ url, name }) {
  return (
    <div className={styles.avatar}>
      {url ? <img src={url} alt="" className={styles.avatarImg} /> : (name || '?')[0].toUpperCase()}
    </div>
  )
}

/** Нишката под поста — чете се чак когато някой я отвори. */
function Comments({ post, onCountChange, onOpenAuthor, readOnly }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const { comments, loading, addComment, removeComment } = usePostComments(post.id, post)
  const [draft, setDraft] = useState('')
  const [busy, setBusy]   = useState(false)
  const isCoach = profile?.role === 'coach'

  async function send() {
    if (!draft.trim() || busy) return
    setBusy(true)
    const { error } = await addComment(draft)
    setBusy(false)
    if (error) return
    setDraft('')
    onCountChange(1)
  }

  async function drop(id) {
    const { error } = await removeComment(id)
    if (!error) onCountChange(-1)
  }

  return (
    <div className={styles.comments}>
      {loading ? (
        <p className={styles.commentsLoading}>…</p>
      ) : comments.map(c => (
        <div key={c.id} className={styles.comment}>
          {/* Кръгчето и името на коментиращия водят към него, точно както
              водят при автора на поста отгоре. Дотук не водеха никъде: човек
              коментира под теб, а единственият начин да му пишеш беше да го
              намериш някъде другаде. Един бутон около двете, по същия довод —
              сочат едно и също място. */}
          <button
            type="button"
            className={styles.commentWhoBtn}
            onClick={() => c.author && onOpenAuthor?.(c.author)}
            disabled={readOnly || !c.author}
          >
            <Avatar url={c.author?.avatar_url} name={c.author?.name} />
          </button>
          <div className={styles.commentBody}>
            <button
              type="button"
              className={styles.commentAuthorBtn}
              onClick={() => c.author && onOpenAuthor?.(c.author)}
              disabled={readOnly || !c.author}
            >
              <span className={styles.commentAuthor}>
                {c.author?.name || t('feed.someone')}
                <span className={styles.commentTime}>{timeAgo(c.created_at, t)}</span>
              </span>
            </button>
            <p className={styles.commentText}>{c.body}</p>
          </div>
          {(c.user_id === user?.id || isCoach) && (
            <button type="button" className={styles.commentDrop} onClick={() => drop(c.id)} aria-label={t('feed.delete')}>×</button>
          )}
        </div>
      ))}

      <div className={styles.commentForm}>
        <input
          className={styles.commentInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
          placeholder={t('feed.comment.placeholder')}
          maxLength={400}
        />
        <button type="button" className={styles.commentSend} onClick={send} disabled={!draft.trim() || busy}>
          {t('feed.comment.send')}
        </button>
      </div>
    </div>
  )
}

/* Какво рисува всеки вид постижение.
   Таблица, а не поредица от if-ове: нов вид е един ред тук плюс два ключа в
   речника, а не четвърто разклонение в средата на картата.

   Приложението вече не публикува само, но таблицата остава: постовете отпреди
   това стоят в базата и трябва да продължат да се четат. Изтриването ѝ би
   оставило историята на фийда празни карти. */
const ACHIEVEMENTS = {
  training: {
    icon: 'training',
    titleKey: 'feed.ach.training',
    detail: (m, t) => [
      m?.block,
      m?.exercises ? t('feed.ach.exercises', { n: m.exercises }) : null,
    ].filter(Boolean).join(' · '),
  },
  perfect: {
    icon: 'trend',
    titleKey: 'feed.ach.perfect',
    detail: (m, t) => [
      m?.kcal ? `${m.kcal} ${t('unit.kcal')}` : null,
      m?.habits ? t('feed.ach.habits', { n: m.habits }) : null,
    ].filter(Boolean).join(' · '),
  },
  streak: {
    icon: 'calendar',
    titleKey: 'feed.ach.streak',
    detail: (m, t) => (m?.days ? t('feed.ach.days', { n: m.days }) : ''),
  },
  plan: {
    icon: 'dashboard',
    titleKey: 'feed.ach.plan',
    detail: () => '',
  },
}

export default function PostCard({ post, onToggleLike, onDelete, onCommentCountChange, onOpenAuthor, readOnly = false }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const [openComments, setOpenComments] = useState(false)
  const [confirmDrop, setConfirmDrop]   = useState(false)

  const isCoach = profile?.role === 'coach'
  const mine    = post.userId === user?.id
  const authorIsCoach = post.author?.role === 'coach'

  const achievement = ACHIEVEMENTS[post.kind] ?? null
  const detail = achievement ? achievement.detail(post.meta, t) : ''

  return (
    <article className={`${styles.post} ${achievement ? styles.postAchievement : ''}`}>
      <header className={styles.postHead}>
        {/* Кръгчето и името водят към човека. Един бутон около двете, а не
            два поотделно: те сочат едно и също място, а две мишени, залепени
            една за друга, се различават само от някого, който вече знае, че
            са две. */}
        <button
          type="button"
          className={styles.postWhoBtn}
          onClick={() => post.author && onOpenAuthor?.(post.author)}
          disabled={readOnly || !post.author}
        >
        <Avatar url={post.author?.avatar_url} name={post.author?.name} />
        <div className={styles.postWho}>
          <span className={styles.postAuthor}>
            {post.author?.name || t('feed.someone')}
            {/* Постовете на треньора носят знак, защото на едно и също място
                стоят съвет и разговор, а тези двете не тежат еднакво. */}
            {authorIsCoach && <span className={styles.coachTag}>{t('feed.coachTag')}</span>}
          </span>
          <span className={styles.postTime}>{timeAgo(post.createdAt, t)}</span>
        </div>
        </button>
        {!readOnly && (mine || isCoach) && (
          confirmDrop ? (
            <div className={styles.postDropRow}>
              <button type="button" className={styles.postDropYes} onClick={() => onDelete(post.id)}>
                {t('feed.delete.confirm')}
              </button>
              <button type="button" className={styles.postDropNo} onClick={() => setConfirmDrop(false)}>
                {t('feed.delete.cancel')}
              </button>
            </div>
          ) : (
            <button type="button" className={styles.postMenu} onClick={() => setConfirmDrop(true)} aria-label={t('feed.delete')}>×</button>
          )
        )}
      </header>

      {achievement ? (
        /* Постижението няма текст — то е значка. Рисунката носи вида, редът
           отдолу носи числата, а рамката в акцента отделя „приложението каза"
           от „човекът написа", без да добавя надпис, който да го обяснява. */
        <div className={styles.achievement}>
          <span className={styles.achievementIcon}>
            <Pictogram name={achievement.icon} size={22} />
          </span>
          <span className={styles.achievementText}>
            <span className={styles.achievementTitle}>{t(achievement.titleKey)}</span>
            {detail && <span className={styles.achievementDetail}>{detail}</span>}
          </span>
        </div>
      ) : (
        <>
          {post.body && <p className={styles.postBody}>{post.body}</p>}
          {post.photoUrl && (
            <div className={styles.postPhoto}>
              <img src={post.photoUrl} alt="" loading="lazy" />
            </div>
          )}
        </>
      )}

      {!readOnly && <footer className={styles.postFoot}>
        <button
          type="button"
          className={`${styles.postAction} ${post.liked ? styles.postActionOn : ''}`}
          onClick={() => onToggleLike(post.id)}
          aria-pressed={post.liked}
        >
          <HeartIcon filled={post.liked} />
          {post.likeCount > 0 && <span>{post.likeCount}</span>}
        </button>
        <button
          type="button"
          className={`${styles.postAction} ${openComments ? styles.postActionOn : ''}`}
          onClick={() => setOpenComments(v => !v)}
        >
          <CommentIcon />
          {post.commentCount > 0 && <span>{post.commentCount}</span>}
        </button>
      </footer>}

      {!readOnly && openComments && (
        <Comments
          post={post}
          onCountChange={d => onCommentCountChange(post.id, d)}
          onOpenAuthor={onOpenAuthor}
          readOnly={readOnly}
        />
      )}
    </article>
  )
}
