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

  const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${image}` } },
          { type: 'text', text: PROMPT },
        ],
      }],
      max_tokens: 400,
      temperature: 0.1,
    }),
  })

  if (!aiRes.ok) {
    const detail = await aiRes.text()
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
