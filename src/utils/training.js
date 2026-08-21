/**
 * What the training log adds up to.
 *
 * The logger writes one row per set and the calendar writes one row per
 * finished block. Neither of them knows what a *session* is — that was assembled
 * ad hoc in three different components, each with its own idea of it. This is
 * the one place a day of rows becomes a session with a name, a volume and a
 * count of records, so every screen that shows a number shows the same number.
 */

/** Epley. A set that added reps is progress, and load alone cannot say so. */
export function e1RM(weight, reps) {
  const w = parseFloat(weight)
  if (!w) return 0
  return Math.round(w * (1 + (parseInt(reps) || 1) / 30) * 10) / 10
}

/** Sunday counts as the end of the week here, not the start of one. */
export function mondayOf(d) {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export const iso = d => new Date(d).toISOString().slice(0, 10)

/** The date a day-string means at noon, so time zones never shift it a day. */
export const dayDate = s => new Date(s + 'T12:00:00')

const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
]
export const MONTHS_SHORT = ['Яну', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек']
export const monthTitle = key => {
  const [y, m] = key.split('-')
  return `${MONTHS[+m - 1]} ${y}`
}

/**
 * A day of set rows and block ticks, turned into sessions.
 *
 * Both halves matter and neither is sufficient: a session that was logged but
 * never ticked still happened, and a rest day that was ticked has no sets. So
 * every date that appears in either source becomes a session, and the ones with
 * sets carry them.
 *
 * Records are found in the same pass, oldest first: a set is a record when its
 * estimated 1RM beats everything that exercise has ever done before that day.
 * Doing it here rather than per-screen is why the count on a history card and
 * the trophy on a chart can never disagree.
 */
export function buildSessions(logs = [], completions = []) {
  const byDate = new Map()

  const touch = date => {
    if (!byDate.has(date)) {
      byDate.set(date, { date, labels: [], exercises: new Map(), setCount: 0, volume: 0, prCount: 0 })
    }
    return byDate.get(date)
  }

  for (const c of completions) {
    const s = touch(c.completed_date)
    if (!s.labels.includes(c.block_label)) s.labels.push(c.block_label)
  }

  for (const r of logs) {
    const s = touch(r.date)
    const name = r.exercise_name
    if (!s.exercises.has(name)) {
      s.exercises.set(name, { name, replaces: r.replaces || null, sets: [], volume: 0, best: 0, pr: false })
    }
    const ex = s.exercises.get(name)
    if (r.replaces && !ex.replaces) ex.replaces = r.replaces
    const weight = r.weight == null ? null : Number(r.weight)
    const reps = r.reps == null ? null : Number(r.reps)
    ex.sets.push({ id: r.id, setIndex: r.set_index ?? ex.sets.length, weight, reps, notes: r.notes || null })
    ex.volume += (weight || 0) * (reps || 0)
    ex.best = Math.max(ex.best, e1RM(weight, reps))
    s.setCount += 1
    s.volume += (weight || 0) * (reps || 0)
  }

  const sessions = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

  // Oldest first, so "best so far" is genuinely what came before this day.
  const bestSoFar = {}
  for (const s of sessions) {
    for (const ex of s.exercises.values()) {
      ex.sets.sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0))
      const prior = bestSoFar[ex.name] ?? 0
      if (ex.best > 0 && ex.best > prior) {
        ex.pr = true
        s.prCount += 1
      }
      bestSoFar[ex.name] = Math.max(prior, ex.best)
    }
    s.exerciseList = [...s.exercises.values()]
    s.title = s.labels.join(' · ') || (s.exerciseList.length ? 'Тренировка' : 'Почивка')
  }

  return sessions.reverse()  // newest first, which is how every screen reads it
}

/** Newest-first sessions, grouped into the months they belong to. */
export function groupByMonth(sessions) {
  const out = []
  for (const s of sessions) {
    const key = s.date.slice(0, 7)
    if (out[out.length - 1]?.key !== key) out.push({ key, title: monthTitle(key), sessions: [] })
    out[out.length - 1].sessions.push(s)
  }
  return out
}

/**
 * Counts, the goal, and the streak.
 *
 * A session counts if something was logged or the block was ticked — the two
 * ways of saying "I trained" — which is exactly the set `buildSessions` returns.
 * Rest days are excluded: nobody trains by resting, and counting them would let
 * a week of nothing satisfy a weekly goal.
 */
export function trainingStats(sessions, goal, now = new Date()) {
  const trained = sessions.filter(s => s.setCount > 0 || !/почивк/i.test(s.title))
  const dates = trained.map(s => s.date)

  const todayStr = iso(now)
  const weekStart = iso(mondayOf(now))
  const monthPrefix = todayStr.slice(0, 7)
  const yearPrefix = todayStr.slice(0, 4)

  const week = dates.filter(d => d >= weekStart && d <= todayStr).length
  const month = dates.filter(d => d.startsWith(monthPrefix)).length
  const year = dates.filter(d => d.startsWith(yearPrefix)).length

  // Weeks, newest first, each with how many sessions it held.
  const perWeek = new Map()
  for (const d of dates) {
    const k = iso(mondayOf(dayDate(d)))
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1)
  }

  // The current week does not break a streak while it is still running — it is
  // only Tuesday, and a goal of five is not failed yet.
  let streak = 0
  const cursor = mondayOf(now)
  if ((perWeek.get(iso(cursor)) ?? 0) >= goal) streak += 1
  cursor.setDate(cursor.getDate() - 7)
  while ((perWeek.get(iso(cursor)) ?? 0) >= goal) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }

  return { total: dates.length, year, month, week, streak, goal, perWeek }
}

/** Sessions per week over the last `weeks` weeks, oldest first — for the bars. */
export function weeklyCounts(dates, weeks = 26, now = new Date()) {
  const start = mondayOf(now)
  start.setDate(start.getDate() - (weeks - 1) * 7)
  const buckets = []
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i * 7)
    buckets.push({ start: iso(d), value: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.start, i]))
  for (const d of dates) {
    const key = iso(mondayOf(dayDate(d)))
    const i = index.get(key)
    if (i != null) buckets[i].value += 1
  }
  return buckets
}

/** kg, but only as precise as a gym plate ever is. */
export const kg = n => {
  const v = Math.round(Number(n) * 10) / 10
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** 5 727 rather than 5727 — big volumes are read, not parsed. */
export const bigNum = n => Math.round(n).toLocaleString('bg-BG')

/** "днес", "вчера", "преди 3 дни", then a date once days stop meaning anything. */
export function agoLabel(dateStr) {
  const days = Math.round((Date.now() - dayDate(dateStr)) / 86400000)
  if (days <= 0) return 'днес'
  if (days === 1) return 'вчера'
  if (days < 14) return `преди ${days} дни`
  return dayDate(dateStr).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
}
