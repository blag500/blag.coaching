import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* Търсачката.
 *
 * Едно поле, два отговора: хора и постове. Хората идват от
 * public.feed_authors, а не от profiles — RLS на profiles пуска само
 * собствения ред, и с право, защото там стоят имейл, калории и цели.
 * Постовете са четими за всеки влязъл и без това стоят във фийда.
 *
 * Двете заявки тръгват заедно и се чакат заедно: списък, който се пълни на
 * две части, мести под пръста това, което човек тъкмо е тръгнал да натисне.
 */

const AUTHOR_COLS = 'id, name, avatar_url, role, bio, created_at, username'

const POST_SELECT = `
  id, user_id, body, photo_url, created_at, kind, meta,
  post_likes(user_id),
  post_comments(id)
`

const MIN = 2
const LIMIT = 20
const DEBOUNCE = 320

/* Полето е свободен текст, а той влиза в два израза, които четат знаци:
   % и _ са шаблони за ilike, а запетаята и скобите режат or() на части.
   Изчистват се тук, а не при рисуването — низът пътува към сървъра оттук. */
function clean(term) {
  return term.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim()
}

function shapePost(row, myId, authors) {
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

/**
 * @param {string} term - каквото е в полето, необработено
 */
export function useSearch(term) {
  const { user } = useAuth()
  const me = user?.id ?? null

  const [people, setPeople]   = useState([])
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(false)

  /* Кой низ е на екрана в момента. Докато една заявка пътува, полето може да
     се е сменило — а отговорите се връщат в какъвто ред им се случи и
     последният пристигнал може да е за предпоследния низ. */
  const shown = useRef('')

  const run = useCallback(async (q) => {
    const [peopleRes, postsRes] = await Promise.all([
      supabase.from('feed_authors')
        .select(AUTHOR_COLS)
        .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(LIMIT),
      supabase.from('posts')
        .select(POST_SELECT)
        .ilike('body', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(LIMIT),
    ])

    const rows = postsRes.data ?? []
    /* Авторите на намерените постове не идват със заявката (виж по-горе защо),
       а се питат наведнъж за всички редове — не по един на карта. */
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
    let authors = {}
    if (ids.length) {
      const { data } = await supabase.from('feed_authors').select(AUTHOR_COLS).in('id', ids)
      authors = Object.fromEntries((data ?? []).map(a => [a.id, a]))
    }

    return {
      people: (peopleRes.data ?? []).filter(a => a.id !== me),
      posts: rows.map(r => shapePost(r, me, authors)),
    }
  }, [me])

  useEffect(() => {
    const q = clean(term)
    shown.current = q
    if (!me || q.length < MIN) {
      setPeople([]); setPosts([]); setLoading(false)
      return
    }
    setLoading(true)
    /* Търсенето чака пръста да спре: заявка на всяка буква прави обиколка до
       сървъра за „Ни", „Ник", „Нико". */
    const id = setTimeout(async () => {
      const found = await run(q)
      if (shown.current !== q) return
      setPeople(found.people)
      setPosts(found.posts)
      setLoading(false)
    }, DEBOUNCE)
    return () => clearTimeout(id)
  }, [term, me, run])

  return { people, posts, loading, active: clean(term).length >= MIN }
}
