import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { flick } from './neon'
import { jumpTo } from './nav'

/* Текстът над сцената — един и същ в 3D и в лекия изглед. В 3D всяка секция е
 * точно един екран (скокът по менюто разчита на това). Без лозунги: какво е,
 * къде е, какво да натиснеш. Обектът още не е отворен и текстът го казва. */

const Arrow = () => <span className="arrow" aria-hidden="true">→</span>
// Лекият изглед: залата има своя картина; улицата е общият фон (App).
const GymBg = ({ lite }) => (lite ? <div className="sectionBg" style={{ backgroundImage: "url('/svyat/lite-gym.webp')" }} aria-hidden="true" /> : null)

export default function Sections({ lite = false }) {
  const h = lite ? undefined : { height: '100vh', minHeight: 0 }
  return (
    <>
      <section id="nachalo" className="section" style={h}>
        <GymBg lite={lite} />
        <div className="copy">
          <p className="kicker">Николай Благьов</p>
          <h1 className="h1">Зала, приложение, храна, магазин.</h1>
          <p className="lead">Скролвай: залата, после магазинът през нощта. Кухнята идва скоро.</p>
          <div className="ctas">
            <a className="btn" href="#kontakt" onClick={(e) => { e.preventDefault(); jumpTo('kontakt') }}>Пиши ми <Arrow /></a>
            <a className="link" href="/shop/">Към магазина →</a>
          </div>
        </div>
        {!lite && <p className="hint">към залата</p>}
      </section>

      <section id="zala" className="section" style={h}>
        <GymBg lite={lite} />
        <div className="copy glass">
          <p className="kicker">Blag Coaching</p>
          <h2 className="h2">Залата</h2>
          <p className="lead">Тренировки и хранене с приложението: вписваш храната и тежестите, виждаш напредъка и ми пишеш направо. Аз виждам същото.</p>
          <div className="ctas">
            <a className="btn" href="/">Приложението <Arrow /></a>
            <a className="link" href="#kontakt" onClick={(e) => { e.preventDefault(); jumpTo('kontakt') }}>Консултация →</a>
          </div>
          {!lite && <p className="small">Натисни щангата.</p>}
        </div>
        {!lite && <p className="hint">към улицата</p>}
      </section>

      <section id="magazin" className="section right" style={h}>
        <div className="copy glass">
          <p className="kicker">Магазин · Метро Сити</p>
          <h2 className="h2">Здраве и Сила</h2>
          <p className="lead">Добавки и храна с макросите на 100 г и цената на доза до всеки продукт. Онлайн — с доставка. В Метро Сити — обект на самообслужване, отворен денонощно.</p>
          <div className="ctas"><a className="btn" href="/shop/">Към магазина <Arrow /></a></div>
          {!lite && <p className="small">Докосни неона.</p>}
        </div>
        {!lite && <p className="hint">към вратата</p>}
      </section>

      <section id="vhod" className="section" style={h}>
        <div className="copy glass">
          <p className="kicker">Входът</p>
          <h2 className="h2">Влизаш с телефона.</h2>
          <p className="lead">Профил с потвърден телефон и карта — QR кодът от него отваря вратата. Плащаш на касата, бонът отваря изхода.</p>
          <p className="small">Обектът още не е отворен.</p>
        </div>
        {!lite && <p className="hint">към пейката</p>}
      </section>

      <section id="kontakt" className="section center" style={h}>
        <Contact />
      </section>
    </>
  )
}

function Contact() {
  const [f, setF] = useState({ body: '', name: '', email: '', website: '' })
  const [err, setErr] = useState({})
  const [state, setState] = useState('idle')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function send(e) {
    e.preventDefault()
    const x = {}
    if (f.body.trim().length < 5) x.body = 'Напиши поне няколко думи.'
    if (!f.name.trim()) x.name = 'Как да се обърна към теб?'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) x.email = 'Имейлът изглежда непълен.'
    setErr(x)
    if (Object.keys(x).length) return
    setState('busy')
    const { data, error } = await supabase.functions.invoke('svyat-contact', { body: f })
    if (error || data?.error) {
      let text = data?.error
      try { text = text || (await error.context.json()).error } catch { /* без тяло */ }
      setErr({ form: text || 'Не тръгна. Опитай пак след малко.' })
      setState('idle')
      return
    }
    // Неонът потвърждава — три примигвания.
    flick()
    setTimeout(flick, 900)
    setTimeout(flick, 1800)
    setState('done')
  }

  return (
    <div className="card glass">
      <p className="kicker">Контакт</p>
      <h2 className="h2">Пиши ми.</h2>
      {state === 'done' ? (
        <p className="lead done" role="status">Получено. Ще ти отговоря на имейла.</p>
      ) : (
        <form onSubmit={send} noValidate>
          {/* Грешката е извън етикета — иначе става част от името на полето. */}
          <div className="field">
            <label>Какво ти трябва?
              <textarea value={f.body} onChange={set('body')} placeholder="Здравей! Искам…" aria-invalid={!!err.body} aria-describedby={err.body ? 'e-body' : undefined} />
            </label>
            {err.body && <span id="e-body" className="err">{err.body}</span>}
          </div>
          <div className="row">
            <div className="field">
              <label>Име
                <input value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!err.name} aria-describedby={err.name ? 'e-name' : undefined} />
              </label>
              {err.name && <span id="e-name" className="err">{err.name}</span>}
            </div>
            <div className="field">
              <label>Имейл
                <input type="email" inputMode="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!err.email} aria-describedby={err.email ? 'e-email' : undefined} />
              </label>
              {err.email && <span id="e-email" className="err">{err.email}</span>}
            </div>
          </div>
          <label className="trap" aria-hidden="true">Сайт<input tabIndex={-1} value={f.website} onChange={set('website')} autoComplete="off" /></label>
          {err.form && <p className="err" role="alert">{err.form}</p>}
          <div className="ctas">
            <button type="submit" className="btn" disabled={state === 'busy'}>{state === 'busy' ? 'Праща…' : 'Прати с неона'} <Arrow /></button>
          </div>
        </form>
      )}
      <div className="contacts">
        <a href="mailto:nikolay.blagyov@gmail.com">nikolay.blagyov@gmail.com</a>
        <a href="/">Приложението</a>
        <a href="/cheatcode/">Чийт Код</a>
      </div>
    </div>
  )
}
