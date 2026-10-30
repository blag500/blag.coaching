import { useEffect, useRef, useState } from 'react'

/* Изборът на проект — първото нещо при влизане (30.10.2026, по примера на
 * dsgnbyhl.com/en/projects). Картата води до спирката си; „Към целия свят“,
 * Esc или скрол надолу го затварят и Светът си върви както преди.
 * Не излиза, когато адресът вече сочи спирка (#zala и т.н.). */

const PROJECTS = [
  { id: 'zala', kicker: 'Приложение · на живо', title: 'Blag', text: 'Хранене и тренировки в едно приложение: вписваш храната и тежестите, виждаш напредъка.', img: '/svyat/lite-gym.webp', cta: 'Към залата' },
  { href: '/cheatcode/', kicker: 'Готова храна · проба', title: 'Чийт Код', text: 'Ястия за вкъщи с макросите отпред. Кухнята в Света идва скоро.', img: '/cheatcode/kayma.jpg', cta: 'Отвори Чийт Код' },
  { id: 'magazin', kicker: 'Магазин · онлайн и денонощно', title: 'Здраве и Сила', text: 'Добавки и храна с цената на доза. Обект на самообслужване в Метро Сити — скоро.', img: '/svyat/lite-street.webp', cta: 'Към магазина' },
  { id: 'kontakt', kicker: 'Следващият', title: 'Твоят проект?', text: 'Имаш идея или искаш да работим заедно — пиши ми.', mark: true, cta: 'Пиши ми' },
]

const pad = (n) => String(n).padStart(2, '0')

export default function Picker({ onPick, onClose }) {
  const row = useRef(null)
  const touch = useRef(null)
  const [at, setAt] = useState(0)

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  // Коя карта е най-вляво — за брояча 01 / 04.
  const onScroll = () => {
    const el = row.current
    if (!el?.firstElementChild) return
    const w = el.firstElementChild.getBoundingClientRect().width + 16
    setAt(Math.min(PROJECTS.length - 1, Math.round(el.scrollLeft / w)))
  }
  function step(d) {
    const el = row.current
    const i = Math.max(0, Math.min(PROJECTS.length - 1, at + d))
    el?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    setAt(i)
  }

  // Скрол или плъзгане нагоре = „просто скролвам“: изборът се маха.
  const onWheel = (e) => { if (e.deltaY > 24 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) onClose() }
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = [t.clientX, t.clientY] }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current[0]
    const dy = t.clientY - touch.current[1]
    touch.current = null
    if (dy < -70 && Math.abs(dy) > Math.abs(dx) * 1.5) onClose()
  }

  return (
    <div className="picker" role="dialog" aria-label="Избери проект" onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="pickHead">
        <p className="kicker">Николай Благьов</p>
        <h1 className="h2">Избери проект</h1>
      </div>

      <div className="pickRow" ref={row} onScroll={onScroll}>
        {PROJECTS.map((p, i) => {
          const body = (
            <>
              <div className="pickImg" style={p.img ? { backgroundImage: `url('${p.img}')` } : undefined}>
                {p.mark && <img src="/svyat/neon/tube-mark.svg" alt="" />}
              </div>
              <div className="pickText">
                <span className="pickNo">{pad(i + 1)}</span>
                <p className="kicker">{p.kicker}</p>
                <h2 className="pickTitle">{p.title}</h2>
                <p className="pickLead">{p.text}</p>
                <span className="pickCta">{p.cta} <span aria-hidden="true">→</span></span>
              </div>
            </>
          )
          return p.href
            ? <a key={p.title} className="pickCard" href={p.href}>{body}</a>
            : <button key={p.title} type="button" className="pickCard" onClick={() => onPick(p.id)}>{body}</button>
        })}
      </div>

      <div className="pickFoot">
        <span className="pickCount" aria-live="polite">Проект {pad(at + 1)} / {pad(PROJECTS.length)}</span>
        <div className="pickNav">
          <button type="button" className="sound" aria-label="Предишен" disabled={at === 0} onClick={() => step(-1)}>←</button>
          <button type="button" className="sound" aria-label="Следващ" disabled={at === PROJECTS.length - 1} onClick={() => step(1)}>→</button>
        </div>
        <button type="button" className="link pickAll" onClick={onClose}>Към целия свят ↓</button>
      </div>
    </div>
  )
}
