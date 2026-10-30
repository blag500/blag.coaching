import { lazy, Suspense, useEffect, useState } from 'react'
import Sections from './Sections.jsx'
import Picker from './Picker.jsx'
import { hasStart, jumpTo, takeStart } from './nav'
import { soundOff, soundOn } from './sound'

/* Светът „Благ“ (Р20). Два изгледа с един и същ текст:
 *  · 3D — сцената с неона (Scene, зарежда се отделно);
 *  · лек — картина и нормален скрол: без WebGL, с ?lite=1 или по избор,
 *    когато 3D-то върви под 40 кадъра. */

const Scene = lazy(() => import('./Scene.jsx'))

function hasWebGL() {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

export default function App() {
  const [lite, setLite] = useState(() => /[?&]lite=1/.test(window.location.search) || !hasWebGL())
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [keep, setKeep] = useState(false)
  const [sound, setSound] = useState(false)
  const [clean, setClean] = useState(false)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [progress, setProgress] = useState(0)
  const [pick, setPick] = useState(() => !hasStart())

  useEffect(() => { document.body.classList.toggle('lite', lite) }, [lite])
  // Окото: текстът и менюто изчезват, сцената остава и скролът си работи.
  useEffect(() => { document.body.classList.toggle('clean', clean && !lite) }, [clean, lite])
  useEffect(() => {
    const id = lite && takeStart()
    if (id) setTimeout(() => jumpTo(id, 'auto'), 0)
  }, [lite])

  const go = (id) => { setPick(false); jumpTo(id) }
  const toggleSound = () => { if (sound) soundOff(); else soundOn(); setSound(!sound) }

  return (
    <>
      <header className="bar">
        <button type="button" className="logo" onClick={() => setPick(true)} aria-label="Избор на проект">BLAG</button>
        <nav className="menu" aria-label="Светът">
          <button type="button" onClick={() => go('zala')}>Залата</button>
          <button type="button" onClick={() => go('magazin')}>Магазинът</button>
          <button type="button" className="wideOnly" onClick={() => go('vhod')}>Входът</button>
          <button type="button" onClick={() => go('kontakt')}>Контакт</button>
          <a className="wideOnly" href="/">Приложението</a>
        </nav>
        {!lite && (
          <button type="button" className="sound" aria-pressed={clean} aria-label={clean ? 'Покажи текста' : 'Скрий текста'} onClick={() => setClean(!clean)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{clean && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
        <button type="button" className="sound" aria-pressed={sound} aria-label={sound ? 'Спри звука' : 'Пусни звука'} onClick={toggleSound}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />{sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
          </svg>
        </button>
      </header>

      {lite ? (
        <main className="lite">
          <div className="backdrop" aria-hidden="true" />
          <Sections lite />
        </main>
      ) : (
        <>
          <Suspense fallback={null}>
            <Scene reduce={reduce} onReady={() => setReady(true)} onSlow={() => setSlow(true)} onProgress={setProgress} />
          </Suspense>
          <div className={`loader ${ready ? 'gone' : ''}`} role="status" aria-live="polite">
            <div className="in">
              {/* Знакът като неонова тръба: пали се, докато сцената се зарежда. */}
              <img className="neonMark" src="/svyat/neon/tube-mark.svg" alt=""
                style={{ '--p': progress / 100 }} />
              <span className="count">{String(Math.round(progress)).padStart(3, '0')} / 100</span>
              <span className="small">Палим светлините</span>
            </div>
          </div>
          {slow && !keep && (
            <div className="toast glass" role="dialog" aria-label="Лек изглед">
              3D върви бавно на това устройство. Лекият изглед е същият, по-гладък.
              <div className="ctas">
                <button type="button" className="btn" onClick={() => setLite(true)}>Лек изглед</button>
                <button type="button" className="ghost" onClick={() => setKeep(true)}>Остани с 3D</button>
              </div>
            </div>
          )}
        </>
      )}
      {/* В 3D излиза, щом сцената е готова — не върху зареждането. BLAG го връща. */}
      {pick && (lite || ready) && <Picker onPick={go} onClose={() => setPick(false)} />}
    </>
  )
}
