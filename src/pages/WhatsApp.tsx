import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'
import { Card, Btn } from '../components/ui'
import { _err, _succ, type ToastState } from '../utils/toast'
import { fmtWAPhone } from '../utils/whatsapp'
import type { House, WhatsAppConfig } from '../types'

interface Props { house: House }
interface Template { id?: string; type: string; body: string; active: boolean; house_id: string }
interface Log { id: string; status: string; recipient_phone: string; message_type: string; message_body: string; created_at: string }

const WDEF: WhatsAppConfig = { house_id: '', instance_name: '', api_url: '', api_key: '', active: false, send_checkin_confirm: true, send_birthday_wish: true, send_event_invite: false }
const TMPL_LABELS: Record<string, string> = { checkin_confirm: ' Confirmação de Check-in', birthday_wish: ' Mensagem de Aniversário', event_invite: ' Convite de Evento' }

export function WhatsAppPage({ house }: Props) {
  const [cfg, setCfg] = useState<WhatsAppConfig | null>(null)
  const [tmpls, setTmpls] = useState<Template[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [et, setEt] = useState<Template | null>(null)
  const [toast, _setToast] = useState<ToastState | null>(null)

  function load() {
    supabase.from('whatsapp_config').select('*').eq('house_id', house.id).limit(1)
      .then(r => setCfg(r.data?.length ? r.data[0] : { ...WDEF, house_id: house.id }))
    supabase.from('whatsapp_templates').select('*').eq('house_id', house.id).order('type')
      .then(r => setTmpls(r.data ?? []))
    supabase.from('whatsapp_logs').select('*').eq('house_id', house.id).order('created_at', { ascending: false }).limit(30)
      .then(r => setLogs(r.data ?? []))
  }

  useEffect(() => { load() }, [house.id])

  async function testConn() {
    if (!cfg?.api_url || !cfg.instance_name || !cfg.api_key) { _err('Preencha API URL, Instance Name e API Key'); return }
    if (!testPhone) { _err('Digite um telefone para teste'); return }
    const fph = fmtWAPhone(testPhone)
    if (!fph) { _err('Telefone inválido'); return }
    setTesting(true)
    try {
      const res = await fetch(`${cfg.api_url}/message/sendText/${cfg.instance_name}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.api_key },
        body: JSON.stringify({ number: fph, text: ' NightPass conectado! Sua integração WhatsApp está funcionando.' }),
      }).then(r => r.json())
      if (res?.key) _succ(' Mensagem enviada! WhatsApp conectado.')
      else _err('Falha: ' + JSON.stringify(res))
    } catch (e: unknown) { _err('Erro: ' + (e instanceof Error ? e.message : 'desconhecido')) }
    setTesting(false)
  }

  function saveCfg() {
    if (!cfg) return
    setSaving(true)
    const data = { ...cfg, house_id: house.id, updated_at: new Date().toISOString() }
    const q = cfg.id ? supabase.from('whatsapp_config').update(data).eq('id', cfg.id) : supabase.from('whatsapp_config').insert(data)
    q.then(r => { setSaving(false); if (!r.error) load(); else _err(r.error.message) })
  }

  function saveTmpl() {
    if (!et) return
    const data = { ...et, house_id: house.id, updated_at: new Date().toISOString() }
    const q = et.id ? supabase.from('whatsapp_templates').update(data).eq('id', et.id) : supabase.from('whatsapp_templates').insert(data)
    q.then(r => { if (!r.error) { setEt(null); load() } else _err(r.error.message) })
  }

  if (!cfg) return <div style={{ padding: 40, color: C.mut }}>Carregando...</div>

  const inp = { style: { width: '100%', background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, padding: '8px 12px', color: C.txt, fontSize: 13, minHeight: 40, fontFamily: 'inherit', boxSizing: 'border-box' as const } }

  return (
    <div style={{ maxWidth: 800, paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.grn + '22', color: C.grn, borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 700, zIndex: 1100 }}>{toast.msg}</div>}

      <h1 style={{ fontSize: 26, fontWeight: 900, color: C.txt, marginBottom: 20 }}> WhatsApp</h1>

      {/* Config */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ color: C.txt, fontWeight: 700, fontSize: 15 }}>️ Configuração — Evolution API</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!cfg.active} onChange={e => setCfg(p => p ? { ...p, active: e.target.checked } : p)} style={{ width: 16, height: 16 }} />
            <span style={{ color: cfg.active ? C.grn : C.mut, fontSize: 13, fontWeight: 600 }}>{cfg.active ? 'Ativo' : 'Inativo'}</span>
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {([['instance_name', 'Instance Name', 'minha-instancia'], ['api_url', 'API URL', 'https://api.example.com'], ['api_key', 'API Key', 'sua-chave-secreta']] as const).map(([field, label, placeholder]) => (
            <div key={field} style={{ gridColumn: field === 'api_key' ? '1 / -1' : undefined }}>
              <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
              <input {...inp} type={field === 'api_key' ? 'password' : 'text'} value={(cfg as unknown as Record<string, unknown>)[field] as string ?? ''} placeholder={placeholder}
                onChange={e => setCfg(p => p ? { ...p, [field]: e.target.value } : p)} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['send_checkin_confirm', 'send_birthday_wish', 'send_event_invite'] as const).map(key => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.mut, fontSize: 13 }}>
              <input type="checkbox" checked={!!cfg[key]} onChange={e => setCfg(p => p ? { ...p, [key]: e.target.checked } : p)} />
              {key === 'send_checkin_confirm' ? 'Check-in' : key === 'send_birthday_wish' ? 'Aniversário' : 'Evento'}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Telefone para teste</label>
            <input {...inp} type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="11999999999" />
          </div>
          <Btn onClick={testConn} disabled={testing} variant="secondary"> {testing ? 'Testando...' : 'Testar Conexão'}</Btn>
          <Btn onClick={saveCfg} disabled={saving}> {saving ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </Card>

      {/* Templates */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: C.txt, fontWeight: 700, fontSize: 15, marginBottom: 4 }}> Templates de Mensagem</div>
        <div style={{ color: C.mut, fontSize: 12, marginBottom: 16 }}>Variáveis: {'{{name}} {{date}} {{event}} {{house}}'}</div>
        {Object.keys(TMPL_LABELS).map(type => {
          const t = tmpls.find(x => x.type === type) ?? { type, body: '', active: true, house_id: house.id }
          const isEd = et?.type === type
          return (
            <div key={type} style={{ borderBottom: `1px solid ${C.brd}`, paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: C.acc, fontSize: 12, fontWeight: 600 }}>{TMPL_LABELS[type]}</span>
                {!isEd && <Btn onClick={() => setEt({ ...t })} small variant="ghost">️ Editar</Btn>}
              </div>
              {isEd ? (
                <div>
                  <textarea value={et.body} rows={4} onChange={e => setEt(p => p ? { ...p, body: e.target.value } : p)}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.acc}`, borderRadius: 8, padding: '8px 10px', color: C.txt, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <Btn onClick={saveTmpl} small> Salvar</Btn>
                    <Btn onClick={() => setEt(null)} small variant="ghost">Cancelar</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ background: C.bg, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: t.body ? C.txt : C.mut, whiteSpace: 'pre-wrap' as const }}>
                  {t.body || '(sem template)'}
                </div>
              )}
            </div>
          )
        })}
      </Card>

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <div style={{ color: C.txt, fontWeight: 700, fontSize: 15, marginBottom: 12 }}> Mensagens Recentes</div>
          {logs.map((lg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.brd}` }}>
              <span style={{ color: lg.status === 'sent' ? C.grn : C.red, fontSize: 11, width: 50, flexShrink: 0, fontWeight: 700 }}>{lg.status}</span>
              <span style={{ color: C.mut, fontSize: 12, width: 110, flexShrink: 0 }}>{lg.recipient_phone}</span>
              <span style={{ color: C.mut, fontSize: 12, width: 100, flexShrink: 0 }}>{lg.message_type}</span>
              <span style={{ flex: 1, color: C.txt, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{lg.message_body}</span>
              <span style={{ color: C.mut, fontSize: 10, flexShrink: 0 }}>{lg.created_at.slice(0, 10)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
