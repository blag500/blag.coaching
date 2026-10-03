import { useState, useMemo, useRef, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import { haptic } from '../../lib/haptics'
import { todayStr } from '../../hooks/useCheckin'
import { usePosingShots } from '../../hooks/usePosingShots'
import { POSES } from './poses'
import { shrinkToJpeg } from './shrink'
import styles from './PosingCompare.module.css'

/**
 * Същата поза, две дати.
 *
 * Сравнението е по поза, защото само тогава значи нещо: фронт двоен бицепс
 * от март срещу фронт двоен бицепс от юни. Двете дати се избират с едно
 * докосване всяка — по подразбиране последната и предишната, защото най-често
 * въпросът е „какво се промени от миналия път".
 *
 * Плъзгачът е по-силен от „една до друга": очите сравняват едно място на
 * екрана, вместо да скачат между две. Работи, когато снимките са от едно
 * разстояние — затова камерата показва контура от миналия път.
 *
 * `save` липсва при треньора: той гледа, не качва и не трие.
 */

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: '2-digit' })
}

function Slider({ before, after, labelA, labelB }) {
  const [x, setX] = useState(50)
  const boxRef = useRef(null)
  const drag = useRef(false)

  const move = e => {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r) return
    setX(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  }

  return (
    <div
      ref={boxRef}
      className={styles.slider}
      onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
      onPointerMove={e => { if (drag.current) move(e) }}
      onPointerUp={() => { drag.current = false }}
      onPointerCancel={() => { drag.current = false }}
    >
      <img src={after} alt={labelB} draggable={false} />
      <img
        src={before}
        alt={labelA}
        draggable={false}
        className={styles.over}
        style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}
      />
      <span className={styles.handle} style={{ left: `${x}%` }} aria-hidden="true" />
      <span className={`${styles.tag} ${styles.tagL}`}>{labelA}</span>
      <span className={`${styles.tag} ${styles.tagR}`}>{labelB}</span>
    </div>
  )
}

/** Треньорът: снимките на клиента, само за гледане. */
export function CoachPosing({ clientId }) {
  const { shots, loading } = usePosingShots(clientId)
  if (loading) return null
  return <PosingCompare shots={shots} />
}

export default function PosingCompare({ shots, save, remove, initialPose }) {
  const { t } = useSettings()

  // Позите, които имат поне една снимка; собственикът вижда всички, за да
  // може да качи в празна.
  const withShots = useMemo(() => new Set(shots.map(s => s.pose_id)), [shots])
  const poses = save ? POSES : POSES.filter(p => withShots.has(p.id))

  const [poseId, setPoseId] = useState(
    initialPose ?? POSES.find(p => withShots.has(p.id))?.id ?? POSES[0].id,
  )
  const list = useMemo(
    () => shots.filter(s => s.pose_id === poseId).sort((a, b) => (a.taken_on < b.taken_on ? 1 : -1)),
    [shots, poseId],
  )

  const [pick, setPick] = useState({ a: null, b: null })  // id-та на снимките
  const [slot, setSlot] = useState('a')
  const [mode, setMode] = useState('slider')
  const [adding, setAdding] = useState(false)
  const [addDate, setAddDate] = useState(todayStr())
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  // При смяна на позата или на снимките в нея — последната срещу предишната.
  // Ключът са id-тата, не броят: снимка, заменена в същия ден, не мени броя,
  // но мени id-то, и старият избор би сочил в нищото.
  const listKey = list.map(s => s.id).join(',')
  useEffect(() => {
    setPick({ a: list[1]?.id ?? null, b: list[0]?.id ?? null })
    setSlot('a')
  }, [poseId, listKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const a = list.find(s => s.id === pick.a)
  const b = list.find(s => s.id === pick.b)

  function choose(shot) {
    haptic('tap')
    setPick(p => ({ ...p, [slot]: shot.id }))
    setSlot(s => (s === 'a' ? 'b' : 'a'))
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !save) return
    setBusy(true)
    const blob = await shrinkToJpeg(file).catch(() => null)
    const res = blob ? await save(poseId, blob, addDate) : { error: true }
    setBusy(false)
    if (res.error) { haptic('reject'); return }
    haptic('success')
    setAdding(false)
  }

  async function del(shot) {
    if (!remove || !window.confirm(t('pose.cmp.confirmDelete'))) return
    await remove(shot)
  }

  if (!poses.length) {
    return <p className={styles.empty}>{t('pose.cmp.none')}</p>
  }

  const poseName = t(`pose.${poseId}.name`)

  return (
    <div className={styles.wrap}>
      <div className={styles.poses}>
        {poses.map(p => (
          <button
            key={p.id}
            type="button"
            className={`${styles.pose} ${p.id === poseId ? styles.poseOn : ''} ${withShots.has(p.id) ? '' : styles.poseEmpty}`}
            onClick={() => setPoseId(p.id)}
          >{p.abbr}</button>
        ))}
      </div>

      <h3 className={styles.title}>{poseName}</h3>

      {list.length >= 2 && a && b ? (
        <>
          <div className={styles.modes}>
            {['slider', 'side'].map(m => (
              <button key={m} type="button"
                className={`${styles.mode} ${mode === m ? styles.modeOn : ''}`}
                onClick={() => setMode(m)}>{t(`pose.cmp.mode.${m}`)}</button>
            ))}
          </div>
          {mode === 'slider' ? (
            <Slider before={a.url} after={b.url} labelA={fmtDate(a.taken_on)} labelB={fmtDate(b.taken_on)} />
          ) : (
            <div className={styles.side}>
              {[a, b].map(s => (
                <figure key={s.id}>
                  <img src={s.url} alt={poseName} />
                  <figcaption>{fmtDate(s.taken_on)}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </>
      ) : list.length === 1 ? (
        <div className={styles.single}>
          <img src={list[0].url} alt={poseName} />
          <p>{t('pose.cmp.needTwo')}</p>
        </div>
      ) : (
        <p className={styles.empty}>{t('pose.cmp.noneForPose')}</p>
      )}

      {list.length >= 2 && (
        <>
          <div className={styles.slots}>
            {['a', 'b'].map(k => {
              const s = k === 'a' ? a : b
              return (
                <button key={k} type="button"
                  className={`${styles.slot} ${slot === k ? styles.slotOn : ''}`}
                  onClick={() => setSlot(k)}>
                  <span>{t(k === 'a' ? 'pose.cmp.before' : 'pose.cmp.after')}</span>
                  <b>{s ? fmtDate(s.taken_on) : '—'}</b>
                </button>
              )
            })}
          </div>
          <div className={styles.dates}>
            {list.map(s => (
              <div key={s.id} className={styles.dateCell}>
                <button
                  type="button"
                  className={`${styles.date} ${s.id === pick.a ? styles.dateA : ''} ${s.id === pick.b ? styles.dateB : ''}`}
                  onClick={() => choose(s)}
                >
                  {s.url && <img src={s.url} alt="" loading="lazy" />}
                  <span>{fmtDate(s.taken_on)}</span>
                </button>
                {remove && (
                  <button type="button" className={styles.del} onClick={() => del(s)}
                    aria-label={t('pose.cmp.delete')}>✕</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {save && (
        <div className={styles.add}>
          {!adding ? (
            <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
              {t('pose.cmp.addFromDevice')}
            </button>
          ) : (
            <div className={styles.addForm}>
              <span>{t('pose.cmp.addFor', { pose: poseName })}</span>
              <label>
                {t('pose.cmp.date')}
                <input type="date" value={addDate} max={todayStr()} onChange={e => setAddDate(e.target.value)} />
              </label>
              <div className={styles.addRow}>
                <button type="button" className={styles.addBtn} disabled={busy || !addDate}
                  onClick={() => fileRef.current?.click()}>
                  {busy ? t('pose.cmp.uploading') : t('pose.cmp.pick')}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setAdding(false)}>
                  {t('pose.cmp.cancel')}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
