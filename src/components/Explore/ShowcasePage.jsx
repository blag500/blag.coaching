import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { HABITS as DEFAULT_HABITS } from '../../data/appData'
import styles from './ShowcasePage.module.css'

const CATEGORIES = [
  { id: null,        label: 'ВСИЧКО' },
  { id: 'training',  label: 'ТРЕНИРОВКА' },
  { id: 'nutrition', label: 'ХРАНЕНЕ' },
]
const CAT_LABEL = { training: 'ТРЕНИРОВКА', nutrition: 'ХРАНЕНЕ' }
const CAT_COLOR = { training: '#FFB74D', nutrition: '#66BB6A' }

const DAYS_BG = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return d.toISOString().slice(0, 10)
  })
}

export default function ShowcasePage({ onBack }) {
  const { user, profile: myProfile } = useAuth()
  const [posts,      setPosts]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [coachData,  setCoachData]  = useState(null)
  const [lightbox,   setLightbox]   = useState(null)

  useEffect(() => {
    async function load() {
      // If the viewer IS the coach, use their own ID directly.
      // Otherwise resolve via RPC (client looking up their coach).
      let coachId
      if (myProfile?.role === 'coach') {
        coachId = user?.id
      } else {
        const { data } = await supabase.rpc('get_coach_id')
        coachId = data
      }
      if (!coachId) { setLoading(false); return }

      const days = last7Days()
      const since = days[0]
      const today = days[6]

      const [
        profileRes,
        postsRes,
        workoutsRes,
        exerciseRes,
        habitsRes,
        nutritionRes,
        checkinsRes,
        sleepRes,
      ] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, calories, protein, carbs, fat, habits').eq('id', coachId).single(),
        supabase.from('showcase_posts').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('workout_completions').select('completed_date, block_label').eq('user_id', coachId).gte('completed_date', since),
        supabase.from('exercise_logs').select('completed_date, block_label').eq('user_id', coachId).gte('completed_date', since),
        supabase.from('habit_completions').select('date, habit_id, completed').eq('user_id', coachId).gte('date', since),
        supabase.from('food_logs').select('date, kcal, protein, carbs, fat').eq('user_id', coachId).gte('date', since),
        supabase.from('form_checkins').select('date, photo_url, weight_kg, gym_performance, sleep_hours').eq('user_id', coachId).gte('date', new Date(Date.now() - 59 * 86400000).toISOString().slice(0, 10)).not('photo_url', 'is', null).order('date', { ascending: false }).limit(20),
        supabase.from('sleep_logs').select('date, duration_hours, quality').eq('user_id', coachId).gte('date', since).order('date', { ascending: false }).limit(1),
      ])

      // Merge fetched profile with myProfile as fallback so name/avatar always resolve
      const fetched  = profileRes.data || {}
      const profile  = {
        ...fetched,
        name:       fetched.name       || myProfile?.name       || '',
        avatar_url: fetched.avatar_url || myProfile?.avatar_url || null,
      }
      const habits   = (profile.habits?.length > 0) ? profile.habits : DEFAULT_HABITS
      const habitIds = habits.map(h => h.id)

      // Nutrition per day
      const nutritionByDay = {}
      for (const row of (nutritionRes.data || [])) {
        if (!nutritionByDay[row.date]) nutritionByDay[row.date] = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
        nutritionByDay[row.date].kcal    += row.kcal    || 0
        nutritionByDay[row.date].protein += row.protein || 0
        nutritionByDay[row.date].carbs   += row.carbs   || 0
        nutritionByDay[row.date].fat     += row.fat     || 0
      }

      // Habits per day
      const habitsByDay = {}
      for (const row of (habitsRes.data || [])) {
        if (!habitsByDay[row.date]) habitsByDay[row.date] = {}
        if (row.completed) habitsByDay[row.date][row.habit_id] = true
      }

      // Training per day — merge workout_completions + exercise_logs
      const allWorkouts = [...(workoutsRes.data || []), ...(exerciseRes.data || [])]
      const trainedDays = new Set(allWorkouts.map(r => r.completed_date))
      const workoutLabelsByDay = {}
      allWorkouts.forEach(r => {
        if (!workoutLabelsByDay[r.completed_date]) workoutLabelsByDay[r.completed_date] = new Set()
        if (r.block_label) workoutLabelsByDay[r.completed_date].add(r.block_label)
      })

      // Build day summaries
      const daySummaries = days.map(date => {
        const nutrition = nutritionByDay[date]
        const habitsForDay  = habitsByDay[date] || {}
        const doneHabits = habitIds.filter(id => habitsForDay[id]).length
        return {
          date,
          trained: trainedDays.has(date),
          workoutLabels: workoutLabelsByDay[date] ? [...workoutLabelsByDay[date]] : [],
          habitsDone: doneHabits,
          habitsTotal: habitIds.length,
          kcal: Math.round(nutrition?.kcal || 0),
          nutritionLogged: !!nutrition,
        }
      })

      const todaySummary  = daySummaries[6]
      const todayNutrition = nutritionByDay[today]
      const lastSleep = sleepRes.data?.[0]

      // Training streak (consecutive days with at least one workout, going back from today)
      let trainingStreak = 0
      for (let i = daySummaries.length - 1; i >= 0; i--) {
        if (daySummaries[i].trained) trainingStreak++
        else break
      }

      setCoachData({
        profile,
        habits,
        daySummaries,
        todaySummary,
        todayNutrition,
        lastSleep,
        trainingStreak,
        checkins: checkinsRes.data || [],
      })
      setPosts(postsRes.data || [])
      setLoading(false)
    }
    load()
  }, [user?.id, myProfile?.role])

  const visible = filter ? posts.filter(p => p.category === filter) : posts

  if (selected) return <PostDetail post={selected} onBack={() => setSelected(null)} />

  return (
    <div className={styles.page}>
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} className={styles.lightboxImg} alt="" />
        </div>
      )}

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">←</button>
        <div>
          <h1 className={styles.title}>ВДЪХНОВЕНИЕ</h1>
          <p className={styles.subtitle}>Виж как тренира и живее треньорът</p>
        </div>
      </header>

      {loading ? (
        <p className={styles.empty}>Зарежда...</p>
      ) : (
        <>
          {coachData && <CoachLiveCard data={coachData} onPhotoClick={setLightbox} />}

          {/* Posts */}
          <div className={styles.sectionLabel}>ПУБЛИКАЦИИ</div>
          <div className={styles.filterRow}>
            {CATEGORIES.map(c => (
              <button
                key={String(c.id)}
                type="button"
                className={`${styles.filterBtn} ${filter === c.id ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className={styles.empty}>Все още няма публикации.</p>
          ) : (
            <div className={styles.list}>
              {visible.map(post => (
                <button key={post.id} type="button" className={styles.card} onClick={() => setSelected(post)}>
                  {post.photo_url && <img src={post.photo_url} className={styles.cardImg} alt="" />}
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.catBadge} style={{ color: CAT_COLOR[post.category], borderColor: CAT_COLOR[post.category] + '55' }}>
                        {CAT_LABEL[post.category]}
                      </span>
                      <span className={styles.cardDate}>
                        {new Date(post.created_at).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    </div>
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    {post.body && <p className={styles.cardPreview}>{post.body}</p>}
                  </div>
                  <span className={styles.cardArrow}>›</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CoachLiveCard({ data, onPhotoClick }) {
  const { profile, habits, daySummaries, todayNutrition, lastSleep, trainingStreak, checkins } = data
  const today = daySummaries[6]
  const calorieTarget = profile.calories || 0
  const kcalPct = calorieTarget > 0 ? Math.min(100, Math.round((today.kcal / calorieTarget) * 100)) : null

  return (
    <div className={styles.liveCard}>
      {/* Coach identity */}
      <div className={styles.coachRow}>
        <div className={styles.coachAvatar}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} className={styles.coachAvatarImg} alt="" />
            : <span>{(profile.name || 'Т')[0].toUpperCase()}</span>
          }
        </div>
        <div>
          <p className={styles.coachName}>{profile.name || 'Треньорът'}</p>
          <p className={styles.coachRole}>ТРЕНЬОР</p>
        </div>
        {trainingStreak > 0 && (
          <div className={styles.streakBadge}>
            <span className={styles.streakNum}>{trainingStreak}</span>
            <span className={styles.streakLabel}>🔥</span>
          </div>
        )}
      </div>

      {/* Last 7 days training dots */}
      <div className={styles.sectionMini}>ТРЕНИРОВКА — ПОСЛЕДНИ 7 ДНИ</div>
      <div className={styles.dotRow}>
        {daySummaries.map((d, i) => {
          const dayObj = new Date(d.date)
          const isToday = i === 6
          const label = d.workoutLabels?.[0] ?? null
          return (
            <div key={d.date} className={styles.dotCol}>
              <div className={`${styles.dot} ${d.trained ? styles.dotDone : ''} ${isToday ? styles.dotToday : ''}`}>
                {d.trained && <span className={styles.dotEmoji}>💪</span>}
              </div>
              {label && <span className={styles.dotWorkoutLabel}>{label}</span>}
              <span className={`${styles.dotLabel} ${isToday ? styles.dotLabelToday : ''}`}>
                {DAYS_BG[dayObj.getDay()]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Last 7 days habits */}
      <div className={styles.sectionMini}>НАВИЦИ — ПОСЛЕДНИ 7 ДНИ</div>
      <div className={styles.habitBars}>
        {daySummaries.map((d, i) => {
          const pct = d.habitsTotal > 0 ? Math.round((d.habitsDone / d.habitsTotal) * 100) : 0
          const isToday = i === 6
          return (
            <div key={d.date} className={styles.habitBarCol}>
              <div className={styles.habitBarTrack}>
                <div
                  className={`${styles.habitBarFill} ${pct === 100 ? styles.habitBarFull : ''}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className={`${styles.dotLabel} ${isToday ? styles.dotLabelToday : ''}`}>
                {DAYS_BG[new Date(d.date).getDay()]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Today's stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{today.kcal > 0 ? today.kcal : '—'}</span>
          <span className={styles.statLabel}>ККАЛ ДНЕС</span>
          {kcalPct !== null && today.kcal > 0 && (
            <div className={styles.statBar}>
              <div className={styles.statBarFill} style={{ width: `${kcalPct}%`, background: kcalPct >= 90 ? '#66BB6A' : 'var(--accent)' }} />
            </div>
          )}
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{today.habitsDone}/{today.habitsTotal}</span>
          <span className={styles.statLabel}>НАВИЦИ ДНЕС</span>
        </div>
        {lastSleep && (
          <div className={styles.statBox}>
            <span className={styles.statVal}>{lastSleep.duration_hours}ч</span>
            <span className={styles.statLabel}>СЪН</span>
          </div>
        )}
        <div className={styles.statBox}>
          <span className={`${styles.statVal} ${today.trained ? styles.statGreen : styles.statMuted}`}>
            {today.trained ? '✓' : '—'}
          </span>
          <span className={styles.statLabel}>ТРЕНИРОВКА</span>
        </div>
      </div>

      {/* Check-in photos */}
      {checkins.length > 0 && (
        <>
          <div className={styles.sectionMini}>CHECK-IN СНИМКИ</div>
          <div className={styles.photoStrip}>
            {checkins.map(c => (
              <button
                key={c.date}
                type="button"
                className={styles.photoItem}
                onClick={() => onPhotoClick(c.photo_url)}
              >
                <img src={c.photo_url} className={styles.photoThumb} alt="" />
                <span className={styles.photoDate}>
                  {new Date(c.date).toLocaleDateString('bg-BG', { day: 'numeric', month: 'numeric' })}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PostDetail({ post, onBack }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">←</button>
        <span className={styles.catBadge} style={{ color: CAT_COLOR[post.category], borderColor: CAT_COLOR[post.category] + '55' }}>
          {CAT_LABEL[post.category]}
        </span>
      </header>
      {post.photo_url && <img src={post.photo_url} className={styles.detailImg} alt="" />}
      <div className={styles.detailBody}>
        <p className={styles.detailDate}>
          {new Date(post.created_at).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className={styles.detailTitle}>{post.title}</h1>
        {post.body && <p className={styles.detailText}>{post.body}</p>}
      </div>
    </div>
  )
}
