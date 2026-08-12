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

/**
 * Whether a product's numbers disagree with themselves.
 *
 * Protein and carbs carry 4 kcal a gram, fat 9. A label that says 250 kcal
 * while its macros add up to 90 has been entered wrong by somebody, and the
 * arithmetic catches it without anyone having to notice. This is the only
 * check worth making automatically: it needs no reference data, just the row
 * against itself.
 */
export function looksInconsistent(per100g) {
  const { kcal = 0, protein = 0, carbs = 0, fat = 0 } = per100g ?? {}
  if (!kcal && !protein && !carbs && !fat) return true   // nothing at all
  if (!kcal) return true                                  // macros but no energy
  const fromMacros = protein * 4 + carbs * 4 + fat * 9
  if (!fromMacros) return true                            // energy but no macros
  const off = Math.abs(kcal - fromMacros) / Math.max(kcal, fromMacros)
  return off > 0.25
}

/** Overwrite a barcode's macros for everyone, and note that it was corrected. */
export async function correctBarcode(code, { name, per100g, typicalGrams }) {
  const { data: auth } = await supabase.auth.getUser()
  return supabase.from('barcode_products').upsert({
    barcode:       code,
    name,
    kcal:          Math.round(per100g.kcal || 0),
    protein:       per100g.protein || 0,
    carbs:         per100g.carbs   || 0,
    fat:           per100g.fat     || 0,
    typical_grams: typicalGrams || 100,
    corrected_at:  new Date().toISOString(),
    corrected_by:  auth?.user?.id ?? null,
  }, { onConflict: 'barcode' })
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
