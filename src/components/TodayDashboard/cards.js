/**
 * What can appear on Днес, in the order it appears by default.
 *
 * One list, read by two places: the page, which renders it, and the profile
 * setting, which lets a client reorder it and switch parts off. Kept apart from
 * both so that adding a card is one entry here rather than an edit in two files
 * that can disagree.
 *
 * The default order is the argument the page makes on its own: the verdict
 * first, then the things you tick or type here, then the tallies that only read
 * back what was logged somewhere else.
 */
export const CARDS = [
  { id: 'readiness',   labelKey: 'dc.card.readiness',   hintKey: 'dc.card.readinessHint'   },
  { id: 'habits',      labelKey: 'dc.card.habits',      hintKey: 'dc.card.habitsHint'      },
  { id: 'weight',      labelKey: 'dc.card.weight',      hintKey: 'dc.card.weightHint'      },
  { id: 'water',       labelKey: 'dc.card.water',       hintKey: 'dc.card.waterHint'       },
  { id: 'macros',      labelKey: 'dc.card.macros',      hintKey: 'dc.card.macrosHint'      },
  { id: 'supplements', labelKey: 'dc.card.supplements', hintKey: 'dc.card.supplementsHint' },
]

export const DEFAULT_ORDER = CARDS.map(c => c.id)

/**
 * The saved choice turned into something renderable.
 *
 * What is stored is the visible cards, in order. Everything else is off — which
 * means a card added in a later version arrives switched off rather than
 * appearing unannounced on a page somebody has already arranged. Ids belonging
 * to cards that no longer exist are dropped on the way through.
 *
 * Null is not an empty array: null is a client who has never opened the
 * setting and gets the default page, while [] is one who deliberately cleared
 * it and gets the empty page they asked for.
 */
export function layout(stored) {
  const visible = Array.isArray(stored)
    ? stored.filter(id => DEFAULT_ORDER.includes(id))
    : DEFAULT_ORDER
  return {
    visible,
    hidden: DEFAULT_ORDER.filter(id => !visible.includes(id)),
  }
}
