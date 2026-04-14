export function fmtWAPhone(phone: string): string | null {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) return d
  if (d.length === 11 || d.length === 10) return '55' + d
  if (d.length === 13 && d.startsWith('55')) return d
  return d.length >= 10 ? '55' + d : null
}

export async function sendWA(
  houseId: string,
  type: string,
  phone: string,
  name: string,
  extra: Record<string, string> = {},
  clientId?: string | null,
  eventId?: string | null
) {
  const { supabase } = await import('../lib/supabase')
  const fph = fmtWAPhone(phone)
  if (!fph) return

  const { data: cfgData } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('house_id', houseId)
    .limit(1)
    .single()

  const cfg = cfgData
  if (!cfg?.active) return
  if (type === 'checkin_confirm' && !cfg.send_checkin_confirm) return
  if (type === 'birthday_wish' && !cfg.send_birthday_wish) return
  if (type === 'event_invite' && !cfg.send_event_invite) return

  const { data: tmplData } = await supabase
    .from('whatsapp_templates')
    .select('body')
    .eq('house_id', houseId)
    .eq('type', type)
    .eq('active', true)
    .limit(1)
    .single()

  if (!tmplData?.body) return

  let msg = tmplData.body.replaceAll('{{name}}', name ?? '')
  Object.entries(extra).forEach(([k, v]) => { msg = msg.replaceAll(`{{${k}}}`, v) })

  try {
    const resp = await fetch(`${cfg.api_url}/message/sendText/${cfg.instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.api_key },
      body: JSON.stringify({ number: fph, text: msg }),
    })
    const res = await resp.json()
    await supabase.from('whatsapp_logs').insert({
      house_id: houseId, recipient_phone: fph, recipient_name: name,
      message_type: type, message_body: msg,
      status: res?.key ? 'sent' : 'failed',
      error_msg: res?.key ? null : JSON.stringify(res),
      related_client_id: clientId ?? null,
      related_event_id: eventId ?? null,
      sent_at: new Date().toISOString(),
    })
  } catch (err: any) {
    await supabase.from('whatsapp_logs').insert({
      house_id: houseId, recipient_phone: fph, recipient_name: name,
      message_type: type, message_body: msg, status: 'failed',
      error_msg: err.message, related_client_id: clientId ?? null,
      related_event_id: eventId ?? null,
    })
  }
}
