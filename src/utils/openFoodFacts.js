import { supabase } from '../lib/supabase'

const BASE = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v0/product'

function normalizeProduct(p) {
  return {
    id: crypto.randomUUID(),
    name: p.product_name_bg || p.product_name || p.product_name_en || 'Непознат продукт',
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
  // Check local cache first — instant result for previously scanned barcodes
  const { data: cached } = await supabase
    .from('barcode_products')
    .select('name, kcal, protein, carbs, fat, typical_grams')
    .eq('barcode', code)
    .maybeSingle()

  if (cached) {
    return {
      id: crypto.randomUUID(),
      name: cached.name,
      brand: '',
      servingSize: `${cached.typical_grams}g`,
      per100g: {
        kcal:    cached.kcal,
        protein: cached.protein,
        carbs:   cached.carbs,
        fat:     cached.fat,
      },
    }
  }

  // Not cached — fetch from Open Food Facts
  const res = await fetch(`${PRODUCT_BASE}/${encodeURIComponent(code)}.json`)
  if (!res.ok) throw new Error(`OpenFoodFacts barcode: ${res.status}`)
  const data = await res.json()
  if (data.status !== 1 || !data.product) throw new Error('Продуктът не е намерен')
  const food = normalizeProduct(data.product)

  // Cache it for all future scans (fire-and-forget, don't block)
  supabase.from('barcode_products').insert({
    barcode:       code,
    name:          food.name,
    kcal:          food.per100g.kcal,
    protein:       food.per100g.protein,
    carbs:         food.per100g.carbs,
    fat:           food.per100g.fat,
    typical_grams: 100,
  }).then()

  return food
}

export async function searchFoods(query) {
  const params = new URLSearchParams({
    search_terms: query,
    json: '1',
    page_size: '20',
    fields: 'product_name,product_name_bg,product_name_en,nutriments,brands,serving_size',
    search_simple: '1',
    action: 'process',
    sort_by: 'unique_scans_n',
  })
  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`OpenFoodFacts: ${res.status}`)
  const data = await res.json()
  return (data.products || [])
    .filter(p => p.product_name && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0)
    .map(normalizeProduct)
}
