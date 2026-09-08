import { useSettings } from '../../contexts/SettingsContext'
import { useSearch } from '../../hooks/useSearch'
import PostCard from './PostCard'
import Pictogram from '../Pictogram/Pictogram'
import styles from './Feed.module.css'

/**
 * Търсене във фийда.
 *
 * Полето стои отгоре и не крие нищо, докато е празно — фийдът си тече под
 * него. Щом се напишат две букви, резултатите заемат мястото на фийда:
 * търсенето е питане, а отговорът на питане не се чете между чужди постове.
 *
 * Два вида отговор, в този ред: хора, после постове. Човекът е по-често
 * търсеното — за пост се сещаш по това кой го е писал, не по думите в него.
 *
 * Редът с човек само отваря профила му. Поканата и следването живеят там и
 * не се преписват тук: един и същ бутон на две места се разминава в мига, в
 * който едното се промени.
 */

function Row({ person, onOpen }) {
  const url = person?.avatar_url
  return (
    <button type="button" className={styles.hitRow} onClick={() => onOpen?.(person)}>
      <span className={styles.avatar}>
        {url
          ? <img src={url} alt="" className={styles.avatarImg} />
          : (person?.name || '?')[0].toUpperCase()}
      </span>
      <span className={styles.hitWho}>
        <span className={styles.hitName}>{person?.name || '—'}</span>
        {person?.username && <span className={styles.hitHandle}>@{person.username}</span>}
      </span>
    </button>
  )
}

export function SearchField({ term, onTerm }) {
  const { t } = useSettings()
  return (
    <div className={styles.searchWrap}>
      <svg className={styles.searchIcon} viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
      <input
        className={styles.searchInput}
        type="search"
        value={term}
        onChange={e => onTerm(e.target.value)}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
      />
      {term && (
        <button type="button" className={styles.searchClear} onClick={() => onTerm('')}
                aria-label={t('fr.clear')}>×</button>
      )}
    </div>
  )
}

export default function SearchResults({ term, onOpenAuthor }) {
  const { t } = useSettings()
  const { people, posts, loading } = useSearch(term)

  if (loading) {
    return (
      <div className={styles.skeletons}>
        {[0, 1, 2].map(i => <div key={i} className={styles.skeleton} />)}
      </div>
    )
  }

  if (people.length === 0 && posts.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>
          <Pictogram name="friends" size={26} />
        </span>
        <p className={styles.emptyLead}>{t('search.none')}</p>
        <p className={styles.emptySub}>{t('search.noneSub')}</p>
      </div>
    )
  }

  return (
    <>
      {people.length > 0 && (
        <section className={styles.hitSection}>
          <h2 className={styles.hitTitle}>{t('search.people')}</h2>
          {people.map(p => <Row key={p.id} person={p} onOpen={onOpenAuthor} />)}
        </section>
      )}

      {posts.length > 0 && (
        <section className={styles.hitSection}>
          <h2 className={styles.hitTitle}>{t('search.posts')}</h2>
          {/* Картите тук са за четене, както в профила: харесването и
              коментарите живеят във фийда, където постът стои сред
              останалите. */}
          {posts.map(p => (
            <PostCard key={p.id} post={p} readOnly onOpenAuthor={onOpenAuthor} />
          ))}
        </section>
      )}
    </>
  )
}
