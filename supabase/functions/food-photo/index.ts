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
- per100g values are per 100 grams; typical_grams is the estimated serving
- For multi: kcal/protein/carbs/fat are TOTAL for the estimated grams (not per 100g)
- All values must be plain numbers
- If unsure, give a reasonable estimate — never return 0 for a visible food`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const { image, mediaType } = await req.json()
  if (!image) {
    return new Response(JSON.stringify({ error: 'missing image' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
            { text: PROMPT },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    }
  )

  if (!aiRes.ok) {
    const detail = await aiRes.text()
    return new Response(JSON.stringify({ error: 'Gemini request failed', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiData = await aiRes.json()
  const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  let result
  try {
    const match = text.match(/\{[\s\S]*\}/)
    result = JSON.parse(match ? match[0] : text)
  } catch {
    return new Response(JSON.stringify({ error: 'Could not parse response', raw: text }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
