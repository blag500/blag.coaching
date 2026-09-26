/** Макросите на цялата рецепта — сбор от съставките, всяка по грамажа си. */
export function recipeTotals(ingredients) {
  return (ingredients || []).reduce((acc, ing) => {
    const r = (ing.grams || 0) / 100
    return {
      kcal:    acc.kcal    + (ing.per100g?.kcal    || 0) * r,
      protein: acc.protein + (ing.per100g?.protein || 0) * r,
      carbs:   acc.carbs   + (ing.per100g?.carbs   || 0) * r,
      fat:     acc.fat     + (ing.per100g?.fat     || 0) * r,
    }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}

/** Макросите на една порция. */
export function perServing(recipe) {
  const tot = recipeTotals(recipe.ingredients)
  const n = recipe.servings || 1
  return { kcal: tot.kcal / n, protein: tot.protein / n, carbs: tot.carbs / n, fat: tot.fat / n }
}
