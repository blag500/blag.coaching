const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `Look at this product nutrition label or ingredient list. Extract the nutritional information and respond with ONLY a valid JSON object — no markdown, no explanation, nothing else.

Format exactly:
{"name":"<product name>","per100g":{"kcal":<number>,"protein":<number>,"carbs":<number>,"fat":<number>},"typical_grams":<number>}

Rules:
- All macro values must be per 100g (convert from per-serving values if needed using the serving size shown)
- typical_grams is the serving size in grams (use 100 if not visible)
- name should be the product name visible on the label; if not visible, describe what you see
- All values must be plain numbers, not strings
- If a value is not visible, use 0`

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
        max_tokens: 300,
        temperature: 0,
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
    const match = text.match(/\{[\s\S]*\}/)
    result = JSON.parse(match ? match[0] : text)
  } catch {
    return new Response(JSON.stringify({ error: 'Could not parse response', raw: text }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
