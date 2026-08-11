const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are a nutrition expert. Look at this photo of food and estimate the macronutrients.

Respond with ONLY a valid JSON object — no markdown, no explanation.

If there is ONE food item or a single dish:
{"name":"<food name in Bulgarian>","per100g":{"kcal":<number>,"protein":<number>,"carbs":<number>,"fat":<number>},"typical_grams":<estimated portion in grams>}

If there are MULTIPLE distinct food items on the plate:
{"type":"multi","items":[{"name":"<name in Bulgarian>","grams":<estimated grams>,"kcal":<total kcal>,"protein":<total g>,"carbs":<total g>,"fat":<total g>},...]}

Rules:
- Names must be in Bulgarian (e.g. "Пилешко филе", "Ориз", "Салата")
- Estimate portion sizes realistically based on a typical plate
- per100g values are per 100 grams RAW weight (standard nutrition database convention)
- typical_grams is the estimated cooked/served portion weight
- For multi: kcal/protein/carbs/fat are TOTAL for the estimated grams
- All values must be plain numbers
- If unsure, give a reasonable estimate — never return 0 for a visible food`

// Groq retires vision models without much notice — llama-4-scout vanished and
// took label scanning and meal photos with it. Try each in turn so one
// deprecation degrades instead of breaking the feature.
const VISION_MODELS = [
  'qwen/qwen3.6-27b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { image, mediaType } = await req.json()
  if (!image) {
    return new Response(JSON.stringify({ error: 'missing image' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const content = [
    { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${image}` } },
    { type: 'text', text: PROMPT },
  ]

  let aiRes: Response | null = null
  let detail = ''
  for (const model of VISION_MODELS) {
    aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        reasoning_effort: 'none',
        max_tokens: 1400,
        temperature: 0.1,
      }),
    })
    if (aiRes.ok) break
    detail = await aiRes.text()
    // Only a missing/decommissioned model is worth retrying on — a bad image or
    // an expired key will fail the same way on every model.
    if (!detail.includes('model_not_found') && !detail.includes('does not exist')) break
  }

  if (!aiRes || !aiRes.ok) {
    return new Response(JSON.stringify({ error: 'Groq request failed', detail }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiData = await aiRes.json()
  const text = aiData.choices?.[0]?.message?.content ?? ''

  let result
  try {
    // Reasoning models emit their working before the answer, sometimes in a
    // <think> block and sometimes as bare prose, so strip that first and then
    // take the LAST balanced object — the earlier ones are worked examples.
    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*$/i, '')
      .replace(/```(?:json)?/gi, '')
    const matches = cleaned.match(/\{[\s\S]*\}/g) ?? []
    const candidate = matches.length ? matches[matches.length - 1] : cleaned
    result = JSON.parse(candidate)
  } catch {
    return new Response(JSON.stringify({ error: 'Could not parse response', raw: text }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
