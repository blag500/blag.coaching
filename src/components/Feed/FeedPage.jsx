import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useFeed } from '../../hooks/useFeed'
import AppHeader from '../AppHeader/AppHeader'
import PostSheet from './PostSheet'
import PostCard from './PostCard'
import Pictogram from '../Pictogram/Pictogram'
import AuthorPage from './AuthorPage'
import SearchResults, { SearchField } from './FeedSearch'
import styles from './Feed.module.css'
import sheetStyles from './PostSheet.module.css'

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
  const [term, setTerm] = useState('')
  const [writing, setWriting] = useState(false)
  /* Две букви, преди да се пита нещо: една буква намира половината хора и
     всеки трети пост, тоест не намира нищо. */
  const searching = term.trim().length >= 2
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

      <SearchField term={term} onTerm={setTerm} />

      {/* Писането е екран, не поле най-отгоре: най-честото действие тук е
          четенето, а разгънат формуляр иска нещо от теб, преди страницата да
          ти е дала нещо. */}
      {!searching && !author && (
        <button
          type="button"
          className={sheetStyles.openBtn}
          onClick={() => setWriting(true)}
          aria-label={t('feed.compose')}
        >
          <Pictogram name="note" size={22} />
        </button>
      )}

      <PostSheet open={writing} onClose={() => setWriting(false)} onPost={addPost} />

      {author && (
        <AuthorPage
          author={author}
          onClose={() => setAuthor(null)}
          onMessage={() => { const who = author; setAuthor(null); onNavigate('chat', { peer: who.id }) }}
        />
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}

      {searching ? (
        <SearchResults term={term} onOpenAuthor={setAuthor} />
      ) : loading ? (
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
          {posts.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              /* Само за първите — стълбата има смисъл при отваряне на
                 страницата, а не когато осемдесетият пост дочака своя ред. */
              index={i < 6 ? i : null}
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
