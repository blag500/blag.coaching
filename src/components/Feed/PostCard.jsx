import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { usePostComments } from '../../hooks/useFeed'
import { timeAgo } from './timeAgo'
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
function Comments({ postId, onCountChange }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const { comments, loading, addComment, removeComment } = usePostComments(postId)
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
          <Avatar url={c.author?.avatar_url} name={c.author?.name} />
          <div className={styles.commentBody}>
            <span className={styles.commentAuthor}>
              {c.author?.name || t('feed.someone')}
              <span className={styles.commentTime}>{timeAgo(c.created_at, t)}</span>
            </span>
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

export default function PostCard({ post, onToggleLike, onDelete, onCommentCountChange }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const [openComments, setOpenComments] = useState(false)
  const [confirmDrop, setConfirmDrop]   = useState(false)

  const isCoach = profile?.role === 'coach'
  const mine    = post.userId === user?.id
  const authorIsCoach = post.author?.role === 'coach'

  return (
    <article className={styles.post}>
      <header className={styles.postHead}>
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
        {(mine || isCoach) && (
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

      {post.body && <p className={styles.postBody}>{post.body}</p>}
      {post.photoUrl && (
        <div className={styles.postPhoto}>
          <img src={post.photoUrl} alt="" loading="lazy" />
        </div>
      )}

      <footer className={styles.postFoot}>
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
      </footer>

      {openComments && (
        <Comments postId={post.id} onCountChange={d => onCommentCountChange(post.id, d)} />
      )}
    </article>
  )
}
