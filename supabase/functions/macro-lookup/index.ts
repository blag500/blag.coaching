const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a nutrition database. Given a food or meal description, respond with ONLY a valid JSON object — no markdown, no explanation, nothing else.

Format exactly:
{"name":"<food name>","per100g":{"kcal":<number>,"protein":<number>,"carbs":<number>,"fat":<number>},"typical_grams":<number>}

Rules:
- All macro values are per 100g of the food
- typical_grams is a realistic single serving size in grams
- Respond in the same language as the query (Bulgarian if query is in Bulgarian)
- All values must be plain numbers, not strings
- Base values on established nutritional data (USDA, etc.)`

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

  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: query.trim() }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    }
  )

  if (!aiRes.ok) {
    return new Response(JSON.stringify({ error: 'AI request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiData = await aiRes.json()
  const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  let result
  try {
    result = JSON.parse(text)
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
