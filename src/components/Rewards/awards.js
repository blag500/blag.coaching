/**
 * Какви награди има.
 *
 * Всичките се смятат от вече вписаното — храна, навици, тренировки. Нито една
 * не иска нова таблица и нито една не се раздава от устройство: човек, който
 * смени телефона, не губи спечеленото, а клиент отпреди година вижда всичко,
 * което вече е направил, в мига, в който отвори страницата.
 *
 * Прагът за калории е същите осемдесет на сто като наградата в приложението.
 * Два различни прага за едно и също нещо на два екрана са по-лоши от липсващ
 * знак.
 */

/* Всяка носи иконата си от рисувания набор, прага си и това, което се брои.
   `of` вади текущото число от статистиките, `need` е колко трябва — оттам
   излиза и лентата, и надписът „още толкова". */
export const AWARDS = [
  { id: 'first',     icon: 'star',     of: s => s.activeDays,    need: 1   },

  { id: 'streak3',   icon: 'flame',    of: s => s.longestStreak, need: 3   },
  { id: 'streak7',   icon: 'flame',    of: s => s.longestStreak, need: 7   },
  { id: 'streak30',  icon: 'flame',    of: s => s.longestStreak, need: 30  },
  { id: 'streak100', icon: 'flame',    of: s => s.longestStreak, need: 100 },

  { id: 'days30',    icon: 'calendar', of: s => s.activeDays,    need: 30  },
  { id: 'days100',   icon: 'calendar', of: s => s.activeDays,    need: 100 },
  { id: 'days365',   icon: 'calendar', of: s => s.activeDays,    need: 365 },

  { id: 'train10',   icon: 'training', of: s => s.trainingDays,  need: 10  },
  { id: 'train50',   icon: 'training', of: s => s.trainingDays,  need: 50  },
  { id: 'train100',  icon: 'training', of: s => s.trainingDays,  need: 100 },

  { id: 'cal7',      icon: 'kcal',     of: s => s.calorieDays,   need: 7   },
  { id: 'cal30',     icon: 'kcal',     of: s => s.calorieDays,   need: 30  },

  { id: 'habits7',   icon: 'check',    of: s => s.habitDays,     need: 7   },
  { id: 'habits30',  icon: 'check',    of: s => s.habitDays,     need: 30  },

  { id: 'perfect1',  icon: 'star',     of: s => s.perfectDays,   need: 1   },
  { id: 'perfect10', icon: 'star',     of: s => s.perfectDays,   need: 10  },
  { id: 'perfect50', icon: 'star',     of: s => s.perfectDays,   need: 50  },
]

/** Спечелените отпред, останалите отзад — страницата започва с направеното. */
export function sortAwards(list, stats) {
  return [...list].sort((a, b) => {
    const ea = a.of(stats) >= a.need
    const eb = b.of(stats) >= b.need
    if (ea !== eb) return ea ? -1 : 1
    // Сред неспечелените първо е най-близката: тя е следващата, която значи нещо.
    if (!ea) return (b.of(stats) / b.need) - (a.of(stats) / a.need)
    return a.need - b.need
  })
}
