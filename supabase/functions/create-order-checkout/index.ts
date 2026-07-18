import { createClient } from 'npm:@supabase/supabase-js@2'

const STRIPE_KEY   = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

interface CartItem {
  product_id: string
  qty:        number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')   return new Response('method not allowed', { status: 405, headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('unauthorized', { status: 401, headers: CORS })

  const db = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return new Response('unauthorized', { status: 401, headers: CORS })

  let items: CartItem[], success_url: string, cancel_url: string, delivery_address: string, delivery_notes: string, log_date: string
  try {
    const body     = await req.json()
    items          = body.items
    success_url    = body.success_url
    cancel_url     = body.cancel_url
    delivery_address = body.delivery_address ?? ''
    delivery_notes   = body.delivery_notes   ?? ''
    log_date         = body.log_date         ?? new Date().toISOString().slice(0, 10)
  } catch {
    return new Response('invalid json', { status: 400, headers: CORS })
  }

  if (!items?.length || !success_url || !cancel_url) {
    return new Response('missing fields', { status: 400, headers: CORS })
  }

  try {
    // Fetch products from DB to validate prices
    const productIds = items.map(i => i.product_id)
    const { data: products, error: prodErr } = await db
      .from('catalog_products')
      .select('id, name, price_stotinki, kcal_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, serving_size, serving_unit, available')
      .in('id', productIds)

    if (prodErr || !products) throw new Error('failed to load products')

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))
    const unavailable = items.find(i => !productMap[i.product_id]?.available)
    if (unavailable) throw new Error('product unavailable')

    // Calculate total
    const totalStotinki = items.reduce((sum, i) => sum + productMap[i.product_id].price_stotinki * i.qty, 0)

    // Create order record
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending_payment',
        total_stotinki: totalStotinki,
        delivery_address,
        delivery_notes,
        log_date,
      })
      .select()
      .single()

    if (orderErr || !order) throw new Error('failed to create order')

    // Create order items
    const orderItems = items.map(i => {
      const p = productMap[i.product_id]
      return {
        order_id:             order.id,
        product_id:           i.product_id,
        qty:                  i.qty,
        unit_price_stotinki:  p.price_stotinki,
        name_snapshot:        p.name,
        kcal_snapshot:        p.kcal_per_serving * i.qty,
        protein_snapshot:     p.protein_per_serving * i.qty,
        carbs_snapshot:       p.carbs_per_serving * i.qty,
        fat_snapshot:         p.fat_per_serving * i.qty,
        serving_size_snapshot: p.serving_size,
        serving_unit_snapshot: p.serving_unit,
      }
    })

    await db.from('order_items').insert(orderItems)

    // Build Stripe line items
    const stripeBody: Record<string, string> = {
      mode:                           'payment',
      'payment_method_types[0]':      'card',
      client_reference_id:            user.id,
      'metadata[order_type]':         'product_order',
      'metadata[order_id]':           order.id,
      'metadata[user_id]':            user.id,
      'metadata[log_date]':           log_date,
      success_url:                    `${success_url}?order_success=${order.id}`,
      cancel_url,
    }

    items.forEach((item, idx) => {
      const p = productMap[item.product_id]
      stripeBody[`line_items[${idx}][price_data][currency]`]             = 'bgn'
      stripeBody[`line_items[${idx}][price_data][unit_amount]`]          = String(p.price_stotinki)
      stripeBody[`line_items[${idx}][price_data][product_data][name]`]   = p.name
      stripeBody[`line_items[${idx}][quantity]`]                         = String(item.qty)
    })

    const session = await stripePost('/checkout/sessions', stripeBody)

    // Save Stripe session ID to order
    await db.from('orders').update({ stripe_checkout_session_id: session.id }).eq('id', order.id)

    return new Response(
      JSON.stringify({ url: session.url, order_id: order.id }),
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
