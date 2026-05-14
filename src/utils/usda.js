const BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search'
// DEMO_KEY: 1000 req/hour per IP — sufficient for personal use
const API_KEY = 'DEMO_KEY'

// Common Bulgarian food names → English for USDA lookup
const BG_TO_EN = {
  'пиле': 'chicken',
  'пилешко': 'chicken breast',
  'пилешка гърда': 'chicken breast',
  'пилешки бутчета': 'chicken thighs',
  'телешко': 'beef',
  'свинско': 'pork',
  'риба': 'fish',
  'сьомга': 'salmon',
  'риба тон': 'tuna',
  'скумрия': 'mackerel',
  'яйце': 'egg',
  'яйца': 'eggs',
  'мляко': 'milk',
  'кисело мляко': 'yogurt',
  'извара': 'cottage cheese',
  'сирене': 'feta cheese',
  'кашкавал': 'cheddar cheese',
  'ориз': 'rice',
  'тестени изделия': 'pasta',
  'макарони': 'macaroni',
  'спагети': 'spaghetti',
  'хляб': 'bread',
  'картофи': 'potatoes',
  'овес': 'oats',
  'овесена каша': 'oatmeal',
  'домат': 'tomato',
  'домати': 'tomatoes',
  'краставица': 'cucumber',
  'морков': 'carrot',
  'броколи': 'broccoli',
  'спанак': 'spinach',
  'ябълка': 'apple',
  'банан': 'banana',
  'портокал': 'orange',
  'ягода': 'strawberry',
  'грозде': 'grapes',
  'масло': 'butter',
  'зехтин': 'olive oil',
  'ядки': 'nuts',
  'бадеми': 'almonds',
  'орехи': 'walnuts',
  'боб': 'beans',
  'леща': 'lentils',
  'наденица': 'sausage',
  'кайма': 'ground beef',
  'шоколад': 'chocolate',
  'мед': 'honey',
  'захар': 'sugar',
  'краве масло': 'butter',
}

function translateQuery(query) {
  const lower = query.toLowerCase().trim()
  if (BG_TO_EN[lower]) return BG_TO_EN[lower]
  for (const [bg, en] of Object.entries(BG_TO_EN)) {
    if (lower.includes(bg)) return en
  }
  return query
}

function getNutrient(nutrients, id) {
  return nutrients?.find(n => n.nutrientId === id)?.value ?? 0
}

export async function suggestMacros(query) {
  if (!query?.trim() || query.trim().length < 2) return []
  const translated = translateQuery(query)
  const params = new URLSearchParams({
    query: translated,
    pageSize: '6',
    dataType: 'Foundation,SR Legacy',
    api_key: API_KEY,
  })
  try {
    const res = await fetch(`${BASE}?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.foods || [])
      .map(f => ({
        name: f.description,
        kcal:    Math.round(getNutrient(f.foodNutrients, 1008)),
        protein: Math.round(getNutrient(f.foodNutrients, 1003) * 10) / 10,
        carbs:   Math.round(getNutrient(f.foodNutrients, 1005) * 10) / 10,
        fat:     Math.round(getNutrient(f.foodNutrients, 1004) * 10) / 10,
      }))
      .filter(f => f.kcal > 0)
      .slice(0, 5)
  } catch {
    return []
  }
}
