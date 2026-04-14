import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function confirmAndGenerateTickets(
  sb: ReturnType<typeof supabaseAdmin>,
  orderId: string,
  eventId: string,
  houseId: string,
  batchId: string,
  quantity: number,
  holderName: string
) {
  await sb.from('ticket_orders').update({ payment_status: 'paid' }).eq('id', orderId)

  const tickets = Array.from({ length: quantity }, () => ({
    order_id: orderId,
    event_id: eventId,
    house_id: houseId,
    token: crypto.randomUUID(),
    holder_name: holderName,
    checked_in: false,
  }))
  await sb.from('tickets').insert(tickets)
  await sb.rpc('increment_batch_sold', { p_batch_id: batchId, p_qty: quantity })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { event_id, batch_id, house_id, buyer_name, buyer_cpf, buyer_phone, buyer_email, quantity } = req.body

  if (!event_id || !batch_id || !house_id || !buyer_name || !buyer_phone || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const sb = supabaseAdmin()

  const [{ data: batch }, { data: house }] = await Promise.all([
    sb.from('ticket_batches').select('price_cents,name,quantity,sold,active').eq('id', batch_id).single(),
    sb.from('houses').select('mp_access_token,pix_key,pix_holder,name').eq('id', house_id).single(),
  ])

  if (!batch) return res.status(404).json({ error: 'Lote não encontrado' })
  if (!batch.active) return res.status(400).json({ error: 'Lote inativo' })
  if (batch.quantity - batch.sold < quantity) return res.status(400).json({ error: 'Ingressos insuficientes' })
  if (!house) return res.status(404).json({ error: 'Casa não encontrada' })

  const amount_cents = batch.price_cents * quantity

  // Create order
  const { data: order, error: orderErr } = await sb.from('ticket_orders').insert({
    house_id, event_id, batch_id,
    buyer_name, buyer_cpf: buyer_cpf || null,
    buyer_phone, buyer_email: buyer_email || null,
    quantity, amount_cents,
    payment_status: 'pending',
    payment_method: 'pix',
  }).select().single()

  if (orderErr || !order) return res.status(500).json({ error: 'Erro ao criar pedido' })

  // Free ticket — auto confirm
  if (amount_cents === 0) {
    await confirmAndGenerateTickets(sb, order.id, event_id, house_id, batch_id, quantity, buyer_name)
    return res.json({ mode: 'free', order_id: order.id })
  }

  // Mercado Pago PIX
  if (house.mp_access_token) {
    try {
      const { MercadoPagoConfig, Payment } = await import('mercadopago')
      const client = new MercadoPagoConfig({ accessToken: house.mp_access_token })
      const paymentApi = new Payment(client)

      const mpPay = await paymentApi.create({
        body: {
          transaction_amount: amount_cents / 100,
          payment_method_id: 'pix',
          description: `${quantity}x ${batch.name} – ${house.name}`,
          external_reference: order.id,
          notification_url: `${process.env.APP_URL ?? 'https://nightpass-app.vercel.app'}/api/webhook-payment`,
          payer: {
            email: buyer_email || `${buyer_phone.replace(/\D/g, '')}@pix.nightpass.app`,
            first_name: buyer_name.split(' ')[0],
            last_name: buyer_name.split(' ').slice(1).join(' ') || 'NightPass',
            ...(buyer_cpf ? { identification: { type: 'CPF', number: buyer_cpf.replace(/\D/g, '') } } : {}),
          },
        },
      })

      await sb.from('ticket_orders').update({ payment_id: String(mpPay.id) }).eq('id', order.id)

      return res.json({
        mode: 'mp',
        order_id: order.id,
        amount_cents,
        qr_code: mpPay.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpPay.point_of_interaction?.transaction_data?.qr_code_base64,
      })
    } catch (e) {
      console.error('Mercado Pago error:', e)
      // fall through to manual PIX
    }
  }

  // Manual PIX fallback
  return res.json({
    mode: 'manual',
    order_id: order.id,
    amount_cents,
    pix_key: house.pix_key,
    pix_holder: house.pix_holder,
  })
}
