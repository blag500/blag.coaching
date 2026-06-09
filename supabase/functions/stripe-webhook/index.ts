import { createClient } from 'npm:@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function verifySignature(body: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts: Record<string, string> = {}
    for (const chunk of header.split(',')) {
      const [k, v] = chunk.split('=')
      parts[k] = v
    }
    const timestamp = parts['t']
    const signature = parts['v1']
    if (!timestamp || !signature) return false

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )
    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`))
    const computed = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    return computed === signature
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('missing stripe-signature', { status: 400 })

  const body = await req.text()

  if (!await verifySignature(body, sig, WEBHOOK_SECRET)) {
    console.error('invalid webhook signature')
    return new Response('invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)
  console.log('stripe event:', event.type)

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object
    const db = createClient(SUPABASE_URL, SERVICE_KEY)

    const { error } = await db
      .from('training_sessions')
      .update({ payment_status: 'paid' })
      .eq('stripe_invoice_id', invoice.id)

    if (error) {
      console.error('db update error:', error)
      return new Response('db error', { status: 500 })
    }

    console.log('marked paid:', invoice.id)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
