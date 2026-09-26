import { useState, useEffect } from 'react'
import { usePane } from '../SwipePager/PaneContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import { useRewards } from '../../contexts/RewardsContext'
import { useDayMarks } from '../../hooks/useDayMarks'
import { useActivityLog } from '../../hooks/useActivityLog'
import DatePicker from '../DatePicker/DatePicker'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import NutritionProgress from './NutritionProgress'
import CalorieBalancer from './CalorieBalancer'
import FoodSearch from '../FoodLogger/FoodSearch'
import FoodLog from '../FoodLogger/FoodLog'
import { defaultMeal } from '../FoodLogger/meals'
import RecipeLibrary from '../Recipes/RecipeLibrary'
import AppHeader from '../AppHeader/AppHeader'
import styles from './NutritionCards.module.css'
import Pictogram from '../Pictogram/Pictogram'

export default function NutritionCards({ onNavigate, onMenuOpen }) {
  const { chrome: paneChrome } = usePane()
  const { profile } = useAuth()
  const { t } = useSettings()
  const { log, totals, loading: logLoading, addEntry, addRawEntry, updateEntry, removeEntry, clearLog, uploadMealPhoto, removeMealPhoto, refresh, selectedDate, setSelectedDate, isToday } = useFoodLog()
  const { activities, totalKcalBurned, addActivity, removeActivity } = useActivityLog(selectedDate)
  const { distance, refreshing } = usePullToRefresh(refresh)
  const [view, setView] = useState('log')
  const [meal, setMeal] = useState(defaultMeal())     // which meal new food is filed under

  // Wrap the log-hook writers so every add path — search, barcode, bot, recipes,
  // custom foods — files under the selected meal without each one having to know
  // about it. A payload that already names a meal (an undo, a copied day) keeps
  // its own.
  const addEntryMeal = (food, grams) => addEntry(food, grams, meal)
  const addRawMeal   = (p) => addRawEntry({ ...p, mealType: p.mealType ?? meal })


  const targets = {
    kcal:    profile?.calories ?? 0,
    protein: profile?.protein  ?? 0,
    carbs:   profile?.carbs    ?? 0,
    fat:     profile?.fat      ?? 0,
  }

  /* Калориите се събират тук, значи наградата за тях се появява тук.
     Само за днешния ден: разлистването на минала дата не е постижение,
     случило се сега. */
  const { report } = useRewards()
  const calDone = isToday && targets.kcal > 0 &&
    (totals.kcal || 0) / targets.kcal >= 0.8
  /* Точките по календара: кои дни са вписани и кои са стигнали целта. */
  const dayMarks = useDayMarks('food', selectedDate, { target: targets.kcal })

  const calKnown = !logLoading && isToday && targets.kcal > 0
  useEffect(() => { report('calories', calDone, calKnown) }, [calDone, calKnown, report])


  const pullPct   = Math.min(distance / 68, 1)
  const showPull  = distance > 4

  const firstName = (profile?.name || '').split(' ')[0].toUpperCase()
  const dailyQuote = t(`nutr.quote.${new Date().getDay() % 7}`)

  return (
    <div className={styles.page}>
      {showPull && (
        <div className={styles.pullIndicator} style={{ height: distance, opacity: pullPct }}>
          <svg
            className={refreshing ? styles.pullSpin : ''}
            style={{ transform: `rotate(${pullPct * 200}deg)` }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" width="20" height="20" aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}
      <AppHeader
        onMenuOpen={onMenuOpen}
        title={firstName || 'BLAG'}
        avatarUrl={profile?.avatar_url}
        avatarInitial={(profile?.name || '?')[0].toUpperCase()}
        onAvatarClick={() => onNavigate('profile')}
      />

      <div className={styles.toggle}>
        <button
          className={`${styles.toggleBtn} ${view === 'log' ? styles.toggleActive : ''}`}
          onClick={() => setView('log')}
          type="button"
          aria-label={t('nutr.toggle.log')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          <span className={styles.toggleLabel}>{t('nutr.toggle.logShort')}</span>
        </button>
        <button
          className={`${styles.toggleBtn} ${view === 'meals' ? styles.toggleActive : ''}`}
          onClick={() => setView('meals')}
          type="button"
          aria-label={t('nutr.toggle.library')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className={styles.toggleLabel}>{t('nutr.toggle.libraryShort')}</span>
        </button>
        <button
          className={`${styles.toggleBtn} ${view === 'balance' ? styles.toggleActive : ''}`}
          onClick={() => setView('balance')}
          type="button"
          aria-label={t('nutr.toggle.balance')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="6" y1="21" x2="18" y2="21" />
            <path d="M4 11l3-6 3 6a3 3 0 0 1-6 0z" />
            <path d="M14 11l3-6 3 6a3 3 0 0 1-6 0z" />
          </svg>
          <span className={styles.toggleLabel}>{t('nutr.toggle.balanceShort')}</span>
        </button>
      </div>

      {!targets.kcal && (
        <button className={styles.setupPrompt} onClick={() => onNavigate?.('explore')} type="button">
          <span className={styles.setupIcon}><Pictogram name="target" size={22} /></span>
          <div className={styles.setupText}>
            <span className={styles.setupTitle}>{t('nutr.setupTitle')}</span>
            <span className={styles.setupDesc}>{t('nutr.setupDesc')}</span>
          </div>
        </button>
      )}

      {view === 'log' ? (
        <>
          <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} marks={dayMarks} />
          <NutritionProgress
            totals={totals}
            targets={targets}
            kcalBurned={totalKcalBurned}
            eatBack={!!profile?.eat_back_calories}
            animateKey={selectedDate}
          />
          <FoodSearch
            onAdd={addEntryMeal}
            onAddRaw={addRawMeal}
            meal={meal}
            onMealChange={setMeal}
            totals={totals}
            targets={targets}
            /* Кой ден се пълни: разделът за пренасяне трябва да знае в кой ден
               слага и кой да не предлага на самия себе си. */
            date={selectedDate}
          />
          <FoodLog
            log={log}
            onRemove={removeEntry}
            onClear={clearLog}
            onEdit={updateEntry}
            onAddRaw={addRawMeal}
            onPhotoUpload={uploadMealPhoto}
            onPhotoRemove={removeMealPhoto}
            date={selectedDate}
          />
          <p className={styles.quote}>"{dailyQuote}"</p>
        </>
      ) : view === 'meals' ? (
        /* Една библиотека: рецептите — твоите и споделените от треньора —
           отворени като четец стъпка по стъпка. */
        <RecipeLibrary onAddRaw={addRawMeal} fabHost={paneChrome} />
      ) : (
        <CalorieBalancer />
      )}
    </div>
  )
}
