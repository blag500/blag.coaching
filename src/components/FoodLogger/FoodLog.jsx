import { useState, useRef, useEffect } from 'react'
import CopyPreviousDay from './CopyPreviousDay'
import QuickAddSheet from './QuickAddSheet'
import { MEALS, MEAL_LABEL_KEY } from './meals'
import { useSettings } from '../../contexts/SettingsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './FoodLog.module.css'
import MealPicker from './MealPicker'

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export default function FoodLog({ log, onRemove, onClear, onEdit, onAddRaw, onPhotoUpload, onPhotoRemove, date }) {
  const { t } = useSettings()
  const [editingId,    setEditingId]    = useState(null)
  const [draft,        setDraft]        = useState({})
  const [lastRemoved,  setLastRemoved]  = useState(null)
  const [uploadingId,  setUploadingId]  = useState(null)
  const [lightboxUrl,  setLightboxUrl]  = useState(null)
  const [quickMeal,    setQuickMeal]    = useState(null)  // section + → history sheet

  // Drag-to-move-meal — same recipe as the dashboard-cards reorder: a
  // long-press separates "pick this up" from "scroll the page", then the row
  // itself follows the finger via transform (no ghost), and drop over another
  // meal section changes meal_type. The hold is abandoned the moment the
  // finger travels, so a scroll that starts on a row is still a scroll.
  const HOLD_MS = 220
  const SCROLL_CANCEL_PX = 8

  const [dragId, setDragId] = useState(null)
  const rowEls = useRef(new Map())     // entry id → element
  const hold  = useRef(null)           // pending long-press { timer, x, y }
  const drag  = useRef(null)           // live drag { entry, startY, grabY }
  const dragIdRef = useRef(null)
  // Последното известно място на пръста. При самопревъртане пръстът стои
  // неподвижен и pointermove мълчи, а редът пак трябва да се прерисува —
  // затова положението живее в реф, а не само в събитието.
  const point = useRef({ x: 0, y: 0 })
  // Вторият пръст: този, който върти страницата, докато първият държи.
  const scroller = useRef(null)     // { pointerId, startY, startScroll }
  // Лентите на секциите в координати на страницата, мерени веднъж при
  // хващането. Виж measureZones — четенето им на всеки кадър беше половината
  // от забавянето.
  const zones     = useRef([])
  const hoverEl   = useRef(null)    // осветената в момента секция
  const wantScroll = useRef(null)   // накъде вторият пръст иска страницата
  const lastShift = useRef(null)
  // Превъртането се води тук, а не се чете от прозореца: четенето по средата
  // на кадър кара браузъра да преподреди страницата, за да отговори точно.
  const scrollY   = useRef(0)
  const maxY      = useRef(0)
  const fling     = useRef(0)       // скорост след пускане, в пиксели на кадър

  function cancelHold() {
    if (hold.current) { clearTimeout(hold.current.timer); hold.current = null }
  }

  /** Къде стои всяка секция, в координати на страницата.
   *
   *  Мери се веднъж, при хващането. Дотук секцията под пръста се търсеше с
   *  elementsFromPoint на всеки кадър — а точно преди това редът получаваше
   *  нов transform, значи браузърът трябваше да преподреди целия списък, за
   *  да отговори. Двайсет и осем реда, два пъти на кадър: това беше
   *  забавянето.
   *
   *  Лентите не мърдат по време на влачене: единственото, което се променя,
   *  е осветяването на секцията, а то е сянка и фон, не разположение. */
  function measureZones() {
    const sy = window.scrollY
    zones.current = [...document.querySelectorAll('[data-drop-meal]')].map(el => {
      const r = el.getBoundingClientRect()
      return { el, meal: el.getAttribute('data-drop-meal'), top: r.top + sy, bottom: r.bottom + sy }
    })
  }

  /** Коя секция е под тази височина на екрана. Чиста сметка, без четене. */
  function zoneAtY(y, sy = window.scrollY) {
    const doc = y + sy
    for (const z of zones.current) {
      if (doc >= z.top && doc <= z.bottom) return z
    }
    return null
  }

  /** Pointer down on the grip starts a drag immediately — the whole point of
   *  a visible handle is that its meaning is unambiguous. The rest of the row
   *  keeps its taps for edit/remove/photo. */
  function onGripPointerDown(e, entry) {
    if (editingId != null) return
    if (e.button != null && e.button !== 0) return
    // Втори пръст върху друга дръжка не започва втора влачба: едно ястие в
    // ръката, иначе drag.current се презаписва и първият ред остава вдигнат
    // завинаги.
    if (drag.current) return
    e.preventDefault()
    e.stopPropagation()
    cancelHold()
    const el = rowEls.current.get(entry.id)
    if (!el) return
    // Kill the itemIn entrance animation and any leftover transition —
    // both would fight the JS transform frame-by-frame and the row would
    // just sit still. willChange keeps the compositor's layer warm.
    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.willChange = 'transform'
    measureZones()
    const slotTop = el.getBoundingClientRect().top
    // slotTop е спрямо прозореца, а прозорецът ще се движи под пръста.
    // Превъртяното се вади наум при всяко рисуване, иначе редът изостава
    // с точно толкова, с колкото е пропълзяла страницата.
    drag.current = { entry, grabY: e.clientY - slotTop, slotTop, startScroll: window.scrollY, pointerId: e.pointerId }
    point.current = { x: e.clientX, y: e.clientY }
    dragIdRef.current = entry.id
    hoverEl.current = null
    lastShift.current = null
    fling.current = 0
    scrollY.current = window.scrollY
    const doc = document.scrollingElement || document.documentElement
    maxY.current = Math.max(0, doc.scrollHeight - window.innerHeight)
    setDragId(entry.id)
    // Some iOS PWAs stop firing pointermove on window if the source element
    // hadn't captured — captureEvents on the grip keeps them coming.
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }

  // Live handlers held in a ref so we can attach the window listeners ONCE.
  // `onEdit` is a fresh function every render (bound to updateEntry from a
  // hook), and re-adding the listeners every render kept losing drags mid-way.
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit

  useEffect(() => {
    /** Докъде стига превъртането на страницата. */
    function maxScroll() {
      const el = document.scrollingElement || document.documentElement
      return Math.max(0, el.scrollHeight - window.innerHeight)
    }

    /* Втори пръст, докато ястието е в ръката.
     *
     * Страницата не се превърта сама: дръжката е с touch-action: none, а
     * браузърът смята позволеното за целия жест като сечение на всички
     * докосвания — щом първото не превърта, не превърта и вторият пръст,
     * колкото и да го дърпаш. Проверено, не предположено.
     *
     * Затова превъртането се смята тук: пръстът мести страницата един към
     * един, точно както би я местил сам. Сметката е абсолютна, спрямо
     * мястото, откъдето е тръгнал — ако някой браузър все пак превърти сам,
     * двете дават едно и също число и не се бият. */
    function onDown(e) {
      const d = drag.current
      if (!d || scroller.current) return
      if (e.pointerId === d.pointerId) return
      scroller.current = {
        pointerId: e.pointerId, startY: e.clientY, startScroll: scrollY.current,
        lastY: e.clientY, lastT: e.timeStamp || performance.now(), vel: 0,
      }
      fling.current = 0            // нов пръст спира предишното засилване
    }

    function onMove(e) {
      const sc = scroller.current
      if (sc && e.pointerId === sc.pointerId) {
        // Само желанието се записва; страницата се мести веднъж на кадър.
        // Пръстът дава по няколко събития на кадър, а всяко scrollTo е
        // отделно превъртане, отделно събитие и отделно рисуване.
        wantScroll.current = sc.startScroll - (e.clientY - sc.startY)
        // Скоростта — за засилването след пускане. Смесва се със старата,
        // защото едно събитие лови и трепването на пръста, а засилването
        // трябва да носи посоката на движението, не последния милиметър.
        const now = e.timeStamp || performance.now()
        const dt  = Math.max(now - sc.lastT, 1)
        const inst = ((sc.lastY - e.clientY) / dt) * 16
        sc.vel = sc.vel * 0.7 + inst * 0.3
        sc.lastY = e.clientY
        sc.lastT = now
        return
      }
      // Still deciding whether this is a drag or a scroll.
      if (hold.current) {
        const dx = Math.abs(e.clientX - hold.current.x)
        const dy = Math.abs(e.clientY - hold.current.y)
        if (dx > SCROLL_CANCEL_PX || dy > SCROLL_CANCEL_PX) cancelHold()
        return
      }
      const d = drag.current
      if (!d) return
      // Само пръстът, който държи реда. Вторият пръст върти страницата и
      // неговите движения нямат нищо общо с това къде стои ястието — без
      // тази проверка редът скача при него.
      if (d.pointerId != null && e.pointerId !== d.pointerId) return
      // Само записване. Рисува кадърът.
      point.current = { x: e.clientX, y: e.clientY }
    }
    function onUp(e) {
      if (scroller.current && e.pointerId === scroller.current.pointerId) {
        // Засилване. Пръст, който отхвърчи и спира като закован, е усещането
        // на нещо евтино — истинското превъртане носи ръката още малко.
        // Праг от два пиксела на кадър, за да не се плъзга след бавно пускане.
        const v = scroller.current.vel
        fling.current = Math.abs(v) > 2 ? Math.max(Math.min(v, 60), -60) : 0
        scroller.current = null
        return
      }
      cancelHold()
      const d = drag.current
      if (!d) return
      // Вдигнатият втори пръст не пуска ястието.
      if (d.pointerId != null && e.pointerId !== d.pointerId) return
      const el = rowEls.current.get(d.entry.id)
      if (el) {
        el.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)'
        el.style.transform = ''
        el.style.willChange = ''
        // Restore the entrance-animation slot after the settle transition ends.
        setTimeout(() => { if (el) el.style.animation = '' }, 220)
      }
      const zone = zoneAtY(e.clientY, scrollY.current)
      const target = zone?.meal ?? null
      if (target && target !== '_other' && target !== d.entry.meal_type) {
        onEditRef.current?.(d.entry.id, { meal_type: target })
      }
      drag.current = null
      dragIdRef.current = null
      scroller.current = null
      wantScroll.current = null
      fling.current = 0
      hoverEl.current?.classList.remove(styles.mealGroupHover)
      hoverEl.current = null
      setDragId(null)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // Един кадър, едно рисуване — и нито едно четене.
  //
  // Четири неща искат да местят страницата и реда: пръстът, който държи
  // ястието, вторият пръст, който върти, засилването след неговото пускане и
  // самопревъртането при ръба. Всички те само записват какво искат. Кадърът
  // ги събира, стига до едно число и пише два пъти: превъртането и реда.
  //
  // Ключът е, че кадърът нищо не чете. window.scrollY по средата на кадър
  // кара браузъра да преподреди страницата, за да отговори точно — а точно
  // това забавяше: пишеш transform, питаш докъде си, браузърът смята наново
  // целия списък. Затова превъртането се води тук и се сверява с прозореца
  // само при хващането.
  //
  // Списъкът е по-дълъг от екрана, а докато редът е вдигнат, страницата не се
  // превърта сама. Пръст в горната или долната ивица я кара да пълзи, толкова
  // по-бързо, колкото по-навън е. Долната ивица е по-дебела: там стои лентата
  // с разделите и пръстът стига до ръба по-рано, отколкото до дъното.
  useEffect(() => {
    if (!dragId) return
    const EDGE_TOP = 96
    const EDGE_BOT = 132
    const MAX_STEP = 15      // пиксели на кадър в най-крайното положение
    const DECAY    = 0.94    // колко от засилването остава след един кадър

    let raf = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const d = drag.current
      if (!d) return

      // 1. Докъде да стигне страницата този кадър.
      let y = scrollY.current
      if (wantScroll.current != null) {
        y = wantScroll.current
        wantScroll.current = null
      } else if (fling.current) {
        y += fling.current
        fling.current *= DECAY
        if (Math.abs(fling.current) < 0.4) fling.current = 0
      }
      const py = point.current.y
      const h  = window.innerHeight
      if (py < EDGE_TOP)          y -= MAX_STEP * (1 - py / EDGE_TOP)
      else if (py > h - EDGE_BOT) y += MAX_STEP * (1 - (h - py) / EDGE_BOT)

      y = Math.min(Math.max(y, 0), maxY.current)
      if (y !== scrollY.current) {
        // В края спира и засилването — иначе продължава да се хаби кадри
        // срещу стена.
        if (y === 0 || y === maxY.current) fling.current = 0
        scrollY.current = y
        window.scrollTo(0, y)
      } else if (fling.current && (y === 0 || y === maxY.current)) {
        fling.current = 0
      }

      // 2. Редът. Сравнява се написаното, за да не се пипа стилът напразно —
      //    при държан пръст и спряла страница това е всеки кадър.
      const el = rowEls.current.get(d.entry.id)
      if (el) {
        const shift = Math.round((py - d.grabY) - d.slotTop + (y - d.startScroll))
        if (shift !== lastShift.current) {
          lastShift.current = shift
          el.style.transform = `translateY(${shift}px)`
        }
      }

      // 3. Осветената секция. Класът се слага направо върху нея, а не през
      //    React: едно състояние тук значеше цял списък наново при всяко
      //    минаване покрай граница между хранения, а списъкът е четирийсет
      //    реда. Слагането е и самолечебно — ако React прерисува междувременно
      //    и изчисти класа, следващият кадър го връща.
      const z = zoneAtY(py, y)
      const lit = z && z.meal !== '_other' && z.meal !== d.entry.meal_type ? z.el : null
      if (lit !== hoverEl.current) {
        hoverEl.current?.classList.remove(styles.mealGroupHover)
        hoverEl.current = lit
      }
      lit?.classList.add(styles.mealGroupHover)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [dragId])

  const photoInputRef  = useRef()
  const photoTargetRef = useRef(null)  // which entry id the next pick targets

  function handleRemove(entry) {
    setLastRemoved(entry)
    onRemove(entry.id)
  }

  function handleUndo() {
    if (!lastRemoved) return
    onAddRaw({
      name:     lastRemoved.name,
      grams:    lastRemoved.grams,
      kcal:     lastRemoved.kcal,
      protein:  lastRemoved.protein,
      carbs:    lastRemoved.carbs,
      fat:      lastRemoved.fat,
      mealType: lastRemoved.meal_type ?? undefined,
    })
    setLastRemoved(null)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setDraft({
      // Стар ред без хранене остава без избрано хапче, вместо да му се
      // измисли едно: „не знам кое" е вярното състояние, докато човекът не
      // каже.
      meal:    MEAL_LABEL_KEY[entry.meal_type] ? entry.meal_type : null,
      name:    entry.name,
      grams:   String(entry.grams || ''),
      kcal:    String(entry.kcal),
      protein: String(entry.protein),
      carbs:   String(entry.carbs),
      fat:     String(entry.fat),
    })
  }

  function handleGramsChange(entry, val) {
    const g = parseFloat(val)
    if (g > 0 && entry.grams > 0) {
      const ratio = g / entry.grams
      setDraft(prev => ({
        ...prev,
        grams:   val,
        kcal:    String(Math.round(entry.kcal    * ratio)),
        protein: String(Math.round(entry.protein * ratio * 10) / 10),
        carbs:   String(Math.round(entry.carbs   * ratio * 10) / 10),
        fat:     String(Math.round(entry.fat     * ratio * 10) / 10),
      }))
    } else {
      setDraft(prev => ({ ...prev, grams: val }))
    }
  }

  function handleSave(entry) {
    onEdit(entry.id, {
      // Само ако е избрано: инак редактирането на стар ред без хранене би
      // го записало като null върху null.
      ...(draft.meal ? { meal_type: draft.meal } : {}),
      name:    draft.name.trim() || entry.name,
      grams:   parseFloat(draft.grams)              || 0,
      kcal:    Math.round(parseFloat(draft.kcal)     || 0),
      protein: Math.round((parseFloat(draft.protein) || 0) * 10) / 10,
      carbs:   Math.round((parseFloat(draft.carbs)   || 0) * 10) / 10,
      fat:     Math.round((parseFloat(draft.fat)     || 0) * 10) / 10,
    })
    setEditingId(null)
  }

  function openPhotoPicker(entryId) {
    photoTargetRef.current = entryId
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
      photoInputRef.current.click()
    }
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files[0]
    if (!file || !photoTargetRef.current || !onPhotoUpload) return
    const id = photoTargetRef.current
    setUploadingId(id)
    await onPhotoUpload(id, file)
    setUploadingId(null)
    photoTargetRef.current = null
  }

  // One log row, in either its editing or its resting shape. Pulled out of the
  // list so the day can be drawn as meal sections without duplicating it.
  function renderEntry(entry, i) {
    return editingId === entry.id ? (
      <li key={entry.id} className={`${styles.entry} ${styles.entryEditing}`}>
        <div className={styles.editNameField}>
          <label className={styles.editLabel} htmlFor={`edit-name-${entry.id}`}>{t('foodlog.editName')}</label>
          <input
            id={`edit-name-${entry.id}`}
            className={styles.editInput}
            type="text"
            value={draft.name}
            onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div className={styles.editGramsRow}>
          <label className={styles.editLabel}>{t('foodlog.editGrams')}</label>
          <input
            className={styles.editInput}
            type="number"
            min="0"
            value={draft.grams}
            onChange={e => handleGramsChange(entry, e.target.value)}
          />
          <span className={styles.editUnit}>g</span>
        </div>

        <div className={styles.editMacroGrid}>
          {[
            { key: 'kcal',    label: t('foodlog.editKcal') },
            { key: 'protein', label: t('foodlog.editProtein') },
            { key: 'carbs',   label: t('foodlog.editCarbs') },
            { key: 'fat',     label: t('foodlog.editFat') },
          ].map(({ key, label }) => (
            <div key={key} className={styles.editMacroField}>
              <label className={styles.editLabel}>{label}</label>
              <input
                className={styles.editInput}
                type="number"
                min="0"
                value={draft[key]}
                onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {/* Кое хранене. Влаченето върши същото, но само за съседна секция —
            за трите екрана нататък молив и четири хапчета са по-краткият път. */}
        <MealPicker
          value={draft.meal}
          onChange={m => setDraft(prev => ({ ...prev, meal: m }))}
          label={t('foodlog.editMeal')}
        />

        {onPhotoUpload && (
          <div className={styles.editPhotoRow}>
            {entry.photo_url ? (
              <button
                type="button"
                className={styles.editPhotoRemoveBtn}
                onClick={() => onPhotoRemove && onPhotoRemove(entry.id, entry.photo_url)}
              >
                {t('foodlog.removePhoto')}
              </button>
            ) : (
              <button
                type="button"
                className={styles.editPhotoAddBtn}
                onClick={() => openPhotoPicker(entry.id)}
                disabled={uploadingId === entry.id}
              >
                {uploadingId === entry.id ? (
                  <><span className={styles.uploadDot} /> {t('foodlog.uploading')}</>
                ) : (
                  <><CameraIcon /> {t('foodlog.addPhoto')}</>
                )}
              </button>
            )}
          </div>
        )}

        <div className={styles.editActions}>
          <button className={styles.cancelEditBtn} onClick={() => setEditingId(null)} type="button">{t('foodlog.editCancel')}</button>
          <button className={styles.saveEditBtn} onClick={() => handleSave(entry)} type="button">{t('foodlog.editSave')}</button>
        </div>
      </li>
    ) : (
      <li
        key={entry.id}
        ref={el => {
          if (el) rowEls.current.set(entry.id, el)
          else rowEls.current.delete(entry.id)
        }}
        className={`${styles.entry} ${dragId === entry.id ? styles.entryDragging : ''}`}
        style={{ '--i': i }}
      >
        <span
          className={styles.entryGrip}
          onPointerDown={e => onGripPointerDown(e, entry)}
          aria-label={t('foodlog.dragAria')}
          role="button"
        >
          <span /><span /><span />
        </span>
        {/* Meal photo: thumbnail on left side if present */}
        {entry.photo_url && (
          <button
            type="button"
            className={styles.thumbBtn}
            onClick={() => setLightboxUrl(entry.photo_url)}
            aria-label={t('foodlog.thumbAria')}
          >
            <img src={entry.photo_url} className={styles.thumbImg} alt="" />
          </button>
        )}

        <div className={styles.entryLeft}>
          <span className={styles.entryName}>
            {entry.name}
            {/* Small and beside the name, not a banner: the estimate is
                usually close, and a row of warnings down the day would
                teach everyone to stop reading them. */}
            {entry.estimated && (
              <svg viewBox="0 0 20 20" width="11" height="11" className={styles.estMark}
                   aria-label={t('foodlog.estAria')} role="img">
                <path d="M5 8.2c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0M5 12.4c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0"
                      fill="none" stroke="currentColor" strokeWidth="1.7"
                      strokeLinecap="round" transform="translate(1,0)" />
              </svg>
            )}
          </span>
          <span className={styles.entryMacros}>
            {entry.grams > 0 && <><span className={styles.entryGrams}>{entry.grams}g</span> · </>}
            {t('foodlog.rowMacros', { kcal: entry.kcal, p: entry.protein, c: entry.carbs, f: entry.fat })}
          </span>
        </div>

        <div className={styles.entryRight}>
          <button
            className={styles.editBtn}
            onClick={() => startEdit(entry)}
            aria-label={t('foodlog.editAria', { name: entry.name })}
            type="button"
          >
            ✎
          </button>
          <button
            className={styles.removeBtn}
            onClick={() => handleRemove(entry)}
            aria-label={t('foodlog.removeAria', { name: entry.name })}
            type="button"
          >
            ×
          </button>
        </div>
      </li>
    )
  }

  // Every day wears the same four sections whether or not they hold anything,
  // so the shape of the day is a given the client fills in rather than a list
  // that appears as they log. Anything from before meals existed (or without
  // one) gathers under "Друго", shown only when it has rows and never offered as
  // a place to add to.
  const groups = MEALS.map(m => ({
    id: m.id,
    label: t(m.labelKey),
    items: log.filter(e => e.meal_type === m.id),
  }))
  const other = log.filter(e => !MEAL_LABEL_KEY[e.meal_type])
  if (other.length) groups.push({ id: '_other', label: t('meal.other'), items: other, legacy: true })

  return (
    <div className={styles.wrap}>
      {/* Hidden file input shared across all entries */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />

      {log.length > 0 && (
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>{t('foodlog.listTitle', { n: log.length })}</span>
          <div className={styles.headerActions}>
            <button
              className={`${styles.undoBtn} ${lastRemoved ? styles.undoBtnActive : ''}`}
              onClick={handleUndo}
              disabled={!lastRemoved}
              type="button"
              aria-label={t('foodlog.undoAria')}
              title={t('foodlog.undoTitle')}
            >
              <UndoIcon />
            </button>
            <button className={styles.clearBtn} onClick={onClear} type="button" aria-label={t('foodlog.clearAria')} title={t('foodlog.clearTitle')}>
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {/* The day as its meals: each section a small header with a calorie
          subtotal and a + that targets it for the next add. Empty sections stay,
          so the four meals are always there to add into. */}
      {groups.map((group, gi) => {
        const kcal    = Math.round(group.items.reduce((s, e) => s + (e.kcal    || 0), 0))
        const protein = Math.round(group.items.reduce((s, e) => s + (e.protein || 0), 0))
        const carbs   = Math.round(group.items.reduce((s, e) => s + (e.carbs   || 0), 0))
        const fat     = Math.round(group.items.reduce((s, e) => s + (e.fat     || 0), 0))
        return (
          <section
            key={group.id}
            /* Осветяването при влачене се слага от кадъра, направо върху
               възела — виж кадъра по-горе. Тук няма какво да се знае. */
            className={styles.mealGroup}
            data-drop-meal={group.legacy ? '_other' : group.id}
          >
            <div className={styles.mealHead}>
              <span className={styles.mealName}>{group.label}</span>
              <span className={styles.mealHeadRight}>
                {group.items.length > 0 && (
                  <span className={styles.mealTotals}>
                    <span className={`${styles.macro} ${styles.macroP}`} title={t('foodlog.groupProtein')}>
                      <Pictogram name="protein" size={13} />
                      {protein}
                    </span>
                    <span className={`${styles.macro} ${styles.macroC}`} title={t('foodlog.groupCarbs')}>
                      <Pictogram name="carbs" size={13} />
                      {carbs}
                    </span>
                    <span className={`${styles.macro} ${styles.macroF}`} title={t('foodlog.groupFat')}>
                      <Pictogram name="fat" size={13} />
                      {fat}
                    </span>
                    <span className={styles.mealKcal}>{t('foodlog.mealKcal', { n: kcal })}</span>
                  </span>
                )}
                {!group.legacy && onAddRaw && (
                  <button
                    className={styles.mealAdd}
                    onClick={() => setQuickMeal(group.id)}
                    type="button"
                    aria-label={t('foodlog.addToMealAria', { meal: group.label })}
                  >
                    +
                  </button>
                )}
              </span>
            </div>
            {group.items.length > 0 ? (
              <ul className={styles.list}>
                {group.items.map((entry, i) => renderEntry(entry, i))}
              </ul>
            ) : (
              <p className={styles.mealEmpty}>–</p>
            )}
          </section>
        )
      })}

      {log.length === 0 && onAddRaw && date && (
        <CopyPreviousDay date={date} onAddRaw={onAddRaw} />
      )}

      {quickMeal && (
        <QuickAddSheet
          meal={quickMeal}
          onAddRaw={onAddRaw}
          onClose={() => setQuickMeal(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className={styles.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className={styles.lightboxImg} alt={t('foodlog.dishAlt')} />
          <button type="button" className={styles.lightboxClose} onClick={() => setLightboxUrl(null)} aria-label={t('foodlog.lightboxClose')}>×</button>
        </div>
      )}

    </div>
  )
}
