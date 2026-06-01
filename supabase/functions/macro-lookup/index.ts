const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a precise nutrition database. Given a food description, return ONLY a valid JSON object — no markdown, no explanation.

SINGLE FOOD — if the query describes exactly one food item, return:
{"name":"<food name>","per100g":{"kcal":<n>,"protein":<n>,"carbs":<n>,"fat":<n>},"typical_grams":<n>}

MULTIPLE FOODS — if the query lists two or more distinct food items (separated by commas, "и", "and", "&", "+", newlines, or similar), return absolute totals for each item using the specified quantity (or typical serving when no quantity is given):
{"items":[{"name":"<food>","grams":<n>,"kcal":<n>,"protein":<n>,"carbs":<n>,"fat":<n>},...]}

UNRECOGNIZED — if you cannot identify any real food from the query, return:
{"error":"unrecognized"}

Rules:
- Handle typos, transliteration errors, abbreviations, and shorthand (e.g. "пиле" → "Пилешки гърди")
- SINGLE: per100g values are per 100 grams only; typical_grams is a realistic single serving
- MULTIPLE: kcal/protein/carbs/fat in each item are TOTALS for the specified grams — not per 100g
- If a food quantity is expressed in pieces/units (e.g. "1 яйце", "2 банана"), convert to grams
- All values are plain numbers, never strings
- Macros must be consistent: kcal ≈ protein×4 + carbs×4 + fat×9 (within 20%)
- Use the same language as the query for food names (Bulgarian if query is in Bulgarian)`

// ─── Types ────────────────────────────────────────────────────────────────────

interface SingleResult {
  type: 'single'
  name: string
  per100g: { kcal: number; protein: number; carbs: number; fat: number }
  typical_grams: number
}

interface MultiItem {
  name: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface MultiResult {
  type: 'multi'
  items: MultiItem[]
}

// ─── Validation ───────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function fixKcal(kcal: number, protein: number, carbs: number, fat: number): number {
  const estimated = protein * 4 + carbs * 4 + fat * 9
  if (kcal <= 0 || (estimated > 5 && Math.abs(estimated - kcal) / Math.max(kcal, estimated) > 0.35)) {
    return Math.round(estimated)
  }
  return Math.round(kcal)
}

function validateSingle(raw: Record<string, unknown>):
  | { ok: true; data: SingleResult }
  | { ok: false; reason: string } {

  if (raw.error === 'unrecognized') return { ok: false, reason: 'unrecognized' }

  const { name, per100g, typical_grams } = raw as {
    name: unknown
    per100g: { kcal: unknown; protein: unknown; carbs: unknown; fat: unknown }
    typical_grams: unknown
  }

  if (typeof name !== 'string' || !name.trim()) return { ok: false, reason: 'missing name' }
  if (!per100g || typeof per100g !== 'object')  return { ok: false, reason: 'missing per100g' }

  let { kcal, protein, carbs, fat } = per100g as { kcal: unknown; protein: unknown; carbs: unknown; fat: unknown }

  if (typeof kcal !== 'number' || typeof protein !== 'number' ||
      typeof carbs !== 'number' || typeof fat !== 'number') {
    return { ok: false, reason: 'non-numeric macros' }
  }

  protein = clamp(protein, 0, 100)
  carbs   = clamp(carbs,   0, 100)
  fat     = clamp(fat,     0, 100)
  kcal    = clamp(fixKcal(kcal, protein, carbs, fat), 0, 950)

  return {
    ok: true,
    data: {
      type: 'single',
      name: (name as string).trim(),
      per100g: {
        kcal,
        protein: Math.round(protein * 10) / 10,
        carbs:   Math.round(carbs   * 10) / 10,
        fat:     Math.round(fat     * 10) / 10,
      },
      typical_grams: typeof typical_grams === 'number' && typical_grams > 0
        ? Math.round(typical_grams)
        : 100,
    },
  }
}

function validateMulti(rawItems: unknown[]):
  | { ok: true; data: MultiResult }
  | { ok: false; reason: string } {

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, reason: 'empty items array' }
  }

  const items: MultiItem[] = []

  for (const raw of rawItems) {
    const r = raw as Record<string, unknown>
    const name = r.name

    if (typeof name !== 'string' || !(name as string).trim()) {
      return { ok: false, reason: 'item missing name' }
    }

    const grams = typeof r.grams === 'number' ? r.grams : 0
    if (grams <= 0) return { ok: false, reason: 'item has invalid grams' }

    let protein = clamp(typeof r.protein === 'number' ? r.protein : 0, 0, grams)
    let carbs   = clamp(typeof r.carbs   === 'number' ? r.carbs   : 0, 0, grams)
    let fat     = clamp(typeof r.fat     === 'number' ? r.fat     : 0, 0, grams)
    let kcal    = clamp(
      fixKcal(typeof r.kcal === 'number' ? r.kcal : 0, protein, carbs, fat),
      0,
      Math.round(grams * 10)  // ~10 kcal/g is a safe upper bound (pure fat = 9 kcal/g)
    )

    items.push({
      name:    (name as string).trim(),
      grams:   Math.round(grams),
      kcal,
      protein: Math.round(protein * 10) / 10,
      carbs:   Math.round(carbs   * 10) / 10,
      fat:     Math.round(fat     * 10) / 10,
    })
  }

  return { ok: true, data: { type: 'multi', items } }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const { query } = await req.json()
  if (!query?.trim()) {
    return new Response(JSON.stringify({ error: 'missing query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: query.trim() },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 512,
    }),
  })

  if (!aiRes.ok) {
    return new Response(JSON.stringify({ error: 'AI request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiData = await aiRes.json()
  const text   = aiData.choices?.[0]?.message?.content ?? ''

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    return new Response(JSON.stringify({ error: 'parse_failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  // ── Multi-food response ──
  // Only treat as multi if items is a non-empty array; an empty/spurious items
  // field from the AI should fall through to the single-food path below.
  if (Array.isArray(parsed.items) && parsed.items.length > 0) {
    const validation = validateMulti(parsed.items)
    if (!validation.ok) {
      // If multi-validation fails but the payload also has single-food fields,
      // gracefully fall through to single-food validation instead of erroring.
      if (!parsed.per100g) {
        return new Response(JSON.stringify({ error: validation.reason }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }
      // fall through to single-food path
    } else {
      return new Response(JSON.stringify(validation.data), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }
  }

  // ── Single food response ──
  const validation = validateSingle(parsed)
  if (!validation.ok) {
    const status = validation.reason === 'unrecognized' ? 422 : 502
    return new Response(JSON.stringify({ error: validation.reason }), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  // Strip the `type` field — client expects the original shape
  const { type: _t, ...resultData } = validation.data
  return new Response(JSON.stringify(resultData), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
