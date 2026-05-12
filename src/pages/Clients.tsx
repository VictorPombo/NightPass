import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'
import { Card, Toast, Btn, Modal, FAB } from '../components/ui'
import { cn, fcpf, ftel, fd, fmtCurrency, loyalTier, validCPF, validPhone, validEmail } from '../utils/format'
import { sT, _err, type ToastState } from '../utils/toast'
import type { House, Client } from '../types'

interface Props { house: House; user: { id: string; email: string }; role: string }

const EMPTY_FORM = { full_name: '', cpf: '', phone: '', birth_date: '', email: '', photo_url: '' }

// ── Birthday types ─────────────────────────────────────────────────────────
interface ClientWithDays extends Client { daysUntil: number }

// ── Clients tab ─────────────────────────────────────────────────────────────
export function ClientsPage({ house, user }: Props) {
  const [tab, setTab] = useState<'clientes' | 'aniversarios'>('clientes')
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<Client | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [ldg, setLdg] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Handlers de Upload ──
  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!house || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `clients/${house.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('event-flyers').upload(path, file, { upsert: true })
      if (error) {
        sT(setToast, 'Erro no upload: ' + error.message, 'error')
        return
      }
      const { data } = supabase.storage.from('event-flyers').getPublicUrl(path)
      setForm(p => ({ ...p, photo_url: data.publicUrl }))
      sT(setToast, 'Foto enviada com sucesso!', 'success')
    } catch (err: any) {
      sT(setToast, 'Erro ao processar arquivo.', 'error')
    } finally {
      setUploading(false)
    }
  }
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [ciCounts, setCiCounts] = useState<Record<string, number>>({})
  const [histClient, setHistClient] = useState<Client | null>(null)
  const [histData, setHistData] = useState<unknown[]>([])

  // Birthday state
  const [bdClients, setBdClients] = useState<ClientWithDays[]>([])
  const [bdDays, setBdDays] = useState('30')
  const [bdFilter, setBdFilter] = useState<'all' | 'week' | 'month'>('all')
  const [bdLoading, setBdLoading] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)

  const load = useCallback(() => {
    if (!house) return
    let q = supabase.from('clients').select('*', { count: 'exact' }).eq('house_id', house.id).order('full_name')
    if (search) q = q.or(`full_name.ilike.%${search}%,cpf.ilike.%${cn(search)}%,phone.ilike.%${cn(search)}%`)
    q = q.range(page * 30, page * 30 + 29)
    q.then(r => {
      setLdg(false); setTotal(r.count ?? 0); setClients(r.data ?? [])
      supabase.from('checkins').select('client_id').eq('house_id', house.id).then(rc => {
        const m: Record<string, number> = {}
        ;(rc.data ?? []).forEach(ci => { if (ci.client_id) m[ci.client_id] = (m[ci.client_id] ?? 0) + 1 })
        setCiCounts(m)
      })
    })
  }, [house, search, page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    setPage(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // Load birthdays when tab changes or days filter changes
  useEffect(() => {
    if (tab !== 'aniversarios') return
    setBdLoading(true)
    supabase.from('clients').select('*').eq('house_id', house.id).not('birth_date', 'is', null)
      .then(r => {
        const now = new Date()
        const d = parseInt(bdDays)
        const list = (r.data ?? []).map(c => {
          const bd = new Date((c.birth_date ?? '') + 'T00:00:00')
          let ty = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
          if (ty < now) ty = new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate())
          const diff = Math.ceil((ty.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return { ...c, daysUntil: diff }
        }).filter(c => c.daysUntil <= d).sort((a, b) => a.daysUntil - b.daysUntil)
        setBdClients(list)
        setBdLoading(false)
      })
  }, [tab, house.id, bdDays])

  function openHistory(c: Client) {
    setHistClient(c)
    supabase.from('checkins').select('created_at,amount_cents,payment_method,events(name)')
      .eq('house_id', house.id).eq('client_id', c.id).order('created_at', { ascending: false }).limit(20)
      .then(r => setHistData(r.data ?? []))
  }

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  function openEdit(c: Client) { setEditing(c); setForm({ full_name: c.full_name, cpf: c.cpf ?? '', phone: c.phone ?? '', birth_date: c.birth_date ?? '', email: c.email ?? '', photo_url: c.photo_url ?? '' }); setModal(true) }

  async function save() {
    if (saving) return
    if (!form.full_name.trim()) { sT(setToast, 'Nome obrigatório', 'error'); return }
    const cpfClean = cn(form.cpf)
    const phoneClean = cn(form.phone)
    if (cpfClean && !validCPF(cpfClean)) { sT(setToast, 'CPF inválido. Verifique os dígitos.', 'error'); return }
    if (phoneClean && !validPhone(phoneClean)) { sT(setToast, 'Telefone inválido. Use DDD + número.', 'error'); return }
    if (form.email && !validEmail(form.email)) { sT(setToast, 'E-mail inválido.', 'error'); return }
    setSaving(true)
    try {
      // Check duplicates (skip for edits on same record)
      if (cpfClean) {
        let dq = supabase.from('clients').select('id,full_name').eq('house_id', house.id).eq('cpf', cpfClean)
        if (editing) dq = dq.neq('id', editing.id)
        const { data: dup } = await dq.maybeSingle()
        if (dup) { sT(setToast, `CPF já cadastrado para: ${dup.full_name}`, 'error'); setSaving(false); return }
      }
      if (phoneClean) {
        let dq = supabase.from('clients').select('id,full_name').eq('house_id', house.id).eq('phone', phoneClean)
        if (editing) dq = dq.neq('id', editing.id)
        const { data: dup } = await dq.maybeSingle()
        if (dup) { sT(setToast, `Telefone já cadastrado para: ${dup.full_name}`, 'error'); setSaving(false); return }
      }
      const data = { full_name: form.full_name, cpf: cpfClean || null, phone: phoneClean || null, birth_date: form.birth_date || null, email: form.email || null, photo_url: form.photo_url || null, house_id: house.id, status: 'ativo', created_by: user.id }
      const q = editing ? supabase.from('clients').update(data).eq('id', editing.id) : supabase.from('clients').insert(data)
      const r = await q
      if (r.error) { sT(setToast, 'Erro: ' + r.error.message, 'error'); return }
      sT(setToast, editing ? '✅ Cliente atualizado!' : '✅ Cliente cadastrado!', 'success')
      setModal(false); load()
    } catch (err: any) {
      sT(setToast, 'Erro de conexão. Tente novamente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function del(c: Client) {
    if (!confirm(`Remover ${c.full_name}?`)) return
    supabase.from('clients').delete().eq('id', c.id).then(r => {
      if (r.error) { _err(r.error.message); return }
      sT(setToast, 'Cliente removido', 'success'); load()
    })
  }

  function sendBdWA(c: ClientWithDays) {
    const ph = cn(c.phone ?? '')
    if (!ph) { sT(setToast, 'Sem telefone cadastrado', 'warn'); return }
    const nome = c.full_name.split(' ')[0]
    const msg = ` Feliz Aniversário, ${nome}! \n\nQue seu dia seja repleto de alegria e celebração! \n\nCom carinho, ${house.name || 'NightPass'}`
    window.open(`https://wa.me/55${ph}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function sendAllBdWA() {
    const withPhone = filteredBd.filter(c => c.phone)
    if (withPhone.length === 0) { sT(setToast, 'Nenhum com telefone', 'warn'); return }
    if (!confirm(`Enviar mensagem de aniversário para ${withPhone.length} pessoa(s)?`)) return
    setSendingAll(true)
    for (const c of withPhone) {
      sendBdWA(c)
      await new Promise(r => setTimeout(r, 800))
    }
    setSendingAll(false)
    sT(setToast, ` ${withPhone.length} mensagens abertas!`, 'success')
  }

  const now = new Date()
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6)

  const filteredBd = bdClients.filter(c => {
    if (bdFilter === 'week') {
      const bd = new Date((c.birth_date ?? '') + 'T00:00:00')
      const ty = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
      return ty >= startOfWeek && ty <= endOfWeek
    }
    if (bdFilter === 'month') {
      const bd = new Date((c.birth_date ?? '') + 'T00:00:00')
      return bd.getMonth() === now.getMonth()
    }
    return true
  })

  const dayLabel = (d: number) => d === 0 ? ' Hoje!' : d === 1 ? ' Amanhã' : `Em ${d} dias`
  const dayColor = (d: number) => d === 0 ? C.red : d <= 3 ? C.gold : C.mut

  const inp = (style?: React.CSSProperties) => ({ style: { width: '100%', background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, padding: '10px 12px', color: C.txt, fontSize: 14, minHeight: 44, fontFamily: 'inherit', boxSizing: 'border-box' as const, ...style } })

  return (
    <div style={{ paddingBottom: 80 }}>
      <Toast toast={toast} />

      {/* History Modal */}
      {histClient && (
        <Modal open title={`Histórico — ${histClient.full_name}`} onClose={() => setHistClient(null)} wide>
          {histData.length === 0
            ? <div style={{ color: C.mut, fontSize: 14 }}>Nenhum check-in registrado</div>
            : (histData as Array<{ created_at: string; amount_cents: number; payment_method: string; events?: { name: string } }>).map((ci, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.brd}` }}>
                <span style={{ color: C.txt, fontSize: 13 }}>{ci.events?.name ?? 'Entrada livre'}</span>
                <span style={{ color: C.mut, fontSize: 12 }}>{fd(ci.created_at.slice(0, 10))} · {fmtCurrency(ci.amount_cents)}</span>
              </div>
            ))
          }
        </Modal>
      )}

      {/* New/Edit Modal */}
      <Modal open={modal} title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.brd, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              {(form as any).photo_url
                ? <img src={(form as any).photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : ''}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Foto do Cliente</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="client-photo-upload"
                  style={{ display: 'none' }}
                  onChange={uploadPhoto}
                />
                <button
                  onClick={() => document.getElementById('client-photo-upload')?.click()}
                  disabled={uploading}
                  style={{ background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, padding: '8px 12px', color: C.txt, fontSize: 13, cursor: uploading ? 'wait' : 'pointer' }}
                >
                  {uploading ? 'Enviando...' : 'Escolher Arquivo'}
                </button>
                {form.photo_url && <span style={{ fontSize: 12, color: C.grn }}>✓ Arquivo anexado</span>}
              </div>
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>Nome Completo *</label>
            <input {...inp()} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nome completo" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>CPF</label>
              <input {...inp()} value={fcpf(form.cpf)} onChange={e => setForm(p => ({ ...p, cpf: cn(e.target.value).slice(0, 11) }))} placeholder="000.000.000-00" /></div>
            <div><label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>Celular</label>
              <input {...inp()} value={ftel(form.phone)} onChange={e => setForm(p => ({ ...p, phone: cn(e.target.value).slice(0, 11) }))} placeholder="(00) 00000-0000" /></div>
          </div>
          <div><label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>E-mail (opcional)</label>
            <input {...inp()} type="email" value={(form as any).email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
          <div><label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>Nascimento</label>
            <input type="date" {...inp()} value={form.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? '⏳ Salvando...' : '💾 Salvar'}</Btn>
            <Btn onClick={() => setModal(false)} variant="ghost" disabled={saving}>Cancelar</Btn>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: C.txt, marginBottom: 4 }}> Clientes</h1>
          <p style={{ color: C.mut, fontSize: 14 }}>{total.toLocaleString('pt-BR')} clientes cadastrados</p>
        </div>
        {tab === 'clientes' && <Btn onClick={openNew} icon="+">Novo Cliente</Btn>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['clientes', ' Clientes'], ['aniversarios', ' Aniversários']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${tab === id ? C.acc : C.brd}`, background: tab === id ? C.acc + '22' : 'transparent', color: tab === id ? C.acc : C.mut, fontSize: 14, fontWeight: tab === id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {label}
            {id === 'aniversarios' && bdClients.length > 0 && (
              <span style={{ marginLeft: 8, background: C.gold, color: '#000', borderRadius: 8, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{bdClients.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── CLIENTES TAB ── */}
      {tab === 'clientes' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, CPF ou celular..."
              style={{ flex: 1, background: C.card, border: `1px solid ${C.brd}`, borderRadius: 10, padding: '10px 14px', color: C.txt, fontSize: 14, minHeight: 44, fontFamily: 'inherit' }} />
          </div>
          <Card>
            {ldg
              ? <div style={{ color: C.mut, textAlign: 'center', padding: 40 }}>Carregando...</div>
              : clients.length === 0
                ? <div style={{ color: C.mut, textAlign: 'center', padding: 40 }}>Nenhum cliente encontrado</div>
                : clients.map((c, i) => {
                  const count = ciCounts[c.id] ?? 0
                  const tier = loyalTier(count)
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < clients.length - 1 ? `1px solid ${C.brd}` : 'none' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.acc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden', border: `2px solid ${tier.color}44` }}>
                        {c.photo_url
                          ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          : tier.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.txt, fontWeight: 700, fontSize: 14 }}>{c.full_name}</div>
                        <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>
                          {c.cpf ? fcpf(c.cpf) : ''}{c.cpf && c.phone ? ' · ' : ''}{c.phone ? ftel(c.phone) : ''}
                          {c.birth_date ? ` ·  ${fd(c.birth_date)}` : ''}
                          {c.email ? ` · ${c.email}` : ''}
                        </div>
                      </div>
                      <span style={{ color: tier.color, fontSize: 12, fontWeight: 600, background: tier.color + '18', padding: '3px 8px', borderRadius: 8, flexShrink: 0 }}>
                        {count} visitas
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {c.phone && (
                          <a href={`https://wa.me/55${cn(c.phone ?? '')}`} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', background: '#25D36622', color: '#25D366', border: '1px solid #25D36644', borderRadius: 8, padding: '6px 10px', fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>
                            
                          </a>
                        )}
                        <Btn onClick={() => openHistory(c)} variant="ghost" small></Btn>
                        <Btn onClick={() => openEdit(c)} variant="ghost" small>️</Btn>
                        <Btn onClick={() => del(c)} variant="danger" small></Btn>
                      </div>
                    </div>
                  )
                })
            }
            {total > 30 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', marginTop: 12, borderTop: `1px solid ${C.brd}` }}>
                <Btn onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="secondary" small>← Anterior</Btn>
                <span style={{ color: C.mut, fontSize: 13 }}>{page * 30 + 1}–{Math.min(page * 30 + 30, total)} de {total}</span>
                <Btn onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 30 >= total} variant="secondary" small>Próximo →</Btn>
              </div>
            )}
          </Card>
          <FAB onClick={openNew} icon="+" title="Novo cliente" />
        </>
      )}

      {/* ── ANIVERSÁRIOS TAB ── */}
      {tab === 'aniversarios' && (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={bdDays} onChange={e => setBdDays(e.target.value)}
              style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 10, padding: '8px 14px', color: C.txt, fontSize: 14, minHeight: 44, fontFamily: 'inherit' }}>
              {['7', '14', '30', '60', '90'].map(d => <option key={d} value={d}>Próximos {d} dias</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['all', ' Todos'], ['week', ' Esta Semana'], ['month', '️ Este Mês']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setBdFilter(id)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${bdFilter === id ? C.gold : C.brd}`, background: bdFilter === id ? C.gold + '22' : 'transparent', color: bdFilter === id ? C.gold : C.mut, fontSize: 12, fontWeight: bdFilter === id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <Btn onClick={sendAllBdWA} disabled={sendingAll || filteredBd.filter(c => c.phone).length === 0}
              style={{ background: '#25D36622', color: '#25D366', border: '1px solid #25D36644' }}>
              {sendingAll ? ' Enviando...' : ` Enviar para todos (${filteredBd.filter(c => c.phone).length})`}
            </Btn>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Hoje', value: bdClients.filter(c => c.daysUntil === 0).length, color: C.red, icon: '' },
              { label: 'Esta semana', value: bdClients.filter(c => c.daysUntil <= 7).length, color: C.gold, icon: '' },
              { label: `${bdDays} dias`, value: bdClients.length, color: C.acc, icon: '' },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ color: s.color, fontWeight: 900, fontSize: 24, marginTop: 4 }}>{s.value}</div>
                <div style={{ color: C.mut, fontSize: 11, fontWeight: 600 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* List */}
          {bdLoading
            ? <div style={{ color: C.mut, textAlign: 'center', padding: 40 }}>Carregando...</div>
            : filteredBd.length === 0
              ? <Card><div style={{ color: C.mut, textAlign: 'center', padding: 40 }}>Nenhum aniversariante no período</div></Card>
              : <Card>
                {filteredBd.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < filteredBd.length - 1 ? `1px solid ${C.brd}` : 'none' }}>
                    <div style={{ fontSize: 28, flexShrink: 0 }}>{c.daysUntil === 0 ? '' : ''}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.txt, fontWeight: 700, fontSize: 14 }}>{c.full_name}</div>
                      <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>
                         {fd(c.birth_date ?? '')}
                        {c.phone ? ` ·  ${ftel(c.phone)}` : ' · Sem telefone'}
                      </div>
                    </div>
                    <span style={{ color: dayColor(c.daysUntil), fontWeight: 700, fontSize: 13, flexShrink: 0, background: dayColor(c.daysUntil) + '18', padding: '3px 10px', borderRadius: 8 }}>
                      {dayLabel(c.daysUntil)}
                    </span>
                    {c.phone && (
                      <a href={`https://wa.me/55${cn(c.phone ?? '')}`} target="_blank" rel="noreferrer"
                        onClick={e => { e.preventDefault(); sendBdWA(c) }}
                        style={{ display: 'inline-flex', alignItems: 'center', background: '#25D36622', color: '#25D366', border: '1px solid #25D36644', borderRadius: 8, padding: '6px 12px', fontSize: 12, textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>
                         WA
                      </a>
                    )}
                  </div>
                ))}
              </Card>
          }
        </>
      )}
    </div>
  )
}
