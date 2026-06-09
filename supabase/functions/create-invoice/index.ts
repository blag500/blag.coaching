import { createClient } from 'npm:@supabase/supabase-js@2'

const STRIPE_KEY      = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const auth = () => `Basic ${btoa(STRIPE_KEY + ':')}`

async function stripePost(path: string, body: Record<string, string> = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { 'Authorization': auth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': auth() },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let session_id: string, price_eur: number
  try {
    const body = await req.json()
    session_id = body.session_id
    price_eur  = parseFloat(body.price_eur)
  } catch {
    return new Response('invalid json', { status: 400, headers: CORS })
  }

  if (!session_id || !price_eur || price_eur <= 0) {
    return new Response('missing session_id or price_eur', { status: 400, headers: CORS })
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY)

  // Fetch session + client profile
  const { data: session, error: dbErr } = await db
    .from('training_sessions')
    .select('*, client:profiles!training_sessions_client_id_fkey(id, name, email)')
    .eq('id', session_id)
    .single()

  if (dbErr || !session) {
    return new Response('session not found', { status: 404, headers: CORS })
  }

  const email     = session.client.email as string
  const name      = (session.client.name || email) as string
  const dateLabel = new Date(session.scheduled_at).toLocaleDateString('bg-BG', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Sofia',
  })
  const description = `${session.title} — ${dateLabel}`

  try {
    // Find or create Stripe customer by email
    const existing = await stripeGet(`/customers?email=${encodeURIComponent(email)}&limit=1`)
    let customerId: string
    if (existing.data?.length > 0) {
      customerId = existing.data[0].id
    } else {
      const customer = await stripePost('/customers', { email, name })
      customerId = customer.id
    }

    // Invoice item (EUR cents)
    const amountCents = String(Math.round(price_eur * 100))
    await stripePost('/invoiceitems', {
      customer:    customerId,
      amount:      amountCents,
      currency:    'eur',
      description,
    })

    // Create invoice (draft, manual control)
    const invoice = await stripePost('/invoices', {
      customer:          customerId,
      collection_method: 'send_invoice',
      days_until_due:    '7',
      auto_advance:      'false',
    })

    // Finalize → status becomes 'open'
    await stripePost(`/invoices/${invoice.id}/finalize`, {})

    // Send the invoice email
    await stripePost(`/invoices/${invoice.id}/send`, {})

    // Update session record
    await db
      .from('training_sessions')
      .update({
        stripe_invoice_id: invoice.id,
        payment_status:    'invoiced',
        price_eur,
      })
      .eq('id', session_id)

    return new Response(
      JSON.stringify({ invoice_id: invoice.id, invoice_url: invoice.hosted_invoice_url }),
      { headers: { 'Content-Type': 'application/json', ...CORS } },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
