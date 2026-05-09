const BASE = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v0/product'

function normalizeProduct(p) {
  return {
    id: crypto.randomUUID(),
    name: p.product_name || p.product_name_en || 'Непознат продукт',
    brand: p.brands || '',
    servingSize: p.serving_size || '100g',
    per100g: {
      kcal:    p.nutriments?.['energy-kcal_100g'] ?? 0,
      protein: p.nutriments?.proteins_100g ?? 0,
      carbs:   p.nutriments?.carbohydrates_100g ?? 0,
      fat:     p.nutriments?.fat_100g ?? 0,
    },
  }
}

export async function lookupBarcode(code) {
  const res = await fetch(`${PRODUCT_BASE}/${encodeURIComponent(code)}.json`)
  if (!res.ok) throw new Error(`OpenFoodFacts barcode: ${res.status}`)
  const data = await res.json()
  if (data.status !== 1 || !data.product) throw new Error('Продуктът не е намерен')
  return normalizeProduct(data.product)
}

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
    .map(normalizeProduct)
}
