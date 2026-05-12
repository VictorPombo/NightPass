import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'
import { Btn, Toast } from '../components/ui'
import { sT, type ToastState } from '../utils/toast'

export function InvitesPage({ user, onHouseSelected }: { user: any, onHouseSelected: () => void }) {
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const st2 = (m: string, t: 'success' | 'error' | 'warn' = 'success') => sT(setToast, m, t)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('house_invites')
      .select('*, houses(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
    if (error) st2('Erro ao carregar convites: ' + error.message, 'error')
    else setInvites(data || [])
    setLoading(false)
  }

  async function accept(inv: any) {
    // Insert into house_users
    const { error: insErr } = await supabase.from('house_users').insert({
      house_id: inv.house_id,
      user_id: user.id,
      role: inv.role
    })
    if (insErr) { st2('Erro ao aceitar convite', 'error'); return }

    // Update invite status
    await supabase.from('house_invites').update({ status: 'accepted' }).eq('id', inv.id)
    onHouseSelected() // reload session
  }

  async function reject(inv: any) {
    await supabase.from('house_invites').update({ status: 'rejected' }).eq('id', inv.id)
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Toast toast={toast} />
      <div style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 20, padding: 36, maxWidth: 450, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 8, color: C.acc }}>👋</div>
        <h1 style={{ color: C.txt, fontWeight: 900, fontSize: 22, margin: 0 }}>Olá, {user.full_name}</h1>
        <p style={{ color: C.sub, fontSize: 13, marginTop: 6, marginBottom: 24 }}>Seu código de colaborador: <strong style={{ color: C.acc, background: C.acc+'22', padding: '2px 8px', borderRadius: 6 }}>{user.user_code}</strong></p>

        {loading ? (
          <div style={{ color: C.mut, padding: 20 }}>Carregando convites...</div>
        ) : invites.length === 0 ? (
          <div style={{ background: C.bg2, border: `1px dashed ${C.brd}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <p style={{ color: C.mut, fontSize: 14, margin: 0 }}>Você não tem convites pendentes.</p>
            <p style={{ color: C.sub, fontSize: 12, marginTop: 10 }}>Passe seu código de colaborador para o administrador da casa de show.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, textAlign: 'left', marginBottom: 20 }}>
            {invites.map(inv => (
              <div key={inv.id} style={{ background: C.bg2, border: `1px solid ${C.brd}`, borderRadius: 12, padding: 16 }}>
                <div style={{ color: C.txt, fontWeight: 700, fontSize: 15 }}>{inv.houses?.name}</div>
                <div style={{ color: C.mut, fontSize: 12, marginBottom: 12 }}>Função: {inv.role}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Btn onClick={() => accept(inv)} style={{ flex: 1 }}>Aceitar</Btn>
                  <Btn onClick={() => reject(inv)} variant="danger" style={{ flex: 1 }}>Recusar</Btn>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: 'none', color: C.mut, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Sair da conta</button>
      </div>
    </div>
  )
}
