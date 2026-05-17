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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: image,
              },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  })

  if (!aiRes.ok) {
    const detail = await aiRes.text()
    return new Response(JSON.stringify({ error: 'AI request failed', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const aiData = await aiRes.json()
  const text = aiData.content?.[0]?.text ?? ''

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
