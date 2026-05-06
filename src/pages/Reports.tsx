import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'
import { Card, Btn } from '../components/ui'
import { fd, fmtCurrency } from '../utils/format'
import type { House } from '../types'

interface Props { house: House }
interface Stats { c: number; ch: number; ev: number; td: number }
interface TopClient { name: string; phone: string; count: number }
interface FinEv { id: string; name: string; date: string; total: number; count: number; methods: Record<string, number> }
interface EvPnL {
  id: string; name: string; date: string
  rev_checkins: number; rev_tickets: number
  cost_artist: number; cost_freelancers: number; cost_promoters: number
  cost_res_items: number; cost_production: number; cost_consumacao: number
}

export function ReportsPage({ house }: Props) {
  const [stats, setStats] = useState<Stats>({ c: 0, ch: 0, ev: 0, td: 0 })
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [exporting, setExporting] = useState(false)
  const [finEvList, setFinEvList] = useState<FinEv[]>([])
  const [evPnL, setEvPnL] = useState<EvPnL[]>([])
  const [pnlLoading, setPnlLoading] = useState(false)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartRef2 = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!house) return
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      supabase.from('clients').select('id', { count: 'exact' }).eq('house_id', house.id),
      supabase.from('checkins').select('id', { count: 'exact' }).eq('house_id', house.id),
      supabase.from('events').select('id', { count: 'exact' }).eq('house_id', house.id),
      supabase.from('checkins').select('id', { count: 'exact' }).eq('house_id', house.id).gte('created_at', today + 'T00:00:00'),
    ]).then(r => setStats({ c: r[0].count ?? 0, ch: r[1].count ?? 0, ev: r[2].count ?? 0, td: r[3].count ?? 0 }))

    supabase.from('checkins').select('client_id,clients(full_name,phone)').eq('house_id', house.id)
      .then(r => {
        const map: Record<string, TopClient> = {}
        ;(r.data ?? []).forEach(ci => {
          const id = ci.client_id; if (!id) return
          if (!map[id]) map[id] = { name: (ci.clients as { full_name?: string })?.full_name ?? '?', phone: (ci.clients as { phone?: string })?.phone ?? '', count: 0 }
          map[id].count++
        })
        setTopClients(Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10))
      })

    supabase.from('checkins').select('event_id,amount_cents,payment_method,events(name,event_date)').eq('house_id', house.id)
      .then(r => {
        const evMap: Record<string, FinEv> = {}
        ;(r.data ?? []).forEach(ci => {
          const eid = ci.event_id; if (!eid) return
          if (!evMap[eid]) evMap[eid] = { id: eid, name: (ci.events as { name?: string })?.name ?? 'Sem evento', date: (ci.events as { event_date?: string })?.event_date ?? '', total: 0, count: 0, methods: {} }
          evMap[eid].total += (ci.amount_cents ?? 0); evMap[eid].count++
          const m = ci.payment_method ?? 'dinheiro'; evMap[eid].methods[m] = (evMap[eid].methods[m] ?? 0) + (ci.amount_cents ?? 0)
        })
        setFinEvList(Object.values(evMap).sort((a, b) => b.total - a.total))
      })
  }, [house.id])

  // Revenue chart
  useEffect(() => {
    const canvas = chartRef.current; if (!canvas || !finEvList.length) return
    if (typeof window.Chart === 'undefined') return
    const existing = window.Chart.getChart(canvas); if (existing) existing.destroy()
    new window.Chart(canvas, {
      type: 'bar',
      data: { labels: finEvList.slice(0, 8).map(e => e.name.slice(0, 14)), datasets: [{ label: 'Receita', data: finEvList.slice(0, 8).map(e => e.total / 100), backgroundColor: 'rgba(59,130,246,0.7)', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 6 }] },
      options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => 'R$ ' + Number(ctx.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } } }, scales: { x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#6b7280', callback: (v: number) => 'R$ ' + Number(v).toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.04)' } } } },
    })
  }, [finEvList])

  // Top clients chart
  useEffect(() => {
    const canvas = chartRef2.current; if (!canvas || !topClients.length) return
    if (typeof window.Chart === 'undefined') return
    const existing = window.Chart.getChart(canvas); if (existing) existing.destroy()
    new window.Chart(canvas, {
      type: 'bar',
      data: { labels: topClients.slice(0, 8).map(c => c.name.split(' ')[0]), datasets: [{ label: 'Check-ins', data: topClients.slice(0, 8).map(c => c.count), backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10b981', borderWidth: 2, borderRadius: 6 }] },
      options: { indexAxis: 'y' as const, responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } } } },
    })
  }, [topClients])

  async function loadPnL() {
    setPnlLoading(true)
    const { data: evs } = await supabase.from('events').select('id,name,event_date,artist_fee_cents,artist_fee_type,artist_fee_percent,consumption_cents,production_cost_cents').eq('house_id', house.id).neq('status', 'cancelado').order('event_date', { ascending: false }).limit(20)
    if (!evs?.length) { setPnlLoading(false); return }

    const results = await Promise.all(evs.map(async ev => {
      const [ci, tk, fr, pl, ri] = await Promise.all([
        supabase.from('checkins').select('amount_cents').eq('house_id', house.id).eq('event_id', ev.id),
        supabase.from('ticket_orders').select('amount_cents').eq('house_id', house.id).eq('event_id', ev.id),
        supabase.from('event_freelancers').select('freelancers(daily_rate_cents)').eq('event_id', ev.id),
        supabase.from('promoter_lists').select('id,fixed_fee_cents,min_entries,entry_fee_cents,consumacao_cents').eq('event_id', ev.id),
        supabase.from('reservation_items').select('quantity,unit_cost_cents,reservations!inner(event_id)').eq('reservations.event_id', ev.id),
      ])
      const rev_checkins = (ci.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0)
      const rev_tickets = (tk.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0)
      const cost_freelancers = (fr.data ?? []).reduce((s, r) => s + ((r.freelancers as { daily_rate_cents?: number } | null)?.daily_rate_cents ?? 0), 0)
      const cost_promoters = await (async () => {
        let total = 0
        for (const l of (pl.data ?? [])) {
          const { count } = await supabase.from('promoter_list_guests').select('id', { count: 'exact', head: true }).eq('list_id', l.id)
          const ent = Math.max(count ?? 0, l.min_entries ?? 0)
          total += (l.fixed_fee_cents ?? 0) + ent * (l.entry_fee_cents ?? 0) + ent * (l.consumacao_cents ?? 0)
        }
        return total
      })()
      const cost_res_items = (ri.data ?? []).reduce((s, r) => s + (r.quantity ?? 1) * (r.unit_cost_cents ?? 0), 0)
      return {
        id: ev.id, name: ev.name, date: ev.event_date,
        rev_checkins, rev_tickets,
        cost_artist: ev.artist_fee_cents ?? 0,
        cost_freelancers, cost_promoters, cost_res_items,
        cost_production: ev.production_cost_cents ?? 0,
        cost_consumacao: ev.consumption_cents ?? 0,
      } as EvPnL
    }))
    setEvPnL(results)
    setPnlLoading(false)
  }

  function exportPnLCSV() {
    const hdr = 'Evento,Data,Receita Portaria,Receita Ingressos,Receita Total,Cachê,Freelancers,Promoters,Opcionais,Produção,Consumação,Custo Total,Resultado'
    const lines = evPnL.map(e => {
      const rev = e.rev_checkins + e.rev_tickets
      const cost = e.cost_artist + e.cost_freelancers + e.cost_promoters + e.cost_res_items + e.cost_production + e.cost_consumacao
      return [e.name, e.date, e.rev_checkins/100, e.rev_tickets/100, rev/100, e.cost_artist/100, e.cost_freelancers/100, e.cost_promoters/100, e.cost_res_items/100, e.cost_production/100, e.cost_consumacao/100, cost/100, (rev-cost)/100]
        .map(v => typeof v === 'number' ? v.toFixed(2).replace('.', ',') : `"${v}"`).join(';')
    })
    const csv = hdr + '\n' + lines.join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'pnl-eventos.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportCSV() {
    setExporting(true)
    supabase.from('checkins').select('created_at,clients(full_name,phone,cpf),events(name)').eq('house_id', house.id).order('created_at', { ascending: false })
      .then(r => {
        setExporting(false)
        const hdr = 'Data,Cliente,CPF,Telefone,Evento'
        const lines = (r.data ?? []).map(ci => {
          const cl = ci.clients as { full_name?: string; cpf?: string; phone?: string } | undefined
          const ev = ci.events as { name?: string } | undefined
          return [ci.created_at?.slice(0, 16).replace('T', ' '), cl?.full_name ?? '', cl?.cpf ?? '', cl?.phone ?? '', ev?.name ?? '']
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        })
        const csv = hdr + '\n' + lines.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'checkins.csv'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
  }

  function exportClients() {
    setExporting(true)
    supabase.from('clients').select('full_name,cpf,phone,birth_date,status,created_at').eq('house_id', house.id).order('full_name')
      .then(r => {
        setExporting(false)
        const hdr = 'Nome,CPF,Telefone,Nascimento,Status,Cadastro'
        const lines = (r.data ?? []).map(c => [c.full_name, c.cpf ?? '', c.phone ?? '', c.birth_date ?? '', c.status, c.created_at?.slice(0, 10)].map(v => `"${v}"`).join(','))
        const csv = hdr + '\n' + lines.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
  }

  const kpis = [
    { label: 'Total Clientes', value: stats.c.toLocaleString('pt-BR'), color: C.acc },
    { label: 'Total Check-ins', value: stats.ch.toLocaleString('pt-BR'), color: C.grn },
    { label: 'Eventos', value: stats.ev.toLocaleString('pt-BR'), color: C.gold },
    { label: 'Check-ins Hoje', value: stats.td.toLocaleString('pt-BR'), color: '#a78bfa' },
  ]

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: C.txt, marginBottom: 4 }}> Relatórios</h1>
      <p style={{ color: C.mut, fontSize: 14, marginBottom: 20 }}>Análise de desempenho</p>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Btn onClick={exportCSV} disabled={exporting}>{exporting ? 'Exportando...' : ' Check-ins CSV'}</Btn>
        <Btn onClick={exportClients} disabled={exporting}> Clientes CSV</Btn>
        {evPnL.length > 0 && <Btn onClick={exportPnLCSV} variant="secondary"> P&L CSV</Btn>}
        <Btn onClick={() => window.print()} variant="secondary">️ Imprimir / PDF</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card-3d" style={{ background: 'linear-gradient(160deg,rgba(20,28,46,0.98),rgba(10,14,26,0.99))', border: '1px solid rgba(59,130,246,0.12)', borderTop: `3px solid ${k.color}`, borderRadius: 16, padding: '18px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 4px 8px rgba(0,0,0,0.35), 0 16px 32px rgba(0,0,0,0.5)', transform: 'translateY(-3px)' }}>
            <div style={{ color: C.mut, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── DRE por Evento ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.txt }}> DRE por Evento</div>
            <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>Receita vs. Custo vs. Resultado — últimos 20 eventos</div>
          </div>
          <Btn onClick={loadPnL} disabled={pnlLoading} variant="secondary" small>
            {pnlLoading ? ' Carregando...' : ' Carregar'}
          </Btn>
        </div>

        {evPnL.length === 0 && !pnlLoading && (
          <div style={{ color: C.mut, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Clique em "Carregar" para gerar o relatório financeiro por evento.</div>
        )}

        {evPnL.length > 0 && (
          <>
            {/* Summary KPIs */}
            {(() => {
              const totRev = evPnL.reduce((s, e) => s + e.rev_checkins + e.rev_tickets, 0)
              const totCost = evPnL.reduce((s, e) => s + e.cost_artist + e.cost_freelancers + e.cost_promoters + e.cost_res_items + e.cost_production + e.cost_consumacao, 0)
              const totProfit = totRev - totCost
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Receita Total', value: fmtCurrency(totRev), color: C.grn },
                    { label: 'Custo Total', value: fmtCurrency(totCost), color: C.red },
                    { label: 'Resultado', value: fmtCurrency(totProfit), color: totProfit >= 0 ? C.grn : C.red },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.bg, border: `1px solid ${k.color}33`, borderTop: `3px solid ${k.color}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ color: C.mut, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>{k.label.toUpperCase()}</div>
                      <div style={{ color: k.color, fontSize: 22, fontWeight: 900 }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px 90px', gap: 4, padding: '6px 8px', background: C.bg, borderRadius: 8, marginBottom: 6 }}>
              {['Evento', 'Receita', 'Custos', 'Resultado', 'Margem', ''].map((h, i) => (
                <div key={i} style={{ color: C.mut, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>

            {evPnL.map(e => {
              const rev = e.rev_checkins + e.rev_tickets
              const cost = e.cost_artist + e.cost_freelancers + e.cost_promoters + e.cost_res_items + e.cost_production + e.cost_consumacao
              const profit = rev - cost
              const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0
              const isProfit = profit >= 0
              return (
                <div key={e.id} style={{ borderBottom: `1px solid ${C.brd}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px 90px', gap: 4, padding: '10px 8px', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ color: C.mut, fontSize: 11 }}>{fd(e.date)}</div>
                    </div>
                    <div style={{ color: C.grn, fontWeight: 600, fontSize: 13, textAlign: 'right' }}>{fmtCurrency(rev)}</div>
                    <div style={{ color: C.red, fontWeight: 600, fontSize: 13, textAlign: 'right' }}>{fmtCurrency(cost)}</div>
                    <div style={{ color: isProfit ? C.grn : C.red, fontWeight: 800, fontSize: 13, textAlign: 'right' }}>{isProfit ? '+' : ''}{fmtCurrency(profit)}</div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: (isProfit ? C.grn : C.red) + '22', color: isProfit ? C.grn : C.red, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                        {margin}%
                      </span>
                    </div>
                    {/* Mini cost breakdown on expand */}
                    <div />
                  </div>
                  {/* Cost breakdown sub-row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 8px 8px', fontSize: 11 }}>
                    {e.cost_artist > 0 && <span style={{ color: C.gold }}> {fmtCurrency(e.cost_artist)}</span>}
                    {e.cost_freelancers > 0 && <span style={{ color: C.acc }}> {fmtCurrency(e.cost_freelancers)}</span>}
                    {e.cost_promoters > 0 && <span style={{ color: '#a78bfa' }}> {fmtCurrency(e.cost_promoters)}</span>}
                    {e.cost_res_items > 0 && <span style={{ color: C.gold }}>🪑 {fmtCurrency(e.cost_res_items)}</span>}
                    {e.cost_production > 0 && <span style={{ color: '#8b5cf6' }}> {fmtCurrency(e.cost_production)}</span>}
                    {e.cost_consumacao > 0 && <span style={{ color: '#f59e0b' }}> {fmtCurrency(e.cost_consumacao)}</span>}
                    {e.rev_tickets > 0 && <span style={{ color: C.grn }}>️ Ingressos: {fmtCurrency(e.rev_tickets)}</span>}
                    {e.rev_checkins > 0 && <span style={{ color: C.grn }}> Portaria: {fmtCurrency(e.rev_checkins)}</span>}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </Card>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 12 }}> Receita por Evento</div>
          {finEvList.length > 0 && <div style={{ marginBottom: 16 }}><canvas ref={chartRef} height={200} /></div>}
          {finEvList.slice(0, 6).map((ev, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.brd}` }}>
              <div>
                <div style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>{ev.name}</div>
                <div style={{ color: C.mut, fontSize: 11 }}>{fd(ev.date)} · {ev.count} check-ins</div>
              </div>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}>{fmtCurrency(ev.total)}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 12 }}> Top Clientes</div>
          {topClients.length > 0 && <div style={{ marginBottom: 16 }}><canvas ref={chartRef2} height={200} /></div>}
          {topClients.slice(0, 8).map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.brd}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.mut, fontSize: 12, width: 20 }}>#{i + 1}</span>
                <span style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
              </div>
              <span style={{ color: C.grn, fontWeight: 700, fontSize: 13 }}>{c.count} visitas</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// Augment window for Chart.js loaded via CDN
declare global {
  interface Window {
    Chart: {
      getChart: (canvas: HTMLCanvasElement) => { destroy: () => void } | undefined
      new (canvas: HTMLCanvasElement, config: unknown): unknown
    }
  }
}
