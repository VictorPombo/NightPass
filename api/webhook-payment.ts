import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // MP sends GET to validate the webhook URL
  if (req.method === 'GET') return res.json({ ok: true })
  if (req.method !== 'POST') return res.status(405).end()

  const { type, data } = req.body ?? {}
  if (type !== 'payment' || !data?.id) return res.json({ ok: true })

  const paymentId = String(data.id)
  const sb = supabaseAdmin()

  // Find the order
  const { data: order } = await sb
    .from('ticket_orders')
    .select('*')
    .eq('payment_id', paymentId)
    .single()

  if (!order || order.payment_status === 'paid') return res.json({ ok: true })

  // Get house MP token to verify payment
  const { data: house } = await sb
    .from('houses')
    .select('mp_access_token')
    .eq('id', order.house_id)
    .single()

  if (!house?.mp_access_token) return res.status(400).json({ error: 'No MP config' })

  try {
    const { MercadoPagoConfig, Payment } = await import('mercadopago')
    const client = new MercadoPagoConfig({ accessToken: house.mp_access_token })
    const paymentApi = new Payment(client)
    const mpPay = await paymentApi.get({ id: Number(paymentId) })

    if (mpPay.status !== 'approved') return res.json({ ok: true })
  } catch (e) {
    console.error('MP verify error:', e)
    return res.status(500).json({ error: 'MP verify failed' })
  }

  // Confirm order and generate tickets
  await sb.from('ticket_orders').update({ payment_status: 'paid' }).eq('id', order.id)

  const tickets = Array.from({ length: order.quantity }, () => ({
    order_id: order.id,
    event_id: order.event_id,
    house_id: order.house_id,
    token: crypto.randomUUID(),
    holder_name: order.buyer_name,
    checked_in: false,
  }))

  await sb.from('tickets').insert(tickets)
  await sb.rpc('increment_batch_sold', { p_batch_id: order.batch_id, p_qty: order.quantity })

  res.json({ ok: true })
}
