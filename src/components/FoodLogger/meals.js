// The four meals the day is split into — one place, so the nutrition page's
// selector and the log's section headers can never name them differently. This
// is also the grain Благ Бот reads the day back on, so it stays a closed set.
//
// Всеки meal носи ключ към locale файловете вместо суров текст, за да могат
// консуматорите да го превеждат чрез t(). Оригиналната „label" колонка вече
// не съществува — тя беше единственият източник на bg-only текст в
// приложението, който не минаваше през i18n слоя.

export const MEALS = [
  { id: 'breakfast', labelKey: 'meal.breakfast' },
  { id: 'lunch',     labelKey: 'meal.lunch'     },
  { id: 'dinner',    labelKey: 'meal.dinner'    },
  { id: 'snack',     labelKey: 'meal.snack'     },
]

export const MEAL_LABEL_KEY = Object.fromEntries(MEALS.map(m => [m.id, m.labelKey]))

/** Helper — connect a MEAL id (or a legacy row without one) directly to its
 *  translated label. Consumers who already carry a t() reach for this. */
export function mealLabel(t, id) {
  const key = MEAL_LABEL_KEY[id]
  return key ? t(key) : t('meal.other')
}

// Which meal to have selected when the page opens — the one the clock is in, so
// the common case is add-and-go without touching the selector.
export function defaultMeal() {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
