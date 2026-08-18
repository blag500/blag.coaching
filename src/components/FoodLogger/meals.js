// The four meals the day is split into — one place, so the nutrition page's
// selector and the log's section headers can never name them differently. This
// is also the grain Благ Бот reads the day back on, so it stays a closed set.

export const MEALS = [
  { id: 'breakfast', label: 'Закуска'  },
  { id: 'lunch',     label: 'Обяд'     },
  { id: 'dinner',    label: 'Вечеря'   },
  { id: 'snack',     label: 'Междинно' },
]

export const MEAL_LABEL = Object.fromEntries(MEALS.map(m => [m.id, m.label]))

// Which meal to have selected when the page opens — the one the clock is in, so
// the common case is add-and-go without touching the selector.
export function defaultMeal() {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
