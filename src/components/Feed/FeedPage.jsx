import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useFeed } from '../../hooks/useFeed'
import AppHeader from '../AppHeader/AppHeader'
import PostComposer from './PostComposer'
import PostCard from './PostCard'
import Pictogram from '../Pictogram/Pictogram'
import AuthorPage from './AuthorPage'
import styles from './Feed.module.css'

/**
 * Общата зала.
 *
 * Мястото, което таблото „Днес" освободи, когато се прибра в Профил. Двете
 * не си приличат по нищо и точно затова размяната работи: таблото е за теб
 * сам със себе си, а това е единственият екран, на който клиентите се
 * виждат един друг.
 */
export default function FeedPage({ onNavigate, onMenuOpen }) {
  const { profile } = useAuth()
  const { t } = useSettings()
  const [author, setAuthor] = useState(null)
  const {
    posts, loading, error, hasMore,
    loadMore, addPost, removePost, toggleLike, bumpCommentCount,
  } = useFeed()

  return (
    <div className={styles.page}>
      <AppHeader
        onMenuOpen={onMenuOpen}
        title={t('nav.feed')}
        avatarUrl={profile?.avatar_url}
        avatarInitial={(profile?.name || '?')[0].toUpperCase()}
        onAvatarClick={() => onNavigate('profile')}
      />

      <PostComposer onPost={addPost} />

      {author && (
        <AuthorPage
          author={author}
          onClose={() => setAuthor(null)}
          onMessage={() => { setAuthor(null); onNavigate('chat') }}
        />
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}

      {loading ? (
        <div className={styles.skeletons}>
          {[0, 1, 2].map(i => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Pictogram name="chat" size={26} />
          </span>
          <p className={styles.emptyLead}>{t('feed.empty')}</p>
          <p className={styles.emptySub}>{t('feed.emptySub')}</p>
        </div>
      ) : (
        <>
          {posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              onToggleLike={toggleLike}
              onDelete={removePost}
              onCommentCountChange={bumpCommentCount}
              onOpenAuthor={setAuthor}
            />
          ))}
          {hasMore && (
            <button type="button" className={styles.moreBtn} onClick={loadMore}>
              {t('feed.more')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
