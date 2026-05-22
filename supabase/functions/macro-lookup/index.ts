const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a precise nutrition database. Given a food or meal description, return ONLY a valid JSON object — no markdown, no explanation.

If the query has typos, spelling mistakes, or transliteration errors, identify the most likely intended food and use its correct name.
If you genuinely cannot identify a real food from the query, return exactly: {"error":"unrecognized"}

Otherwise return:
{"name":"<correct food name>","per100g":{"kcal":<number>,"protein":<number>,"carbs":<number>,"fat":<number>},"typical_grams":<number>}

Rules:
- All macro values are per 100g, based on USDA or established nutritional data
- typical_grams is a realistic single serving in grams
- All values must be plain numbers, not strings
- Macros must be nutritionally consistent: kcal ≈ protein×4 + carbs×4 + fat×9 (within 20%)
- Use the same language as the query for the food name (Bulgarian if query is in Bulgarian)`

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function validateAndFix(result: Record<string, unknown>): { ok: true; data: unknown } | { ok: false; reason: string } {
  if (result.error === 'unrecognized') return { ok: false, reason: 'unrecognized' }

  const { name, per100g, typical_grams } = result as {
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

  // Clamp to realistic per-100g ranges
  protein = clamp(protein, 0, 100)
  carbs   = clamp(carbs,   0, 100)
  fat     = clamp(fat,     0, 100)

  // Recalculate kcal from macros if the model's value is clearly wrong
  const estimatedKcal = protein * 4 + carbs * 4 + fat * 9
  if (kcal <= 0 || kcal > 950 || (estimatedKcal > 5 && Math.abs(estimatedKcal - kcal) / Math.max(kcal, estimatedKcal) > 0.35)) {
    kcal = Math.round(estimatedKcal)
  }

  kcal = clamp(Math.round(kcal), 0, 950)

  return {
    ok: true,
    data: {
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
      max_tokens: 256,
    }),
  })

  if (!aiRes.ok) {
    return new Response(JSON.stringify({ error: 'AI request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiData = await aiRes.json()
  const text = aiData.choices?.[0]?.message?.content ?? ''

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    return new Response(JSON.stringify({ error: 'parse_failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const validation = validateAndFix(parsed)

  if (!validation.ok) {
    const status = validation.reason === 'unrecognized' ? 422 : 502
    return new Response(JSON.stringify({ error: validation.reason }), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  return new Response(JSON.stringify(validation.data), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
