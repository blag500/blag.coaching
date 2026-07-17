import { useState, useEffect, useRef } from 'react'
import styles from './PosingPage.module.css'

const POSES = [
  {
    id: 'fdb',
    name: 'ФРОНТ ДВОЕН БИЦЕП',
    abbr: 'FDB',
    desc: 'Пълната супинация на китките извежда максималния бицепсен пик чрез изолация на m. biceps brachii (дълга глава). Лактите на нивото или над рамото разкриват предната делтоидна глава и серратус антериор. Съдиите оценяват размер, пик и симетрия на ръцете, ширина на рамената и развитие на квадрицепсите и прасците.',
    cues: ['Пълна супинация на китките — върховете на пръстите навън', 'Лакти на нивото или малко над раменете', 'Стегни квадрицепсите, изнеси един крак напред с флексиран прасец'],
  },
  {
    id: 'fls',
    name: 'ФРОНТ ЛАТ СПРЕД',
    abbr: 'FLS',
    desc: 'Скапуларната депресия (рамената надолу, не назад) при едновременна абдукция принудително активира m. latissimus dorsi и m. serratus anterior, създавайки V-образна форма. Разстоянието между талията и раменете е основният визуален критерий — колкото по-тясна е талията спрямо ширината на лат., толкова по-изразен е V-taper-ът.',
    cues: ['Ръцете на кръста, притиснати — лактите максимално напред', 'Рамената надолу (депресия), не назад', 'Разтвори гърба като крила — усещане за разширяване настрани'],
  },
  {
    id: 'sc_r',
    name: 'СТРАНИЧЕН ЧЕСТ',
    abbr: 'SC',
    desc: 'Механичната компресия на гърдата към горния мишничен мускул увеличава видимата дебелина на m. pectoralis major (стернална глава). Стиснатите ръце активират и трицепса от страната на публиката. Ротацията на таза назад допълнително разкрива глутеусите и разделянето на задното бедро.',
    cues: ['Гърдата притисната към горния мишник — усещане за „смачкване"', 'Ръцете заключени, трицепсът натиснат надолу', 'Предният крак леко сгънат, прасецът флексиран'],
  },
  {
    id: 'bdb',
    name: 'БЕК ДВОЕН БИЦЕП',
    abbr: 'BDB',
    desc: 'Задната двойна е диагностична поза за цялата задна верига: трапец, ромбоиди, инфраспинатус, lats, еректор спинае, глутеуси, hamstrings и прасци се активират едновременно. Флексията на едно коляно (heel to glute) разкрива разделянето между m. biceps femoris и m. semitendinosus — ключов критерий за задно бедро.',
    cues: ['Стегни глутеусите максимално — те „издърпват" цялата задна верига', 'Единият крак флексиран на пета към задника', 'Ръцете извити нагоре, китките навън — идентично с фронт'],
  },
  {
    id: 'bls',
    name: 'БЕК ЛАТ СПРЕД',
    abbr: 'BLS',
    desc: 'Идентичен механизъм на лат разтваряне с фронт версията, но съдиите виждат масата и дебелината на целия гръб: m. teres major, m. infraspinatus и m. latissimus dorsi. Натискът на лактите напред при фиксирани ръце на кръста е основният двигател — скапуларната депресия остава критична и в тази поза.',
    cues: ['Ръцете фиксирани на кръста, лактите напред', 'Рамената надолу — скапуларна депресия е ключова', 'Разтвори гърба максимално, стегни глутеусите'],
  },
  {
    id: 'st_r',
    name: 'СТРАНИЧЕН ТРИЦЕП',
    abbr: 'ST',
    desc: 'Пълната екстензия на лакътя с лека вътрешна ротация на рамото изолира m. triceps brachii (особено латералната и дългата глава). Позицията на ръката зад тялото визуално отделя трицепса от делтоида, показвайки обема и дефиницията му в профил. Допълнително се оценяват гърдата, облиците и бедрото от страничния план.',
    cues: ['Ръката зад тялото — лакътят сочи назад, не надолу', 'Пълна екстензия — заключи лакътя', 'Изтласкай гърдата напред, натисни трицепса назад и надолу'],
  },
  {
    id: 'at',
    name: 'АБДОМИНАЛИ И БЕДРА',
    abbr: 'A&T',
    desc: 'Принудителното издишане при изометрична флексия на торса разкрива сегментацията на m. rectus abdominis и m. obliquus externus abdominis. Изнесеният крак напред с флексиран квадрицепс показва m. vastus lateralis — ширината на „sweep"-а е основен критерий. Ръцете зад главата повдигат ребрата и естествено разтягат коремния мускул.',
    cues: ['Пълно издишане и стягане на корема — не засмуквай, а стягай', 'Изнеси крака напред и флексирай квадрицепса максимално', 'Ръцете зад главата, лактите настрани'],
  },
  {
    id: 'mm',
    name: 'МОСТ МОСТРИ',
    abbr: 'MM',
    desc: 'Мост мостри е финалната диагностична поза — трапецът и пекторалисите се контрахират едновременно при вътрешна ротация и депресия на рамото. Плътността на мускулното покритие и цялостната кондиция (сухота, плейсмент, разделяне) са основните критерии. Съществуват два варианта: „crab" (ръцете пред гърдите) акцентира трапеца, „ръце на кръста" показва повече корем.',
    cues: ['Натисни ръцете едната към другата или към кръста — усети как трапецът се покачва', 'Наклони торса леко напред (10-15°)', 'Максимална контракция на всичко едновременно — задържи 2-3 секунди'],
  },
]

const DURATIONS = [15, 30, 60]

const R = 44
const CIRC = 2 * Math.PI * R

export default function PosingPage() {
  const [mode, setMode] = useState('list')
  const [poseIndex, setPoseIndex] = useState(0)
  const [duration, setDuration] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  const pose = POSES[poseIndex]

  useEffect(() => {
    if (mode !== 'session' || paused) {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          advance()
          return duration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [mode, paused, poseIndex, duration])

  function startSession() {
    setPoseIndex(0)
    setTimeLeft(duration)
    setPaused(false)
    setMode('session')
  }

  function advance() {
    if (poseIndex + 1 >= POSES.length) {
      setMode('done')
    } else {
      setPoseIndex(i => i + 1)
      setTimeLeft(duration)
    }
  }

  function prev() {
    if (poseIndex > 0) {
      setPoseIndex(i => i - 1)
      setTimeLeft(duration)
    }
  }

  function drillPose(idx) {
    setPoseIndex(idx)
    setTimeLeft(duration)
    setPaused(true)
    setMode('session')
  }

  const progressPct = timeLeft / duration
  const strokeOffset = CIRC * progressPct
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  if (mode === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.doneScreen}>
          <div className={styles.doneTitle}>СЕСИЯТА ЗАВЪРШИ</div>
          <p className={styles.doneSub}>{POSES.length} пози · {duration}с всяка</p>
          <button className={styles.startBtn} onClick={() => setMode('list')} type="button">
            ОБРАТНО КЪМ СПИСЪКА
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'session') {
    return (
      <div className={styles.page}>
        <header className={styles.sessionHeader}>
          <button className={styles.backBtn} onClick={() => setMode('list')} type="button">
            ←
          </button>
          <div className={styles.dots}>
            {POSES.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === poseIndex ? styles.dotActive : i < poseIndex ? styles.dotDone : ''}`}
              />
            ))}
          </div>
          <span className={styles.poseCount}>{poseIndex + 1}/{POSES.length}</span>
        </header>

        <div className={styles.sessionBody}>
          <div className={styles.poseAbbr}>{pose.abbr}</div>
          <h2 className={styles.poseName}>{pose.name}</h2>

          <div className={styles.timerWrap}>
            <svg width={R * 2 + 20} height={R * 2 + 20} viewBox={`0 0 ${R * 2 + 20} ${R * 2 + 20}`} aria-hidden="true">
              <circle
                cx={R + 10} cy={R + 10} r={R}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="6"
              />
              <circle
                cx={R + 10} cy={R + 10} r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - strokeOffset}
                transform={`rotate(-90 ${R + 10} ${R + 10})`}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <div className={styles.timerCenter}>
              <span className={styles.timerNum}>
                {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : secs}
              </span>
              <span className={styles.timerLabel}>сек.</span>
            </div>
          </div>

          <p className={styles.poseDesc}>{pose.desc}</p>

          <ul className={styles.cueList}>
            {pose.cues.map((cue, i) => (
              <li key={i} className={styles.cue}>{cue}</li>
            ))}
          </ul>
        </div>

        <div className={styles.sessionActions}>
          <button
            className={styles.navBtn}
            onClick={prev}
            disabled={poseIndex === 0}
            type="button"
          >
            ←
          </button>
          <button
            className={`${styles.pauseBtn} ${paused ? styles.pauseBtnActive : ''}`}
            onClick={() => setPaused(p => !p)}
            type="button"
          >
            {paused ? 'ПРОДЪЛЖИ' : 'ПАУЗА'}
          </button>
          <button
            className={styles.navBtn}
            onClick={advance}
            type="button"
          >
            →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.listHeader}>
        <h1 className={styles.title}>ПОУЗИНГ</h1>
        <p className={styles.subtitle}>ПРАКТИКА</p>
      </header>

      <div className={styles.controls}>
        <span className={styles.controlLabel}>ПАУЗА НА ПОЗА</span>
        <div className={styles.durationPicker}>
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              className={`${styles.durBtn} ${duration === d ? styles.durBtnActive : ''}`}
              onClick={() => setDuration(d)}
            >
              {d}с
            </button>
          ))}
        </div>
      </div>

      <button className={styles.startBtn} onClick={startSession} type="button">
        СТАРТ СЕСИЯ · {POSES.length} ПОЗИ
      </button>

      <div className={styles.poseList}>
        {POSES.map((p, i) => (
          <button
            key={p.id}
            className={styles.poseRow}
            onClick={() => drillPose(i)}
            type="button"
          >
            <span className={styles.poseRowAbbr}>{p.abbr}</span>
            <span className={styles.poseRowName}>{p.name}</span>
            <span className={styles.poseRowArrow}>→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
