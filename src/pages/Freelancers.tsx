import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'
import { Card, Toast, Btn, Modal, Pill, FAB } from '../components/ui'
import { fmtCurrency, cn } from '../utils/format'
import { sT, type ToastState } from '../utils/toast'
import type { House, Freelancer, WorkType } from '../types'

interface Props { house: House }

const WORK_TYPES: { value: WorkType; label: string; icon: string; color: string }[] = [
  { value: 'limpeza',         label: 'Limpeza',          icon: '', color: '#60a5fa' },
  { value: 'cozinha',         label: 'Cozinha',          icon: '‍', color: '#f59e0b' },
  { value: 'servicos_gerais', label: 'Serv. Gerais',     icon: '', color: '#8b5cf6' },
  { value: 'garcom',          label: 'Garçom',           icon: '️', color: '#10b981' },
  { value: 'cumim',           label: 'Cumim',            icon: '', color: '#06b6d4' },
  { value: 'recepcao',        label: 'Recepção',         icon: '', color: '#ec4899' },
  { value: 'atendente',       label: 'Atendente',        icon: '️', color: '#f87171' },
  { value: 'seguranca',       label: 'Segurança',        icon: '️', color: '#64748b' },
]

const WORK_MAP = Object.fromEntries(WORK_TYPES.map(w => [w.value, w]))

const DEF = {
  full_name: '', address: '', phone: '', pix_key: '',
  daily_rate_cents: '', work_types: [] as WorkType[], notes: '', status: 'ativo',
}

export function FreelancersPage({ house }: Props) {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<typeof DEF>({ ...DEF })
  const [editing, setEditing] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [ldg, setLdg] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<WorkType | 'all'>('all')

  function st2(m: string, t?: string) { sT(setToast, m, t as 'success' | 'error' | 'warn') }

  function load() {
    if (!house) return
    supabase.from('freelancers').select('*').eq('house_id', house.id).order('full_name')
      .then(r => {
        setLdg(false)
        if (r.error) st2('Erro: ' + r.error.message, 'error')
        else setFreelancers(r.data as Freelancer[])
      })
  }

  useEffect(() => { load() }, [house.id])

  function openNew() { setEditing(null); setForm({ ...DEF }); setModal(true) }

  function openEdit(fr: Freelancer) {
    setEditing(fr.id)
    setForm({
      full_name: fr.full_name,
      address: fr.address ?? '',
      phone: fr.phone ?? '',
      pix_key: fr.pix_key ?? '',
      daily_rate_cents: fr.daily_rate_cents ? String(fr.daily_rate_cents / 100) : '',
      work_types: fr.work_types ?? [],
      notes: fr.notes ?? '',
      status: fr.status,
    })
    setModal(true)
  }

  function toggleWorkType(wt: WorkType) {
    setForm(p => ({
      ...p,
      work_types: p.work_types.includes(wt)
        ? p.work_types.filter(w => w !== wt)
        : [...p.work_types, wt],
    }))
  }

  function save() {
    if (!form.full_name.trim()) { st2('Nome obrigatório', 'warn'); return }
    if (form.work_types.length === 0) { st2('Selecione pelo menos um tipo de trabalho', 'warn'); return }
    const data = {
      house_id: house.id,
      full_name: form.full_name.trim(),
      address: form.address || null,
      phone: form.phone || null,
      pix_key: form.pix_key || null,
      daily_rate_cents: form.daily_rate_cents ? Math.round(parseFloat(form.daily_rate_cents) * 100) : null,
      work_types: form.work_types,
      notes: form.notes || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    }
    const q = editing
      ? supabase.from('freelancers').update(data).eq('id', editing)
      : supabase.from('freelancers').insert(data)
    q.then(r => {
      if (r.error) st2('Erro: ' + r.error.message, 'error')
      else { st2(editing ? 'Atualizado!' : 'Freelancer cadastrado!'); setModal(false); load() }
    })
  }

  function toggleStatus(fr: Freelancer) {
    const ns = fr.status === 'ativo' ? 'inativo' : 'ativo'
    supabase.from('freelancers').update({ status: ns }).eq('id', fr.id)
      .then(r => { if (!r.error) load(); else st2(r.error.message, 'error') })
  }

  function del(id: string) {
    if (!confirm('Remover este freelancer?')) return
    supabase.from('freelancers').delete().eq('id', id)
      .then(r => { if (r.error) st2(r.error.message, 'error'); else { st2('Removido!'); load() } })
  }

  const filtered = freelancers.filter(fr => {
    const matchSearch = !search || fr.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (fr.phone ?? '').includes(search)
    const matchType = filterType === 'all' || (fr.work_types ?? []).includes(filterType)
    return matchSearch && matchType
  })

  const inp = { style: { width: '100%', background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, padding: '8px 12px', color: C.txt, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const } }

  if (ldg) return <div style={{ padding: 60, textAlign: 'center', color: C.mut }}>Carregando...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <Toast toast={toast} />

      {/* Form modal */}
      <Modal open={modal} title={editing ? 'Editar Freelancer' : 'Novo Freelancer'} onClose={() => { setModal(false); setEditing(null) }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nome completo *</label>
            <input {...inp} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="João da Silva" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Celular</label>
              <input {...inp} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor por dia (R$)</label>
              <input type="number" step="0.01" min="0" {...inp} value={form.daily_rate_cents} onChange={e => setForm(p => ({ ...p, daily_rate_cents: e.target.value }))} placeholder="150,00" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Endereço</label>
            <input {...inp} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
          </div>

          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Chave PIX</label>
            <input {...inp} value={form.pix_key} onChange={e => setForm(p => ({ ...p, pix_key: e.target.value }))} placeholder="CPF, email, telefone ou chave aleatória" />
          </div>

          {/* Tipos de trabalho */}
          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 8 }}>Tipos de trabalho *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {WORK_TYPES.map(wt => {
                const selected = form.work_types.includes(wt.value)
                return (
                  <button key={wt.value} onClick={() => toggleWorkType(wt.value)}
                    style={{
                      background: selected ? wt.color + '22' : C.bg,
                      color: selected ? wt.color : C.mut,
                      border: `1px solid ${selected ? wt.color : C.brd}`,
                      borderRadius: 8, padding: '6px 12px', fontSize: 12,
                      fontWeight: selected ? 700 : 400, cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}>
                    {wt.icon} {wt.label}
                  </button>
                )
              })}
              {form.work_types.filter(wt => !WORK_MAP[wt]).map(wt => (
                <button key={wt} onClick={() => toggleWorkType(wt)}
                  style={{
                    background: C.mut + '22', color: C.mut, border: `1px solid ${C.mut}`,
                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}>
                  {wt}
                </button>
              ))}
              <input
                style={{ background: C.bg, border: `1px dashed ${C.brd}`, borderRadius: 8, padding: '6px 10px', color: C.txt, fontSize: 12, width: 140 }}
                placeholder="+ Função (Enter)"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = e.currentTarget.value.trim()
                    if (v && !form.work_types.includes(v as any)) {
                      setForm(p => ({ ...p, work_types: [...p.work_types, v as any] }))
                    }
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observações</label>
            <textarea {...inp} style={{ ...inp.style, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Experiência, disponibilidade..." />
          </div>

          {editing && (
            <div>
              <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 4 }}>Status</label>
              <select {...inp} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} style={{ flex: 1 }}> Salvar</Btn>
            <Btn onClick={() => { setModal(false); setEditing(null) }} variant="ghost">Cancelar</Btn>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ color: C.txt, fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}> Freelancers</h1>
          <div style={{ color: C.mut, fontSize: 13, marginTop: 4 }}>{freelancers.filter(f => f.status === 'ativo').length} ativos</div>
        </div>
        <Btn onClick={openNew} icon="+">Novo Freelancer</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 10, padding: '8px 14px', color: C.txt, fontSize: 13, flex: '1 1 200px', fontFamily: 'inherit' }}
          placeholder=" Buscar por nome ou telefone..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterType('all')}
            style={{ background: filterType === 'all' ? C.acc + '22' : 'transparent', color: filterType === 'all' ? C.acc : C.mut, border: `1px solid ${filterType === 'all' ? C.acc : C.brd}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterType === 'all' ? 700 : 400 }}>
            Todos
          </button>
          {WORK_TYPES.map(wt => (
            <button key={wt.value} onClick={() => setFilterType(wt.value === filterType ? 'all' : wt.value)}
              style={{ background: filterType === wt.value ? wt.color + '22' : 'transparent', color: filterType === wt.value ? wt.color : C.mut, border: `1px solid ${filterType === wt.value ? wt.color : C.brd}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterType === wt.value ? 700 : 400 }}>
              {wt.icon} {wt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista em linha */}
      <Card>
        {filtered.length === 0
          ? <div style={{ color: C.mut, textAlign: 'center', padding: 32 }}>Nenhum freelancer encontrado</div>
          : filtered.map((fr, i) => (
            <div key={fr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${C.brd}` : 'none', opacity: fr.status === 'inativo' ? 0.55 : 1 }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.acc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.txt, fontWeight: 700, fontSize: 14 }}>{fr.full_name}</div>
                <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>
                  {fr.phone ? ` ${fr.phone}` : ''}
                  {fr.phone && fr.pix_key ? ' · ' : ''}
                  {fr.pix_key ? ` PIX: ${fr.pix_key}` : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {(fr.work_types ?? []).map(wt => {
                    const meta = WORK_MAP[wt] || { label: wt, color: C.mut, icon: '' }
                    if (!meta) return null
                    return (
                      <span key={wt} style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}44`, borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>
                        {meta.icon} {meta.label}
                      </span>
                    )
                  })}
                </div>
              </div>
              {/* Rate + status */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {fr.daily_rate_cents ? (
                  <div style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}>{fmtCurrency(fr.daily_rate_cents)}<span style={{ color: C.mut, fontSize: 10, fontWeight: 400 }}>/dia</span></div>
                ) : null}
                <Pill color={fr.status === 'ativo' ? C.grn : C.mut} small>{fr.status}</Pill>
              </div>
              {/* Ações */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {fr.phone && (
                  <a href={`https://wa.me/55${cn(fr.phone)}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', background: '#25D36622', color: '#25D366', border: '1px solid #25D36644', borderRadius: 8, padding: '6px 10px', fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>
                    
                  </a>
                )}
                <Btn onClick={() => openEdit(fr)} small variant="ghost">️</Btn>
                <Btn onClick={() => toggleStatus(fr)} small variant="ghost">
                  {fr.status === 'ativo' ? '' : ''}
                </Btn>
                <Btn onClick={() => del(fr.id)} small variant="danger"></Btn>
              </div>
            </div>
          ))
        }
      </Card>

      <FAB onClick={openNew} icon="+" title="Novo freelancer" />
    </div>
  )
}
