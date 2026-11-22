import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { parseWhen, quick, whenLabel } from './when'
import styles from './Notes.module.css'

/* Бележки (150, /belezhki/): личният план — отделно от таблото, което е за
 * работата. Записваш бързо, отмяташ, телефонът напомня.
 *
 * Полето горе приема изречение — ако в него има време („утре в 9 …“), то става
 * напомняне само. Първият ред е заглавието, останалите — текстът. Картата се
 * отваря в лист отдолу: текст, отметки, час, област, закачане. Връзките в
 * текста са живи. Известията идват от tablo-remind през /belezhki/sw.js и
 * отварят #notes/<id>. Пише и Claude (by_claude), когато кажеш „запиши ми“. */

// Личните области — работата си е в таблото.
export const AREAS = [
  { id: 'si', label: 'Си', color: '#FF7A70' },
  { id: 'body', label: 'Тяло', color: '#5AB8FF' },
  { id: 'home', label: 'Дом', color: '#4CC38A' },
  { id: 'moto', label: 'Мотор', color: '#F29A4A' },
  { id: 'money', label: 'Пари', color: '#F2B45A' },
  { id: 'study', label: 'Учене', color: '#A594FF' },
  { id: 'life', label: 'Друго', color: '#8A90A0' },
]
const areaOf = (id) => AREAS.find((a) => a.id === id)
const QUICK = [
  { id: 'hour', label: 'След час' },
  { id: 'tonight', label: 'Довечера' },
  { id: 'tomorrow', label: 'Утре 9:00' },
  { id: 'week', label: 'След седмица' },
]
const VAPID = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'

function b64(s) {
  const p = '='.repeat((4 - (s.length % 4)) % 4)
  return Uint8Array.from(atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
}

/* ── Известията ─────────────────────────────────────────────────────────── */
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

async function subscribe() {
  const reg = await navigator.serviceWorker.register('/belezhki/sw.js', { scope: '/belezhki/' })
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) })
  const { error } = await supabase.from('tablo_push').upsert({ endpoint: sub.endpoint, subscription: sub.toJSON() })
  if (error) throw error
}

function usePush() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [perm, setPerm] = useState(() => (supported ? Notification.permission : 'unsupported'))
  const [err, setErr] = useState('')
  useEffect(() => {
    if (supported && Notification.permission === 'granted') subscribe().catch((e) => setErr(e.message))
  }, [supported])
  async function enable() {
    setErr('')
    try {
      const p = await Notification.requestPermission()
      setPerm(p)
      if (p === 'granted') await subscribe()
    } catch (e) { setErr(e.message) }
  }
  return { supported, perm, enable, err }
}

/* ── Връзките в текста ──────────────────────────────────────────────────── */
const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'])/g
function short(u) {
  try {
    const x = new URL(u)
    const p = x.pathname.split('/').filter(Boolean)
    return x.hostname.replace(/^www\./, '') + (p[0] ? `/${p[0]}` : '')
  } catch { return u }
}
function Linked({ text }) {
  const parts = String(text).split(URL_RE)
  return parts.map((p, i) => (i % 2
    ? <a key={i} href={p} target="_blank" rel="noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>{short(p)}</a>
    : <span key={i}>{p}</span>))
}

/* ── Таб „Бележки“ ──────────────────────────────────────────────────────── */
export default function Notes() {
  const [notes, setNotes] = useState(null)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(() => (location.hash.match(/^#notes\/(.+)$/) || [])[1] || null)
  const [, tick] = useState(0)
  const push = usePush()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('tablo_notes').select('*')
      .order('updated_at', { ascending: false }).limit(500)
    if (error) { setMsg(error.message); return }
    setNotes(data)
  }, [])

  useEffect(() => { load() }, [load])
  // при връщане в приложението — свежо (Claude може да е писал), и часовете да се преброят
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') { load(); tick((x) => x + 1) } }
    const onHash = () => setOpenId((location.hash.match(/^#notes\/(.+)$/) || [])[1] || null)
    const t = setInterval(() => tick((x) => x + 1), 30000)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('hashchange', onHash)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('hashchange', onHash) }
  }, [load])

  const open = (id) => { setOpenId(id); history.replaceState(null, '', id ? `#notes/${id}` : location.pathname) }

  const save = useCallback(async (id, patch) => {
    const stamp = new Date().toISOString()
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, ...patch, updated_at: stamp } : n)))
    const { error } = await supabase.from('tablo_notes').update({ ...patch, updated_at: stamp }).eq('id', id)
    if (error) { setMsg(`Не се записа: ${error.message}`); load() }
  }, [load])

  const add = useCallback(async (row) => {
    const tmp = { id: crypto.randomUUID(), body: '', checklist: [], pinned: false, done: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row }
    setNotes((all) => [tmp, ...(all || [])])
    const { error } = await supabase.from('tablo_notes').insert({ id: tmp.id, ...row })
    if (error) { setMsg(`Не се записа: ${error.message}`); load() }
  }, [load])

  const remove = useCallback(async (id) => {
    setNotes((all) => all.filter((n) => n.id !== id))
    open(null)
    const { error } = await supabase.from('tablo_notes').delete().eq('id', id)
    if (error) { setMsg(`Не се изтри: ${error.message}`); load() }
  }, [load])

  const now = new Date()
  const view = useMemo(() => {
    const all = (notes || []).filter((n) => filter === 'all' || n.area === filter)
    const live = all.filter((n) => !n.done)
    return {
      remind: live.filter((n) => n.remind_at).sort((a, b) => a.remind_at.localeCompare(b.remind_at)),
      pinned: live.filter((n) => !n.remind_at && n.pinned),
      rest: live.filter((n) => !n.remind_at && !n.pinned),
      done: all.filter((n) => n.done).sort((a, b) => String(b.done_at).localeCompare(String(a.done_at))).slice(0, 40),
    }
  }, [notes, filter])
  const used = AREAS.filter((a) => (notes || []).some((n) => n.area === a.id && !n.done))
  const current = (notes || []).find((n) => n.id === openId)

  return (
    <div className={styles.wrap}>
      <Capture onAdd={add} />

      {msg && <p className={styles.msg} role="status">{msg}</p>}
      <PushHint push={push} />

      {used.length > 0 && (
        <div className={styles.filters} role="tablist" aria-label="Област">
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Всички</button>
          {used.map((a) => (
            <button key={a.id} type="button" role="tab" aria-selected={filter === a.id} onClick={() => setFilter(a.id)}>
              <i style={{ background: a.color }} />{a.label}
            </button>
          ))}
        </div>
      )}

      {notes === null ? <p className={styles.empty}>Зарежда…</p> : (
        <>
          <Group title="Напомняния" rows={view.remind} now={now} onOpen={open} onSave={save} />
          <Group title="Закачени" rows={view.pinned} now={now} onOpen={open} onSave={save} />
          <Group title="Бележки" rows={view.rest} now={now} onOpen={open} onSave={save}
            empty={!view.remind.length && !view.pinned.length ? 'Още нищо. Напиши първата горе — „утре в 9 …“ става напомняне.' : null} />
          {view.done.length > 0 && (
            <details className={styles.doneFold}>
              <summary>Готово <span>{view.done.length}</span></summary>
              <ul className={styles.list}>
                {view.done.map((n) => <Card key={n.id} n={n} now={now} onOpen={open} onSave={save} />)}
              </ul>
            </details>
          )}
        </>
      )}

      {current && createPortal(
        <Editor key={current.id} n={current} onSave={save} onDelete={remove} onClose={() => open(null)} />,
        document.body,
      )}
    </div>
  )
}

/* ── Полето за записване ────────────────────────────────────────────────── */
function Capture({ onAdd }) {
  const [text, setText] = useState('')
  const [area, setArea] = useState(null)
  const [pick, setPick] = useState(null)     // ръчно избран час (Date) или 'off'
  const ref = useRef(null)

  const first = text.split('\n')[0]
  const parsed = useMemo(() => parseWhen(first), [first])
  const at = pick === 'off' ? null : pick || parsed.at

  useEffect(() => {
    const el = ref.current
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  }, [text])

  function submit(e) {
    e?.preventDefault()
    const lines = text.split('\n')
    const head = (pick === null && parsed.at ? parsed.text : lines[0]).trim()
    if (!head) return
    onAdd({
      title: head.slice(0, 300),
      body: lines.slice(1).join('\n').trim(),
      area,
      remind_at: at ? at.toISOString() : null,
    })
    setText(''); setPick(null); setArea(null)
  }

  return (
    <form className={styles.capture} onSubmit={submit}>
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e) }}
        placeholder="Запиши… (утре в 9 обади се на …)"
        aria-label="Нова бележка"
        enterKeyHint="done"
      />
      {text.trim() && (
        <div className={styles.captureOpts}>
          <div className={styles.chipRow}>
            {at && (
              <button type="button" className={styles.whenOn} onClick={() => setPick('off')} aria-label="Махни напомнянето">
                <Clock />{whenLabel(at)}<span aria-hidden="true">×</span>
              </button>
            )}
            {!at && QUICK.map((q) => (
              <button key={q.id} type="button" className={styles.chip} onClick={() => setPick(quick(q.id))}>{q.label}</button>
            ))}
          </div>
          <div className={styles.chipRow}>
            {AREAS.map((a) => (
              <button key={a.id} type="button" className={styles.chip} aria-pressed={area === a.id}
                onClick={() => setArea(area === a.id ? null : a.id)}>
                <i style={{ background: a.color }} />{a.label}
              </button>
            ))}
          </div>
          <button type="submit" className={styles.save}>Запиши</button>
        </div>
      )}
    </form>
  )
}

function PushHint({ push }) {
  if (push.perm === 'granted' && !push.err) return null
  if (push.perm === 'denied') return <p className={styles.hint}>Известията са спрени — пусни ги от Настройки → Бележки.</p>
  if (isIOS() && !standalone()) {
    return (
      <p className={styles.hint}>
        За напомняния на телефона: в Safari натисни <b>Сподели</b> → <b>Към началния екран</b>, отвори бележките оттам и натисни „Включи известията“.
      </p>
    )
  }
  if (!push.supported) return null
  return (
    <div className={styles.hint}>
      <span>Включи известията, за да ти напомня в часа.{push.err && ` (${push.err})`}</span>
      <button type="button" className={styles.save} onClick={push.enable}>Включи известията</button>
    </div>
  )
}

/* ── Списъците ──────────────────────────────────────────────────────────── */
function Group({ title, rows, now, onOpen, onSave, empty }) {
  if (!rows.length) return empty ? <p className={styles.empty}>{empty}</p> : null
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={styles.groupH}>{title} <span>{rows.length}</span></h2>
      <ul className={styles.list}>
        {rows.map((n) => <Card key={n.id} n={n} now={now} onOpen={onOpen} onSave={onSave} />)}
      </ul>
    </section>
  )
}

function Card({ n, now, onOpen, onSave }) {
  const a = areaOf(n.area)
  const list = Array.isArray(n.checklist) ? n.checklist : []
  const doneN = list.filter((c) => c.done).length
  const late = n.remind_at && !n.done && new Date(n.remind_at) <= now
  return (
    <li className={styles.card} data-done={n.done || undefined} data-late={late || undefined}>
      <input type="checkbox" className={styles.check} checked={n.done} aria-label={`Готово: ${n.title}`}
        onChange={(e) => onSave(n.id, { done: e.target.checked })} />
      <div className={styles.cardMain} role="button" tabIndex={0} onClick={() => onOpen(n.id)}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpen(n.id) }}>
        <span className={styles.cardTitle}><Linked text={n.title} /></span>
        {n.body && <span className={styles.cardBody}><Linked text={n.body} /></span>}
        <span className={styles.meta}>
          {n.remind_at && <span className={styles.when} data-late={late || undefined}><Clock />{whenLabel(n.remind_at, now)}</span>}
          {list.length > 0 && <span className={styles.tag}>{doneN}/{list.length}</span>}
          {a && <span className={styles.tag}><i style={{ background: a.color }} />{a.label}</span>}
          {n.pinned && <span className={styles.tag}>закачена</span>}
          {n.by_claude && <span className={styles.tag}>от Claude</span>}
        </span>
        {late && (
          <span className={styles.snooze}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onSave(n.id, { remind_at: quick('hour').toISOString() }) }}>+1 час</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onSave(n.id, { remind_at: quick('tomorrow').toISOString() }) }}>Утре 9:00</button>
          </span>
        )}
      </div>
    </li>
  )
}

/* ── Листът с цялата бележка ────────────────────────────────────────────── */
function localInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function Editor({ n, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(n.title)
  const [body, setBody] = useState(n.body || '')
  const [item, setItem] = useState('')
  const [sure, setSure] = useState(false)
  const bodyRef = useRef(null)
  const list = Array.isArray(n.checklist) ? n.checklist : []

  useEffect(() => {
    const el = bodyRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.max(96, el.scrollHeight)}px` }
  }, [body])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  })

  function flush() {
    const patch = {}
    if (title.trim() && title.trim() !== n.title) patch.title = title.trim().slice(0, 300)
    if (body !== (n.body || '')) patch.body = body
    if (Object.keys(patch).length) onSave(n.id, patch)
  }
  function close() { flush(); onClose() }
  const setList = (next) => onSave(n.id, { checklist: next })
  function addItem(e) {
    e.preventDefault()
    const t = item.trim()
    if (!t) return
    setList([...list, { t, done: false }]); setItem('')
  }
  const links = [...new Set(`${title}\n${body}`.match(URL_RE) || [])]

  return (
    <div className={styles.scrim} onClick={close}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Бележка" onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetTop}>
          <button type="button" className={styles.ghost} aria-pressed={n.pinned} onClick={() => onSave(n.id, { pinned: !n.pinned })}>
            {n.pinned ? 'Откачи' : 'Закачи'}
          </button>
          <button type="button" className={styles.ghost} onClick={() => onSave(n.id, { done: !n.done })}>
            {n.done ? 'Върни' : 'Готово'}
          </button>
          <button type="button" className={styles.save} onClick={close}>Затвори</button>
        </div>

        <input className={styles.titleIn} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={flush} aria-label="Заглавие" />
        <textarea ref={bodyRef} className={styles.bodyIn} value={body} onChange={(e) => setBody(e.target.value)} onBlur={flush}
          placeholder="Текст, връзки…" aria-label="Текст" />

        {links.length > 0 && (
          <div className={styles.links}>
            {links.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className={styles.linkBtn}>{short(u)} ↗</a>)}
          </div>
        )}

        <section className={styles.block} aria-label="Отметки">
          <h3>Отметки</h3>
          {list.length > 0 && (
            <ul className={styles.checks}>
              {list.map((c, i) => (
                <li key={i}>
                  <input type="checkbox" className={styles.check} checked={!!c.done} aria-label={c.t}
                    onChange={() => setList(list.map((x, k) => (k === i ? { ...x, done: !x.done } : x)))} />
                  <span data-done={c.done || undefined}><Linked text={c.t} /></span>
                  <button type="button" className={styles.x} aria-label={`Махни ${c.t}`}
                    onClick={() => setList(list.filter((_, k) => k !== i))}>×</button>
                </li>
              ))}
            </ul>
          )}
          <form className={styles.addRow} onSubmit={addItem}>
            <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Добави отметка" aria-label="Нова отметка" enterKeyHint="enter" />
          </form>
        </section>

        <section className={styles.block} aria-label="Напомняне">
          <h3>Напомняне</h3>
          <div className={styles.chipRow}>
            {QUICK.map((q) => (
              <button key={q.id} type="button" className={styles.chip} onClick={() => onSave(n.id, { remind_at: quick(q.id).toISOString() })}>{q.label}</button>
            ))}
          </div>
          <div className={styles.whenRow}>
            <input type="datetime-local" value={localInput(n.remind_at)} aria-label="Точен час"
              onChange={(e) => onSave(n.id, { remind_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            {n.remind_at && <button type="button" className={styles.ghost} onClick={() => onSave(n.id, { remind_at: null })}>Махни</button>}
          </div>
          {n.remind_at && <p className={styles.small}>{whenLabel(n.remind_at)}{n.reminded_at ? ' · пратено' : ''}</p>}
        </section>

        <section className={styles.block} aria-label="Област">
          <h3>Област</h3>
          <div className={styles.chipRow}>
            {AREAS.map((a) => (
              <button key={a.id} type="button" className={styles.chip} aria-pressed={n.area === a.id}
                onClick={() => onSave(n.id, { area: n.area === a.id ? null : a.id })}>
                <i style={{ background: a.color }} />{a.label}
              </button>
            ))}
          </div>
        </section>

        <div className={styles.sheetFoot}>
          <span className={styles.small}>
            Записано {new Date(n.created_at).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {n.by_claude ? ' · от Claude' : ''}
          </span>
          <button type="button" className={styles.danger} onClick={() => (sure ? onDelete(n.id) : setSure(true))}>
            {sure ? 'Сигурно? Изтрий' : 'Изтрий'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Clock() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}
