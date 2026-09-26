import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import { recipeTotals } from './recipeMath'
import styles from './RecipeReader.module.css'

const pad = n => (n < 10 ? `0${n}` : String(n))

/**
 * Рецептата, прочетена стъпка по стъпка.
 *
 * Цял екран, листа се настрани като книга: корица, съставки, по една страница
 * на стъпка, накрая готовото ястие под було и „Впиши в дневника". Идеята е от
 * рецептата-артефакт „Благо кремче" — в кухнята телефонът стои на плота и
 * човек иска една стъпка на екрана, едра, а не списък, който да превърта с
 * мазни пръсти.
 */
export default function RecipeReader({ recipe, onClose, onLog, onEdit }) {
  const { t } = useSettings()
  const readerRef = useRef(null)
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [servings, setServings] = useState(1)
  const [logged, setLogged] = useState(false)

  const perServing = useMemo(() => {
    const tot = recipeTotals(recipe.ingredients)
    const n = recipe.servings || 1
    return {
      kcal: tot.kcal / n, protein: tot.protein / n, carbs: tot.carbs / n, fat: tot.fat / n,
      grams: (recipe.total_grams || 0) / n,
    }
  }, [recipe])

  const steps = Array.isArray(recipe.steps) ? recipe.steps.filter(s => (s?.text || '').trim() || s?.photo_url) : []
  const main  = steps.filter(s => !s.bonus)
  const bonus = steps.filter(s => s.bonus)
  const ingredients = recipe.ingredients || []

  /* Страниците като списък от описания — така броячът, лентата и бутонът
     знаят колко са, без да броят възли в DOM-а. */
  const pages = [
    { kind: 'cover' },
    ...(ingredients.length ? [{ kind: 'ingredients' }] : []),
    ...main.map((s, i) => ({ kind: 'step', step: s, no: i + 1 })),
    ...bonus.map((s, i) => ({ kind: 'step', step: s, no: main.length + i + 1, bonus: true, firstBonus: i === 0 })),
    { kind: 'final' },
  ]
  const last = pages.length - 1

  // Коя страница е на екрана — по превъртането, не по натисканията, за да
  // важи и за плъзгане с пръст.
  useEffect(() => {
    const el = readerRef.current
    if (!el) return
    let frame = null
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = null
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
        setCurrent(Math.max(0, Math.min(last, i)))
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame) }
  }, [last])

  // Страницата отдолу не бива да се превърта, докато четецът е отворен.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(current + 1)
      if (e.key === 'ArrowLeft')  go(current - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  })

  function go(i) {
    const el = readerRef.current
    if (!el) return
    const to = Math.max(0, Math.min(last, i))
    el.scrollTo({ left: to * el.clientWidth, behavior: 'smooth' })
  }

  function log() {
    const r = servings
    onLog({
      name:    recipe.name,
      grams:   Math.round(perServing.grams * r),
      kcal:    Math.round(perServing.kcal * r),
      protein: Math.round(perServing.protein * r * 10) / 10,
      carbs:   Math.round(perServing.carbs * r * 10) / 10,
      fat:     Math.round(perServing.fat * r * 10) / 10,
    })
    haptic('success')
    setLogged(true)
  }

  const r1 = n => Math.round(n)

  return createPortal(
    <div className={styles.shell} role="dialog" aria-modal="true" aria-label={recipe.name}>
      <div className={styles.progress} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${((current + 1) / pages.length) * 100}%` }} />
      </div>

      <div className={styles.topBar}>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={t('rr.close')}>
          <Pictogram name="close" size={16} />
        </button>
        {onEdit && (
          <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label={t('rr.edit')}>
            <Pictogram name="compose" size={16} />
          </button>
        )}
      </div>

      <div className={styles.reader} ref={readerRef}>
        {pages.map((p, i) => (
          <section key={i} className={`${styles.page} ${i === current ? styles.pageActive : ''}`} aria-hidden={i !== current}>
            {p.kind === 'cover' && (
              <div className={styles.cover}>
                <h1 className={styles.coverTitle}>{recipe.name}</h1>
                <div className={styles.coverRule} />
                <div className={styles.coverMeta}>
                  {recipe.prep_min ? <span>{t('rr.minutes', { n: recipe.prep_min })}</span> : null}
                  {(recipe.servings || 1) > 1 && <span>{t('rr.servings', { n: recipe.servings })}</span>}
                </div>
                <div className={styles.coverMacros}>
                  <span className={styles.kcal}>{r1(perServing.kcal)}<small>{t('rr.kcal')}</small></span>
                  <span className={styles.mP}>{r1(perServing.protein)}<small>P</small></span>
                  <span className={styles.mC}>{r1(perServing.carbs)}<small>C</small></span>
                  <span className={styles.mF}>{r1(perServing.fat)}<small>F</small></span>
                </div>
                <p className={styles.perServing}>{t('rr.perServing')}</p>
              </div>
            )}

            {p.kind === 'ingredients' && (
              <div className={styles.textPage}>
                <p className={styles.kicker}>{t('rr.ingredients')}</p>
                <ul className={styles.ingList}>
                  {ingredients.map((ing, j) => (
                    <li key={j}>
                      <span>{ing.name}</span>
                      <span className={styles.ingGrams}>{r1(ing.grams || 0)} г</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.kind === 'step' && (
              <div className={styles.stepPage}>
                {p.step.photo_url && (
                  <div className={styles.stepPhoto}>
                    <img src={p.step.photo_url} alt="" loading="lazy" />
                  </div>
                )}
                <div className={styles.stepBody}>
                  {p.firstBonus && <p className={styles.bonusTag}>{t('rr.bonus')}</p>}
                  <span className={`${styles.stepNo} ${p.bonus ? styles.stepNoBonus : ''}`}>{pad(p.no)}</span>
                  <p className={styles.stepText}>{p.step.text}</p>
                </div>
              </div>
            )}

            {p.kind === 'final' && (
              <div className={styles.finalPage}>
                <p className={styles.kicker}>{t('rr.voila')}</p>
                {recipe.photo_url ? (
                  <button
                    type="button"
                    className={`${styles.reveal} ${revealed ? styles.revealOpen : ''}`}
                    onClick={() => { if (!revealed) { haptic('success'); setRevealed(true) } }}
                    aria-label={t('rr.tapReveal')}
                  >
                    <img src={recipe.photo_url} alt={recipe.name} />
                    <span className={styles.veil}><span>{t('rr.tapReveal')}</span></span>
                  </button>
                ) : (
                  <div className={styles.noPhoto}><Pictogram name="meal" size={40} /></div>
                )}

                {onLog && (
                  <div className={styles.logBox}>
                    <div className={styles.stepper}>
                      <button type="button" onClick={() => setServings(s => Math.max(0.5, s - 0.5))} aria-label={t('rr.less')}>−</button>
                      <span>{t('rr.servingsN', { n: servings })}</span>
                      <button type="button" onClick={() => setServings(s => s + 0.5)} aria-label={t('rr.more')}>+</button>
                    </div>
                    <button type="button" className={styles.logBtn} onClick={log} disabled={logged}>
                      <Pictogram name={logged ? 'check' : 'plus'} size={14} />
                      {logged ? t('rr.logged') : t('rr.log', { kcal: r1(perServing.kcal * servings) })}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      {current < last && (
        <button type="button" className={styles.next} onClick={() => { haptic('tap'); go(current + 1) }}>
          <span className={styles.nextCount}>{pad(current + 1)} / {pad(pages.length)}</span>
          <span className={styles.nextArrow} aria-hidden="true">→</span>
          <span className={styles.srOnly}>{t('rr.next')}</span>
        </button>
      )}
    </div>,
    document.body,
  )
}
