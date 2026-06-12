import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './ShowcasePage.module.css'

const CATEGORIES = [
  { id: null,        label: 'ВСИЧКО' },
  { id: 'training',  label: 'ТРЕНИНГ' },
  { id: 'nutrition', label: 'ХРАНЕНЕ' },
]

const CAT_LABEL = { training: 'ТРЕНИНГ', nutrition: 'ХРАНЕНЕ' }
const CAT_COLOR = { training: '#FFB74D', nutrition: '#66BB6A' }

export default function ShowcasePage({ onBack }) {
  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('showcase_posts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [])

  const visible = filter ? posts.filter(p => p.category === filter) : posts

  if (selected) {
    return <PostDetail post={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">←</button>
        <div>
          <h1 className={styles.title}>ВДЪХНОВЕНИЕ</h1>
          <p className={styles.subtitle}>Тренинг и хранене от треньора</p>
        </div>
      </header>

      <div className={styles.filterRow}>
        {CATEGORIES.map(c => (
          <button
            key={String(c.id)}
            type="button"
            className={`${styles.filterBtn} ${filter === c.id ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.empty}>Зарежда...</p>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>Все още няма публикации.</p>
      ) : (
        <div className={styles.list}>
          {visible.map(post => (
            <button
              key={post.id}
              type="button"
              className={styles.card}
              onClick={() => setSelected(post)}
            >
              {post.photo_url && (
                <img src={post.photo_url} className={styles.cardImg} alt="" />
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span
                    className={styles.catBadge}
                    style={{ color: CAT_COLOR[post.category], borderColor: CAT_COLOR[post.category] + '55' }}
                  >
                    {CAT_LABEL[post.category]}
                  </span>
                  <span className={styles.cardDate}>
                    {new Date(post.created_at).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </span>
                </div>
                <h2 className={styles.cardTitle}>{post.title}</h2>
                {post.body && (
                  <p className={styles.cardPreview}>{post.body}</p>
                )}
              </div>
              <span className={styles.cardArrow}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PostDetail({ post, onBack }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">←</button>
        <span
          className={styles.catBadge}
          style={{ color: CAT_COLOR[post.category], borderColor: CAT_COLOR[post.category] + '55' }}
        >
          {CAT_LABEL[post.category]}
        </span>
      </header>

      {post.photo_url && (
        <img src={post.photo_url} className={styles.detailImg} alt="" />
      )}

      <div className={styles.detailBody}>
        <p className={styles.detailDate}>
          {new Date(post.created_at).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className={styles.detailTitle}>{post.title}</h1>
        {post.body && (
          <p className={styles.detailText}>{post.body}</p>
        )}
      </div>
    </div>
  )
}
