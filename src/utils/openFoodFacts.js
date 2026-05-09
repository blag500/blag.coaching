const BASE = 'https://world.openfoodfacts.org/cgi/search.pl'

export async function searchFoods(query) {
  const params = new URLSearchParams({
    search_terms: query,
    json: '1',
    page_size: '20',
    fields: 'product_name,nutriments,brands,serving_size',
    search_simple: '1',
    action: 'process',
  })
  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`OpenFoodFacts: ${res.status}`)
  const data = await res.json()
  return (data.products || [])
    .filter(p => p.product_name)
    .map(p => ({
      id: crypto.randomUUID(),
      name: p.product_name,
      brand: p.brands || '',
      servingSize: p.serving_size || '100g',
      per100g: {
        kcal:    p.nutriments?.['energy-kcal_100g'] ?? 0,
        protein: p.nutriments?.proteins_100g ?? 0,
        carbs:   p.nutriments?.carbohydrates_100g ?? 0,
        fat:     p.nutriments?.fat_100g ?? 0,
      },
    }))
}
