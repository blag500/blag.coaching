import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import styles from './ChatPage.module.css'
import { loc } from '../../utils/locale'

function dateSeparator(dateStr, t) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return t('chatp.today')
  if (d.toDateString() === yesterday.toDateString()) return t('chatp.yesterday')
  return d.toLocaleDateString(loc(), { day: 'numeric', month: 'long' })
}

function groupByDate(messages, t) {
  const groups = []
  let lastDate = null
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10)
    if (day !== lastDate) {
      groups.push({ type: 'separator', key: day, label: dateSeparator(msg.created_at, t) })
      lastDate = day
    }
    groups.push({ type: 'message', key: msg.id, msg })
  }
  return groups
}

/**
 * С кого говоря.
 *
 * Един списък за двете роли. Треньорът вижда всичките си клиенти, дори тези,
 * с които още не е разменил дума — той започва разговорите. Клиентът вижда
 * своя треньор и всеки, с когото вече е говорил; нов разговор започва от
 * профила на човека във фийда, не от списък с всички непознати.
 */
function ConversationList({ embedded, conversations, extra, loading, onSelect }) {
  const { t } = useSettings()

  /* Разговорите водят реда, защото носят кога е било последното съобщение.
     Останалите се дописват отдолу по азбучен ред. */
  const seen = new Set(conversations.map(c => c.peerId))
  const rows = [
    ...conversations.map(c => ({
      id:      c.peerId,
      name:    c.person?.name || t('feed.someone'),
      avatar:  c.person?.avatar_url ?? null,
      role:    c.person?.role,
      unread:  c.unread,
      preview: c.last?.content || (c.last?.photo_url ? t('chat.photoPreview') : ''),
    })),
    ...extra
      .filter(p => !seen.has(p.id))
      .map(p => ({
        id: p.id, name: p.name || p.email, avatar: p.avatar_url ?? null,
        role: p.role, unread: 0, preview: '',
      })),
  ]

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className={styles.headerName}>{t('chatp.chats')}</span>
      </div>
      <div className={styles.feed}>
        {loading ? (
          <p className={styles.empty}>{t('chat.loading')}</p>
        ) : rows.length === 0 ? (
          <p className={styles.empty}>{t('chatp.noClients')}</p>
        ) : rows.map(r => (
          <button
            key={r.id}
            type="button"
            className={styles.clientRow}
            onClick={() => onSelect(r.id, r.name, r.avatar)}
          >
            <div className={styles.clientAvatar}>
              {r.avatar
                ? <img src={r.avatar} className={styles.avatarImg} alt="" />
                : (r.name || '?')[0].toUpperCase()
              }
            </div>
            <span className={styles.clientRowText}>
              <span className={styles.clientRowName}>
                {r.name}
                {r.role === 'coach' && <span className={styles.clientRowTag}>{t('feed.coachTag')}</span>}
              </span>
              {r.preview && <span className={styles.clientRowPreview}>{r.preview}</span>}
            </span>
            {r.unread > 0 && <span className={styles.clientUnread}>{r.unread}</span>}
            <span className={styles.clientChevron}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ChatPage({ clientId, clientName, clientAvatarUrl, peerId: initialPeerId, embedded = false }) {
  const { user, profile, fetchMessages, fetchConversations, fetchClients, sendMessage, markMessagesAsRead } = useAuth()
  const { t } = useSettings()
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [sendError, setSendError]     = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [otherProfile, setOtherProfile] = useState(null)

  /* Един човек, независимо коя роля си. Дотук треньорът държеше избран
     клиент, а клиентът — подразбиращ се треньор; две състояния за едно и
     също нещо, заради което разговорът с трети човек нямаше къде да седне. */
  const [peerId,     setPeerId]     = useState(initialPeerId || clientId || null)
  const [peerName,   setPeerName]   = useState(clientName || '')
  const [peerAvatar, setPeerAvatar] = useState(clientAvatarUrl || null)

  const [conversations, setConversations] = useState([])
  const [extraPeople,   setExtraPeople]   = useState([])
  const [listLoading,   setListLoading]   = useState(true)

  const messagesEndRef    = useRef(null)
  const fileInputRef      = useRef(null)
  const inputRef          = useRef(null)
  const initialScrollDone = useRef(false)
  const isCoach = profile?.role === 'coach'

  const otherUserId = peerId

  async function markRead(userId) {
    if (!userId) return
    await markMessagesAsRead(userId)
    window.dispatchEvent(new CustomEvent('blag:messages-read', { detail: { userId } }))
  }

  /* Кого изобщо мога да отворя. Треньорът получава всичките си клиенти, дори
     тези, с които не е говорил; клиентът — своя треньор, който е винаги там,
     дори преди първата дума. */
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    setListLoading(true)

    Promise.all([
      fetchConversations(),
      isCoach
        ? fetchClients().then(r => r.data || [])
        : (async () => {
            const coachId = profile?.coach_id
              || (await supabase.rpc('get_coach_id').then(r => r.data))
            if (!coachId) return []
            const { data } = await supabase
              .from('feed_authors').select('id, name, avatar_url, role').eq('id', coachId)
            return data || []
          })(),
    ]).then(([conv, people]) => {
      if (!alive) return
      setConversations(conv.data || [])
      setExtraPeople(people)
      setListLoading(false)

      /* Един-единствен възможен разговор се отваря сам. Списък с един ред е
         една ненужна крачка за всеки клиент, който говори само с треньора си
         — тоест за почти всички, почти винаги. */
      const ids = new Set([...(conv.data || []).map(c => c.peerId), ...people.map(p => p.id)])
      if (!initialPeerId && !clientId && ids.size === 1) {
        const only = [...ids][0]
        setPeerId(only)
        const who = people.find(p => p.id === only)
          || (conv.data || []).find(c => c.peerId === only)?.person
        setPeerName(who?.name || '')
        setPeerAvatar(who?.avatar_url || null)
      }
    })
    return () => { alive = false }
  }, [user?.id, isCoach])

  useEffect(() => {
    if (!peerId) { setLoading(false); return }
    setLoading(true)
    fetchMessages(peerId).then(({ data }) => {
      setMessages(data || [])
      setLoading(false)
      markRead(peerId)
    })
  }, [user?.id, peerId])

  // Fetch the other person's profile (name + avatar) for the header
  /* През feed_authors, не през profiles: RLS на profiles пуска само своя ред
     и треньора, тоест клиент, който отвори разговор с друг клиент, би видял
     празно заглавие над съобщенията. */
  useEffect(() => {
    if (!peerId) return
    supabase.from('feed_authors').select('name, avatar_url, role').eq('id', peerId).maybeSingle()
      .then(({ data }) => { if (data) setOtherProfile(data) })
  }, [peerId])

  useEffect(() => {
    if (!otherUserId) return
    const id = setInterval(async () => {
      const { data } = await fetchMessages(otherUserId)
      if (data) setMessages(data)
    }, 15_000)
    return () => clearInterval(id)
  }, [otherUserId])

  useEffect(() => {
    if (!otherUserId) return
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await fetchMessages(otherUserId)
      if (data) setMessages(data)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [otherUserId])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`chatpage_${user.id}_${peerId || 'none'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user_id=eq.${user.id}` },
        payload => {
          const msg = payload.new
          /* Съобщение от друг разговор не влиза в отворения. Само вдига
             броячът в списъка, който така или иначе се чете отново при
             връщане назад. */
          if (msg.from_user_id !== peerId) return
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          markRead(msg.from_user_id)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, peerId])

  useEffect(() => {
    if (!messages.length) return
    const behavior = initialScrollDone.current ? 'smooth' : 'instant'
    messagesEndRef.current?.scrollIntoView({ behavior })
    initialScrollDone.current = true
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    if (!otherUserId) { setSendError(t('chat.err.noCoach')); return }
    const text = input.trim()
    setInput('')
    setSendError(null)
    const { data, error } = await sendMessage(otherUserId, text)
    if (error || !data) {
      setInput(text)
      setSendError(t('chat.err.send'))
    } else {
      setMessages(prev => [...prev, data])
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !otherUserId) return
    setUploading(true)
    setSendError(null)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('chat-photos').upload(path, file)
    if (upErr) {
      setSendError(t('chat.err.upload'))
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('chat-photos').getPublicUrl(path)
    const { data, error } = await sendMessage(otherUserId, null, publicUrl)
    if (error || !data) {
      setSendError(t('chat.err.sendShort'))
    } else {
      setMessages(prev => [...prev, data])
    }
    setUploading(false)
    e.target.value = ''
  }

  function openPeer(id, name, avatar) {
    setPeerId(id)
    setPeerName(name)
    setPeerAvatar(avatar)
    setOtherProfile(null)
    setMessages([])
    setLoading(true)
    initialScrollDone.current = false
  }

  function backToList() {
    setPeerId(null)
    setOtherProfile(null)
    setMessages([])
    fetchConversations().then(({ data }) => setConversations(data || []))
  }

  if (!peerId) {
    return (
      <ConversationList
        embedded={embedded}
        conversations={conversations}
        extra={extraPeople}
        loading={listLoading}
        onSelect={openPeer}
      />
    )
  }

  /* Стрелката назад се показва само когато има къде да се върнеш. Клиент с
     един-единствен разговор не бива да гледа изход към списък от един ред. */
  const canGoBack = new Set([
    ...conversations.map(c => c.peerId), ...extraPeople.map(p => p.id),
  ]).size > 1

  const displayName   = otherProfile?.name       || peerName   || t('chatp.clientFallback')
  const displayAvatar = otherProfile?.avatar_url || peerAvatar || null
  const items = groupByDate(messages)

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      {lightboxUrl && (
        <div className={styles.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className={styles.lightboxImg} alt="" />
        </div>
      )}

      <div className={styles.header}>
        {canGoBack && !embedded && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={backToList}
            aria-label={t('header.back')}
          >
            ‹
          </button>
        )}
        <div className={styles.avatar}>
          {displayAvatar
            ? <img src={displayAvatar} className={styles.avatarImg} alt="" />
            : displayName[0]?.toUpperCase()
          }
        </div>
        <span className={styles.headerName}>{displayName}</span>
      </div>

      <div className={styles.feed}>
        {loading ? (
          <p className={styles.empty}>{t('chat.loading')}</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>{t('chatp.noMsg')}</p>
        ) : (
          items.map(item =>
            item.type === 'separator' ? (
              <div key={item.key} className={styles.dateSep}>
                <span className={styles.dateSepLabel}>{item.label}</span>
              </div>
            ) : (
              <div
                key={item.key}
                className={`${styles.row} ${item.msg.from_user_id === user?.id ? styles.rowSent : styles.rowReceived}`}
              >
                <div className={`${styles.bubble} ${item.msg.from_user_id === user?.id ? styles.bubbleSent : styles.bubbleReceived}`}>
                  {item.msg.photo_url ? (
                    <img
                      src={item.msg.photo_url}
                      className={styles.photoMsg}
                      alt={t('chat.imgAlt')}
                      onClick={() => setLightboxUrl(item.msg.photo_url)}
                    />
                  ) : (
                    <span className={styles.msgText}>{item.msg.content}</span>
                  )}
                </div>
                <span className={styles.time}>
                  {new Date(item.msg.created_at).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        {sendError && <p className={styles.sendError}>{sendError}</p>}
        <div className={styles.composerRow}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          <button
            className={styles.cameraBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !otherUserId}
            type="button"
            aria-label={t('chat.sendImg')}
          >
            {uploading ? '…' : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>
          <input
            ref={inputRef}
            className={styles.field}
            type="text"
            placeholder={t('chat.placeholder')}
            value={input}
            onChange={e => { setInput(e.target.value); if (sendError) setSendError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim()}
            type="button"
            aria-label={t('chatp.send')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
