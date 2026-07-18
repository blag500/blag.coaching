import { createClient } from 'npm:@supabase/supabase-js@2'

const STRIPE_KEY        = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PRO_PRICE_ID      = Deno.env.get('STRIPE_PRO_PRICE_ID')!
const COACHING_PRICE_ID = Deno.env.get('STRIPE_COACHING_PRICE_ID')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const auth = () => `Basic ${btoa(STRIPE_KEY + ':')}`

async function stripePost(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: auth() },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('unauthorized', { status: 401, headers: CORS })

  const db = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return new Response('unauthorized', { status: 401, headers: CORS })

  let plan: string, success_url: string, cancel_url: string
  try {
    const body  = await req.json()
    plan        = body.plan
    success_url = body.success_url
    cancel_url  = body.cancel_url
  } catch {
    return new Response('invalid json', { status: 400, headers: CORS })
  }

  const priceId = plan === 'pro' ? PRO_PRICE_ID : plan === 'coaching' ? COACHING_PRICE_ID : null
  if (!priceId) return new Response('invalid plan', { status: 400, headers: CORS })
  if (!success_url || !cancel_url) return new Response('missing urls', { status: 400, headers: CORS })

  try {
    // Get or create Stripe customer
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId: string = profile?.stripe_customer_id ?? ''

    if (!customerId) {
      const existing = await stripeGet(`/customers?email=${encodeURIComponent(user.email!)}&limit=1`)
      if (existing.data?.length > 0) {
        customerId = existing.data[0].id
      } else {
        const customer = await stripePost('/customers', {
          email: user.email!,
          'metadata[supabase_user_id]': user.id,
        })
        customerId = customer.id
      }
      await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Create Stripe Checkout Session (subscription mode)
    const session = await stripePost('/checkout/sessions', {
      mode:                                      'subscription',
      'payment_method_types[0]':                 'card',
      customer:                                  customerId,
      'line_items[0][price]':                    priceId,
      'line_items[0][quantity]':                 '1',
      client_reference_id:                       user.id,
      success_url,
      cancel_url,
      'metadata[plan]':                          plan,
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][plan]':       plan,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
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
