import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PAGE = 20

const POST_SELECT = `
  id, user_id, body, photo_url, created_at, kind, meta,
  post_likes(user_id),
  post_comments(id)
`

const COMMENT_SELECT = 'id, post_id, user_id, body, created_at'

/**
 * Имената и снимките на авторите.
 *
 * Не са вградени в заявката за постовете, защото RLS на profiles пуска само
 * собствения ред: един клиент не вижда профила на друг, и с право — там стоят
 * имейл, калории, цели. Затова четенето минава през public.feed_authors, който
 * излага само име, снимка, роля и био (миграции 088 и 090).
 */
async function fetchAuthors(ids) {
  const wanted = [...new Set(ids.filter(Boolean))]
  if (wanted.length === 0) return {}
  const { data } = await supabase
    .from('feed_authors')
    .select('id, name, avatar_url, role, bio, created_at')
    .in('id', wanted)
  return Object.fromEntries((data ?? []).map(a => [a.id, a]))
}

/* Един ред от заявката, изравнен до това, което картата рисува.
   Харесванията идват заедно с поста, защото едно и също поле отговаря на два
   въпроса — колко са и мое ли е едното — а два отделни отговора биха могли да
   си противоречат. */
function shape(row, myId, authors) {
  const likes = row.post_likes ?? []
  return {
    id:        row.id,
    userId:    row.user_id,
    body:      row.body,
    photoUrl:  row.photo_url,
    createdAt: row.created_at,
    kind:      row.kind ?? 'post',
    meta:      row.meta ?? null,
    author:    authors[row.user_id] ?? null,
    likeCount: likes.length,
    liked:     likes.some(l => l.user_id === myId),
    commentCount: (row.post_comments ?? []).length,
  }
}

export function useFeed() {
  const { user } = useAuth()
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [hasMore, setHasMore] = useState(false)

  /* Авторите, вече прочетени в тази сесия. Втора страница обикновено е от
     същите хора, а за име, което вече е на екрана, няма какво да се пита. */
  const authorCache = useRef({})

  const load = useCallback(async (offset = 0) => {
    if (!user?.id) return
    const { data, error: err } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)

    if (err) { setError(err.message); setLoading(false); return }

    const rows = data ?? []
    const missing = rows.map(r => r.user_id).filter(id => !authorCache.current[id])
    if (missing.length) {
      authorCache.current = { ...authorCache.current, ...(await fetchAuthors(missing)) }
    }

    const shaped = rows.map(r => shape(r, user.id, authorCache.current))
    setPosts(prev => (offset === 0 ? shaped : [...prev, ...shaped]))
    setHasMore(rows.length === PAGE)
    setError(null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { setLoading(true); load(0) }, [load])

  const refresh  = useCallback(() => load(0), [load])
  const loadMore = useCallback(() => load(posts.length), [load, posts.length])

  /* Публикуване.
     Постът се дописва в списъка от отговора на сървъра, не от това, което е
     било в полето — така времето на екрана е времето в базата, а не времето
     на телефона, който може да е с половин час напред. */
  const addPost = useCallback(async ({ body, photoUrl }) => {
    if (!user?.id) return { error: 'no user' }
    const { data, error: err } = await supabase
      .from('posts')
      .insert({ user_id: user.id, kind: 'post', body: body?.trim() || null, photo_url: photoUrl ?? null })
      .select(POST_SELECT)
      .single()
    if (err) return { error: err.message }

    if (!authorCache.current[user.id]) {
      authorCache.current = { ...authorCache.current, ...(await fetchAuthors([user.id])) }
    }
    setPosts(prev => [shape(data, user.id, authorCache.current), ...prev])
    return { data }
  }, [user?.id])

  const removePost = useCallback(async (id) => {
    const before = posts
    setPosts(prev => prev.filter(p => p.id !== id))
    const { error: err } = await supabase.from('posts').delete().eq('id', id)
    if (err) { setPosts(before); return { error: err.message } }
    return {}
  }, [posts])

  /* Харесване.
     Броят се мести на екрана веднага и се връща назад, ако редът не мине —
     на едно сърце не се чака кръгче. */
  const toggleLike = useCallback(async (id) => {
    if (!user?.id) return
    const post = posts.find(p => p.id === id)
    if (!post) return
    const liked = post.liked

    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, liked: !liked, likeCount: p.likeCount + (liked ? -1 : 1) }
      : p))

    const q = liked
      ? supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id)
      : supabase.from('post_likes').insert({ post_id: id, user_id: user.id })
    const { error: err } = await q
    if (err) {
      setPosts(prev => prev.map(p => p.id === id
        ? { ...p, liked, likeCount: p.likeCount + (liked ? 1 : -1) }
        : p))
    }
  }, [posts, user?.id])

  /* Броят коментари стои на картата, а самите коментари се четат чак когато
     някой отвори нишката — фийд от двайсет поста иначе би дърпал всеки
     написан ред, за да покаже едно число. */
  const bumpCommentCount = useCallback((id, delta) => {
    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
      : p))
  }, [])

  return {
    posts, loading, error, hasMore,
    refresh, loadMore, addPost, removePost, toggleLike, bumpCommentCount,
  }
}

/** Коментарите на един пост — зареждат се при отваряне на нишката. */
export function usePostComments(postId) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const authorCache = useRef({})

  const attach = useCallback(async (rows) => {
    const missing = rows.map(r => r.user_id).filter(id => !authorCache.current[id])
    if (missing.length) {
      authorCache.current = { ...authorCache.current, ...(await fetchAuthors(missing)) }
    }
    return rows.map(r => ({ ...r, author: authorCache.current[r.user_id] ?? null }))
  }, [])

  useEffect(() => {
    if (!postId) return
    let alive = true
    setLoading(true)
    supabase
      .from('post_comments')
      .select(COMMENT_SELECT)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const withAuthors = await attach(data ?? [])
        if (!alive) return
        setComments(withAuthors)
        setLoading(false)
      })
    return () => { alive = false }
  }, [postId, attach])

  const addComment = useCallback(async (body) => {
    if (!user?.id || !body.trim()) return { error: 'empty' }
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, body: body.trim() })
      .select(COMMENT_SELECT)
      .single()
    if (error) return { error: error.message }
    const [withAuthor] = await attach([data])
    setComments(prev => [...prev, withAuthor])
    return { data }
  }, [postId, user?.id, attach])

  const removeComment = useCallback(async (id) => {
    const before = comments
    setComments(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('post_comments').delete().eq('id', id)
    if (error) { setComments(before); return { error: error.message } }
    return {}
  }, [comments])

  return { comments, loading, addComment, removeComment }
}
