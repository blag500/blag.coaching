import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { tr } from '../utils/locale'

/* Приятели и следване.
 *
 * Две отношения, защото хората ги искат по различен повод. Приятелството се
 * пита и е взаимно — то отваря адресника, а „можеш да ми пишеш" не е нещо,
 * което един човек решава сам за друг. Следването е еднопосочно и не се пита:
 * клиент, който иска да гледа как се справя някой по-напред от него, няма
 * нужда от разрешение.
 *
 * Имената и снимките идват от public.feed_authors, не от profiles: RLS на
 * profiles пуска само собствения ред, и с право — там стоят имейл, калории и
 * цели. Изгледът излага само това, което един човек може да знае за друг.
 */

const AUTHOR_COLS = 'id, name, avatar_url, role, bio, username'

async function authorsByIds(ids) {
  const wanted = [...new Set(ids.filter(Boolean))]
  if (wanted.length === 0) return {}
  const { data } = await supabase.from('feed_authors').select(AUTHOR_COLS).in('id', wanted)
  return Object.fromEntries((data ?? []).map(a => [a.id, a]))
}

/**
 * Известие до отсрещния човек.
 *
 * Мълчи при неуспех и не се чака. Поканата вече е записана; ако push услугата
 * мълчи или онзи не е разрешил известия, това не е грешка, за която да се
 * съобщава на човека, натиснал бутона.
 *
 * Текстът тръгва на езика на изпращача — същото прави и известието за
 * харесване. Правилното би било на езика на получателя, но той се знае само
 * в базата, а не тук.
 */
function notify(toUserId, title, body) {
  if (!toUserId) return
  supabase.functions.invoke('send-push', {
    body: { toUserId, title, body, tag: 'friends' },
  }).catch(() => {})
}

export function useFriends() {
  const { user, profile } = useAuth()
  const me = user?.id ?? null
  const myName = profile?.name || 'Blag'

  const [friends,  setFriends]  = useState([])   // приети, взаимни
  const [incoming, setIncoming] = useState([])   // покани към мен
  const [outgoing, setOutgoing] = useState([])   // мои покани, още без отговор
  const [following, setFollowing] = useState([]) // кого следвам
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!me) return
    setLoading(true)

    /* Двете таблици наведнъж. Приятелството няма посока за четене — редът е
       един, независимо кой е поканил — затова се пита с or() и се разделя
       тук, вместо с две заявки, чиито отговори могат да се разминат. */
    const [linksRes, followsRes] = await Promise.all([
      supabase.from('friendships')
        .select('id, requester_id, addressee_id, status, created_at')
        .or(`requester_id.eq.${me},addressee_id.eq.${me}`),
      supabase.from('follows')
        .select('follower_id, followee_id, created_at')
        .eq('follower_id', me),
    ])

    if (linksRes.error) { setError(linksRes.error.message); setLoading(false); return }

    const links = linksRes.data ?? []
    const follows = followsRes.data ?? []

    const ids = [
      ...links.map(l => (l.requester_id === me ? l.addressee_id : l.requester_id)),
      ...follows.map(f => f.followee_id),
    ]
    const authors = await authorsByIds(ids)

    /* Отсрещният човек, изваден веднъж: оттук нататък редът се чете като
       „кой", а не като „кой от двете колони". */
    const shape = l => {
      const iAsked  = l.requester_id === me
      const otherId = iAsked ? l.addressee_id : l.requester_id
      return {
        id: l.id,
        otherId,
        person: authors[otherId] ?? null,
        status: l.status,
        // Посоката се носи от реда. Изчислена веднъж тук, тя не се търси
        // повторно на всяко филтриране — а и „кой е поканил" е свойство на
        // връзката, не въпрос, който се задава отново.
        iAsked,
        createdAt: l.created_at,
      }
    }

    const shaped = links.map(shape)
    setFriends(shaped.filter(l => l.status === 'accepted'))
    setIncoming(shaped.filter(l => l.status === 'pending' && !l.iAsked))
    setOutgoing(shaped.filter(l => l.status === 'pending' &&  l.iAsked))
    setFollowing(follows.map(f => ({ otherId: f.followee_id, person: authors[f.followee_id] ?? null, createdAt: f.created_at })))
    setError(null)
    setLoading(false)
  }, [me])

  useEffect(() => { load() }, [load])

  /** Търсене по кратко име или по име. Празният низ не пита нищо. */
  const search = useCallback(async (term) => {
    const q = term.trim()
    if (!me || q.length < 2) return []
    const { data } = await supabase
      .from('feed_authors')
      .select(AUTHOR_COLS)
      .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(20)
    // Себе си не се добавя за приятел.
    return (data ?? []).filter(a => a.id !== me)
  }, [me])

  const invite = useCallback(async (otherId) => {
    if (!me || !otherId || otherId === me) return { error: 'invalid' }
    const { error: err } = await supabase
      .from('friendships')
      .insert({ requester_id: me, addressee_id: otherId })
    if (!err) {
      notify(otherId, myName, tr('fr.push.invited'))
      await load()
    }
    /* Уникалният индекс по подредената двойка е това, което спира втора
       покана между същите двама — включително когато другият вече е поканил
       мен. В този случай грешката не е грешка, а „вече има връзка". */
    return { error: err?.message ?? null }
  }, [me, load, myName])

  const accept = useCallback(async (linkId) => {
    /* Кой е поканил се чете преди заявката: след нея редът вече не е в
       „получени" и няма откъде да се вземе. */
    const asked = incoming.find(l => l.id === linkId)?.otherId ?? null
    const { error: err } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', linkId)
    if (!err) {
      notify(asked, myName, tr('fr.push.accepted'))
      await load()
    }
    return { error: err?.message ?? null }
  }, [load, incoming, myName])

  /** Отказ, отмяна на своя покана и разприятеляване са едно и също действие. */
  const unlink = useCallback(async (linkId) => {
    const { error: err } = await supabase.from('friendships').delete().eq('id', linkId)
    if (!err) await load()
    return { error: err?.message ?? null }
  }, [load])

  const follow = useCallback(async (otherId) => {
    if (!me || !otherId || otherId === me) return { error: 'invalid' }
    const { error: err } = await supabase
      .from('follows')
      .insert({ follower_id: me, followee_id: otherId })
    if (!err) {
      notify(otherId, myName, tr('fr.push.followed'))
      await load()
    }
    return { error: err?.message ?? null }
  }, [me, load, myName])

  const unfollow = useCallback(async (otherId) => {
    if (!me) return { error: 'no user' }
    const { error: err } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', me)
      .eq('followee_id', otherId)
    if (!err) await load()
    return { error: err?.message ?? null }
  }, [me, load])

  /** Какво съм за този човек — за да знае бутонът какво да предложи. */
  const relationTo = useCallback((otherId) => {
    const friend = friends.find(f => f.otherId === otherId)
    if (friend) return { kind: 'friend', linkId: friend.id }
    const out = outgoing.find(f => f.otherId === otherId)
    if (out) return { kind: 'sent', linkId: out.id }
    const inc = incoming.find(f => f.otherId === otherId)
    if (inc) return { kind: 'received', linkId: inc.id }
    return { kind: 'none', linkId: null }
  }, [friends, outgoing, incoming])

  const isFollowing = useCallback(
    otherId => following.some(f => f.otherId === otherId),
    [following],
  )

  return {
    friends, incoming, outgoing, following,
    loading, error, refresh: load,
    search, invite, accept, unlink, follow, unfollow,
    relationTo, isFollowing,
  }
}
