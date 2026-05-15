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
      model: 'llama-3.1-8b-instant',
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
