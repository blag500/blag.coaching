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

    const encoder  = new TextEncoder()
    const key      = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign'],
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
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('missing stripe-signature', { status: 400 })

  const body = await req.text()

  if (!await verifySignature(body, sig, WEBHOOK_SECRET)) {
    console.error('invalid webhook signature')
    return new Response('invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)
  console.log('stripe event:', event.type)

  const db = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── Checkout completed ────────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const sess    = event.data.object
    const orderType = sess.metadata?.order_type as string | undefined

    // ── Product order ──
    if (orderType === 'product_order') {
      const orderId = sess.metadata?.order_id as string
      const userId  = sess.metadata?.user_id  as string
      const logDate = sess.metadata?.log_date as string

      if (!orderId || !userId) {
        console.error('product_order missing metadata')
        return new Response('bad metadata', { status: 400 })
      }

      // Confirm order
      await db.from('orders').update({ status: 'confirmed' }).eq('id', orderId)

      // Log all items to food_logs for that date
      const { data: orderItems } = await db
        .from('order_items')
        .select('name_snapshot, kcal_snapshot, protein_snapshot, carbs_snapshot, fat_snapshot, serving_size_snapshot, serving_unit_snapshot, qty')
        .eq('order_id', orderId)

      if (orderItems?.length) {
        const logs = orderItems.map(item => ({
          user_id: userId,
          date:    logDate,
          name:    item.name_snapshot,
          grams:   item.serving_size_snapshot * item.qty,
          kcal:    item.kcal_snapshot,
          protein: item.protein_snapshot,
          carbs:   item.carbs_snapshot,
          fat:     item.fat_snapshot,
        }))
        const { error: logErr } = await db.from('food_logs').insert(logs)
        if (logErr) console.error('food_log insert error:', logErr)
        else        console.log('food logged for order:', orderId, 'items:', logs.length)
      }

      console.log('product order confirmed:', orderId)
      return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── Subscription ──
    const userId         = sess.client_reference_id as string
    const customerId     = sess.customer            as string
    const subscriptionId = sess.subscription        as string
    const plan           = sess.metadata?.plan      as string

    if (userId && subscriptionId && plan) {
      const { error } = await db.from('profiles').update({
        stripe_customer_id:     customerId,
        stripe_subscription_id: subscriptionId,
        plan,
      }).eq('id', userId)

      if (error) {
        console.error('checkout.session.completed db error:', error)
        return new Response('db error', { status: 500 })
      }
      console.log('subscription activated:', userId, plan, subscriptionId)
    }
  }

  // ── Subscription status changed (renewal, payment failure, etc.) ───────────
  if (event.type === 'customer.subscription.updated') {
    const sub    = event.data.object
    const subId  = sub.id     as string
    const status = sub.status as string

    if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
      const { error } = await db.from('profiles').update({
        plan:                   'free',
        stripe_subscription_id: null,
      }).eq('stripe_subscription_id', subId)

      if (error) console.error('subscription.updated downgrade error:', error)
      else       console.log('downgraded to free:', subId, 'reason:', status)
    } else if (status === 'active') {
      const plan = (sub.metadata?.plan ?? '') as string
      if (plan) {
        const { error } = await db.from('profiles')
          .update({ plan })
          .eq('stripe_subscription_id', subId)
        if (error) console.error('subscription.updated plan sync error:', error)
      }
    }
  }

  // ── Subscription cancelled ─────────────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub   = event.data.object
    const subId = sub.id as string

    const { error } = await db.from('profiles').update({
      plan:                   'free',
      stripe_subscription_id: null,
    }).eq('stripe_subscription_id', subId)

    if (error) console.error('subscription.deleted error:', error)
    else       console.log('subscription deleted, downgraded to free:', subId)
  }

  // ── Per-session invoice paid (legacy coaching sessions) ───────────────────
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object
    // Only handle if it's a one-off training session invoice (has stripe_invoice_id in DB)
    const { error } = await db
      .from('training_sessions')
      .update({ payment_status: 'paid' })
      .eq('stripe_invoice_id', invoice.id)

    if (error) console.error('invoice.paid db error:', error)
    else       console.log('training session marked paid:', invoice.id)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
