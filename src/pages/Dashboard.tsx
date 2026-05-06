import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'
import { Card, Toast, Btn } from '../components/ui'
import { cn, fmtCurrency, payColor, payLabel } from '../utils/format'
import { sT, type ToastState } from '../utils/toast'
import { sendWA } from '../utils/whatsapp'
import type { House } from '../types'

interface Props {
  house: House
  user: { id: string; email: string }
  role: string
}

interface Stats {
  clients: number
  events: number
  todayCount: number
  todayRev: number
  reservations: number
}

interface PayStat { k: string; v: number }
interface WeekDay { d: string; n: number; r: number }
interface HourData { h: number; n: number }
interface RecentCI {
  id: string
  created_at: string
  amount_cents: number
  payment_method: string
  clients?: { full_name: string } | { full_name: string }[]
  events?: { name: string } | { name: string }[]
}
interface UpcomingEvent { id: string; name: string; event_date: string; genre?: string }
interface DashRes {
  id: string
  name: string
  status: string
  expected_arrival?: string
  people_count?: number
  location?: string
}

const KPIS = (s: Stats) => [
  { icon: <i className="bi bi-people" />, label: 'Clientes', value: s.clients.toLocaleString('pt-BR'), color: C.acc },
  { icon: <i className="bi bi-calendar2-event" />, label: 'Eventos Ativos', value: s.events.toLocaleString('pt-BR'), color: C.mut },
  { icon: <i className="bi bi-check-circle" />, label: 'Check-ins Hoje', value: s.todayCount.toLocaleString('pt-BR'), color: C.grn },
  { icon: <i className="bi bi-cash-stack" />, label: 'Receita Hoje', value: fmtCurrency(s.todayRev), color: C.gold },
  { icon: <i className="bi bi-bookmark-check" />, label: 'Reservas Hoje', value: s.reservations.toLocaleString('pt-BR'), color: '#a78bfa' },
]

const PAY_METHODS = ['pix', 'cartao', 'dinheiro', 'cortesia', 'credito', 'debito']

export function DashboardPage({ house, user }: Props) {
  const [stats, setStats] = useState<Stats>({ clients: 0, events: 0, todayCount: 0, todayRev: 0, reservations: 0 })
  const [_hourly, setHourly] = useState<HourData[]>([])
  const [payStats, setPayStats] = useState<PayStat[]>([])
  const [recent, setRecent] = useState<RecentCI[]>([])
  const [_upcoming, setUpcoming] = useState<UpcomingEvent[]>([])
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [dashRes, setDashRes] = useState<DashRes[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)

  // Quick check-in state
  const [ciSrch, setCiSrch] = useState('')
  const [ciRes, setCiRes] = useState<Record<string, unknown> | null>(null)
  const [ciLoad, setCiLoad] = useState(false)
  const [ciEvs, setCiEvs] = useState<Array<{ id: string; name: string; event_date: string }>>([])
  const [ciSelEv, setCiSelEv] = useState('')
  const [ciPay, setCiPay] = useState('')
  const [ciPayMethod, setCiPayMethod] = useState('dinheiro')

  const chartRef = useRef<HTMLCanvasElement>(null)

  function load() {
    const today = new Date().toISOString().slice(0, 10)

    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('house_id', house.id)
      .then(rc => {
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('house_id', house.id)
          .then(re => {
            supabase.from('checkins').select('id,amount_cents,created_at,payment_method').eq('house_id', house.id).gte('created_at', today + 'T00:00:00')
              .then(ci => {
                const cins = ci.data ?? []
                const todayRev = cins.reduce((s, c) => s + (c.amount_cents ?? 0), 0)
                const hours: Record<number, number> = {}
                cins.forEach(c => { const hh = new Date(c.created_at).getHours(); hours[hh] = (hours[hh] ?? 0) + 1 })
                const ha: HourData[] = []
                for (let i = 20; i <= 23; i++) ha.push({ h: i, n: hours[i] ?? 0 })
                for (let i = 0; i <= 6; i++) ha.push({ h: i, n: hours[i] ?? 0 })
                setHourly(ha)
                setStats(p => ({ ...p, clients: rc.count ?? 0, events: re.count ?? 0, todayCount: cins.length, todayRev }))

                // Today's reservations — by reservation_date OR by event_id of today's events
                supabase.from('reservations').select('*')
                  .eq('house_id', house.id).eq('reservation_date', today).order('expected_arrival')
                  .then(rr => {
                    const rd = rr.data ?? []
                    setDashRes(rd)
                    setStats(p => ({ ...p, reservations: rd.length }))
                  })
              })

            // Payment breakdown
            supabase.from('checkins').select('payment_method,amount_cents').eq('house_id', house.id)
              .then(all => {
                const pm: Record<string, number> = {}
                ;(all.data ?? []).forEach(c => {
                  const k = c.payment_method ?? 'outros'
                  pm[k] = (pm[k] ?? 0) + (c.amount_cents ?? 0)
                })
                setPayStats(Object.entries(pm).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v))
              })
          })
      })

    // Recent check-ins
    supabase.from('checkins').select('id,created_at,amount_cents,payment_method,clients(full_name),events(name)')
      .eq('house_id', house.id).order('created_at', { ascending: false }).limit(8)
      .then(r => setRecent(r.data ?? []))

    // Upcoming events
    supabase.from('events').select('id,name,event_date,genre').eq('house_id', house.id)
      .gte('event_date', new Date().toISOString().slice(0, 10)).order('event_date').limit(4)
      .then(r => setUpcoming(r.data ?? []))

    // 30-day chart
    const d30 = new Date(); d30.setDate(d30.getDate() - 29)
    supabase.from('checkins').select('created_at,amount_cents').eq('house_id', house.id)
      .gte('created_at', d30.toISOString().slice(0, 10) + 'T00:00:00')
      .then(rw => {
        const byDay: Record<string, { n: number; r: number }> = {}
        ;(rw.data ?? []).forEach(c => {
          const day = c.created_at.slice(0, 10)
          if (!byDay[day]) byDay[day] = { n: 0, r: 0 }
          byDay[day].n++; byDay[day].r += (c.amount_cents ?? 0)
        })
        const arr: WeekDay[] = []
        for (let di = 29; di >= 0; di--) {
          const dt = new Date(); dt.setDate(dt.getDate() - di)
          const ds = dt.toISOString().slice(0, 10)
          arr.push({ d: ds, n: byDay[ds]?.n ?? 0, r: byDay[ds]?.r ?? 0 })
        }
        setWeekData(arr)
      })
  }

  function loadCIEvs() {
    supabase.from('events').select('id,name,event_date').eq('house_id', house.id)
      .eq('status', 'published').order('event_date', { ascending: false })
      .then(r => {
        if (r.data) {
          setCiEvs(r.data)
          const today = new Date().toISOString().slice(0, 10)
          const todayEv = r.data.find(ev => ev.event_date?.slice(0, 10) === today)
          if (todayEv) setCiSelEv(todayEv.id)
          else if (r.data.length > 0) setCiSelEv(r.data[0].id)
        }
      })
  }

  useEffect(() => {
    load()
    loadCIEvs()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [house.id])

  // Draw 30-day bar chart on canvas
  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas || !weekData.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.clientWidth || 600
    const H = 80
    canvas.width = W; canvas.height = H
    const max = Math.max(...weekData.map(d => d.n), 1)
    const bw = W / weekData.length - 2
    ctx.clearRect(0, 0, W, H)
    const today = new Date().toISOString().slice(0, 10)
    weekData.forEach((d, i) => {
      const bh = Math.max(2, (d.n / max) * (H - 16))
      const x = i * (bw + 2)
      const y = H - bh - 8
      ctx.fillStyle = d.d === today ? '#3b82f6' : '#1e2736'
      ctx.beginPath()
      ctx.roundRect(x, y, bw, bh, 3)
      ctx.fill()
    })
  }, [weekData])

  function doCI() {
    if (!ciSrch.trim()) return
    setCiLoad(true); setCiRes(null)
    const q = cn(ciSrch), isCPF = q.length === 11
    const isPhone = q.length >= 10 && q.length <= 11 && !isCPF
    const pr = isCPF
      ? supabase.from('clients').select('*').eq('house_id', house.id).eq('cpf', q).single()
      : isPhone
        ? supabase.from('clients').select('*').eq('house_id', house.id).eq('phone', q).single()
        : supabase.from('clients').select('*').eq('house_id', house.id).ilike('full_name', `%${ciSrch}%`).limit(1).single()
    pr.then(r => {
      setCiLoad(false)
      if (r.data) setCiRes(r.data)
      else sT(setToast, 'Cliente não encontrado', 'error')
    })
  }

  function confirmCI() {
    if (!ciRes) return
    if (!ciSelEv) { sT(setToast, 'Selecione um evento', 'error'); return }
    const cents = Math.round((parseFloat(ciPay) || 0) * 100)
    const client = ciRes as { id: string; full_name: string; phone?: string }
    supabase.from('checkins').insert({
      house_id: house.id, client_id: client.id, event_id: ciSelEv,
      payment_method: ciPayMethod, amount_cents: cents,
      operator_user_id: user.id, source: 'door', checkin_type: 'portaria',
    }).then(r => {
      if (r.error) { sT(setToast, 'Erro: ' + r.error.message, 'error'); return }
      sT(setToast, ` Check-in: ${client.full_name}`, 'success')
      sendWA(house.id, 'checkin_confirm', client.phone ?? '', client.full_name, {}, client.id, ciSelEv)
      setCiRes(null); setCiSrch(''); setCiPay(''); load()
    })
  }

  const kpis = KPIS(stats)
  const totalPay = payStats.reduce((s, p) => s + p.v, 0)
  const weekMax = Math.max(...weekData.map(d => d.n), 1)

  return (
    <div style={{ paddingBottom: 40 }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.txt, letterSpacing: '-0.02em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-speedometer2" style={{ color: C.acc }} /> Dashboard
          </h1>
          <p style={{ color: C.mut, fontSize: 14 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid-r" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="card-3d" style={{
            background: 'linear-gradient(160deg,rgba(20,28,46,0.98),rgba(10,14,26,0.99))',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(59,130,246,0.12)', borderTop: `3px solid ${kpi.color}`,
            borderRadius: 16, padding: '20px 22px',
            display: 'flex', flexDirection: 'column', gap: 12,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 16px rgba(0,0,0,0.6), 0 0 15px rgba(0,0,0,0.2)',
            transform: 'translateY(-3px)',
            transition: 'transform .3s cubic-bezier(.4,0,.2,1), box-shadow .3s cubic-bezier(.4,0,.2,1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: C.mut, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 20, color: kpi.color, opacity: 0.8, filter: `drop-shadow(0 0 10px ${kpi.color}aa)` }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ color: kpi.color, fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 15px ${kpi.color}88` }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 30-day chart */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-graph-up-arrow" style={{ color: C.mut }} /> Check-ins — 30 dias
          </div>
          <canvas ref={chartRef} style={{ width: '100%', height: 80 }} />
          <div style={{ display: 'flex', gap: 4, marginTop: 8, overflowX: 'auto' }}>
            {weekData.slice(-7).map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ background: d.n > 0 ? C.acc : C.brd, borderRadius: 4, height: Math.max(4, (d.n / weekMax) * 48), marginBottom: 4, transition: 'height .3s' }} />
                <div style={{ fontSize: 10, color: C.mut }}>{new Date(d.d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                <div style={{ fontSize: 11, color: C.txt, fontWeight: 600 }}>{d.n}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment breakdown */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-credit-card" style={{ color: C.mut }} /> Formas de pagamento
          </div>
          {payStats.slice(0, 5).map((ps, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: payColor(ps.k) }} />
                  <span style={{ color: C.sub, fontSize: 13 }}>{payLabel(ps.k)}</span>
                </div>
                <span style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>{fmtCurrency(ps.v)}</span>
              </div>
              <div style={{ background: C.brd, borderRadius: 4, height: 4, overflow: 'hidden' }}>
                <div style={{ background: payColor(ps.k), height: '100%', width: `${(ps.v / (totalPay || 1)) * 100}%`, transition: 'width .5s', borderRadius: 4 }} />
              </div>
            </div>
          ))}
          {totalPay > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.brd}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: C.mut, fontSize: 13 }}>Total do dia</span>
              <span style={{ color: C.gold, fontSize: 15, fontWeight: 900 }}>{fmtCurrency(stats.todayRev)}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Recent check-ins */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-door-open" style={{ color: C.acc }} /> Últimos Check-ins
          </div>
          {recent.length === 0
            ? <div style={{ color: C.mut, fontSize: 13 }}>Nenhum check-in hoje</div>
            : recent.map((ci, i) => (
              <div key={ci.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < recent.length - 1 ? `1px solid ${C.brd}` : 'none' }}>
                <div>
                  <div style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>
                    {(ci.clients as { full_name?: string })?.full_name ?? 'Visitante'}
                  </div>
                  <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>
                    há {Math.floor((Date.now() - new Date(ci.created_at).getTime()) / 60000)} min · {fmtCurrency(ci.amount_cents)}
                  </div>
                </div>
                <span style={{ background: payColor(ci.payment_method) + '22', color: payColor(ci.payment_method), border: `1px solid ${payColor(ci.payment_method)}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                  {payLabel(ci.payment_method)}
                </span>
              </div>
            ))
          }
        </Card>

        {/* Today's reservations */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-bookmark-check" style={{ color: '#a78bfa' }} /> Reservas do dia
          </div>
          {dashRes.length === 0
            ? <div style={{ color: C.mut, fontSize: 13 }}>Sem reservas hoje</div>
            : dashRes.slice(0, 4).map((r, i) => (
              <div key={r.id || i} style={{ padding: '9px 0', borderBottom: i < dashRes.length - 1 ? `1px solid ${C.brd}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <span style={{
                    background: r.status === 'confirmed' ? C.grn + '22' : C.gold + '22',
                    color: r.status === 'confirmed' ? C.grn : C.gold,
                    border: `1px solid ${r.status === 'confirmed' ? C.grn : C.gold}44`,
                    borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                  }}>
                    {r.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>
                {r.expected_arrival && (
                  <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>{r.expected_arrival.slice(0, 5)} · {r.people_count ?? 0} pessoas</div>
                )}
              </div>
            ))
          }
        </Card>

        {/* Quick check-in */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.txt, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-lightning-charge" style={{ color: C.gold }} /> Check-in Rápido
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className="inp-glass"
              value={ciSrch}
              onChange={e => setCiSrch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doCI()}
              placeholder="CPF, celular ou nome"
              style={{ flex: 1 }}
            />
            <Btn onClick={doCI} disabled={ciLoad} small><i className="bi bi-search" /></Btn>
          </div>
          {ciRes && (() => {
            const c = ciRes as { id: string; full_name: string; phone?: string }
            return (
              <div>
                <div style={{ background: C.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ color: C.txt, fontWeight: 700, fontSize: 14 }}>{c.full_name}</div>
                </div>
                <select className="inp-glass" value={ciSelEv} onChange={e => setCiSelEv(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}>
                  {ciEvs.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input className="inp-glass" value={ciPay} onChange={e => setCiPay(e.target.value)} placeholder="R$ valor" style={{ flex: 1 }} />
                  <select className="inp-glass" value={ciPayMethod} onChange={e => setCiPayMethod(e.target.value)}>
                    {PAY_METHODS.map(m => <option key={m} value={m}>{payLabel(m)}</option>)}
                  </select>
                </div>
                <Btn onClick={confirmCI} style={{ width: '100%' }}><i className="bi bi-check2-circle" /> Confirmar Check-in</Btn>
              </div>
            )
          })()}
        </Card>
      </div>
    </div>
  )
}
