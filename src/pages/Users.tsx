import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, RC, RL } from '../constants/theme'
import { Card, Toast, Btn, Modal, Pill } from '../components/ui'
import { sT, _err, type ToastState } from '../utils/toast'
import { fd } from '../utils/format'
import type { House } from '../types'

interface Props { house: House; user: { id: string; email: string }; role: string }

interface HouseUser {
  id: string; user_id: string; role: string; is_active: boolean; created_at: string
  profiles?: { full_name?: string; email?: string }
}

const ROLES = ['super_admin', 'admin', 'door', 'finance', 'promoter', 'manager']

export function UsersPage({ house, user }: Props) {
  const [users, setUsers] = useState<HouseUser[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)
  const st2 = (m: string, t: 'success' | 'error' | 'warn' | 'info' = 'success') => sT(m, t, setToast)

  const [ldg, setLdg] = useState(true)
  const [editing, setEditing] = useState<HouseUser | null>(null)
  const [editRole, setEditRole] = useState('admin')
  
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteRole, setInviteRole] = useState('manager')

  function load() {
    if (!house) return
    supabase.from('house_users').select('*,profiles(full_name,email)').eq('house_id', house.id).order('created_at')
      .then(r => { setLdg(false); if (r.error) st2(r.error.message, 'error'); else setUsers(r.data ?? []) })
  }

  useEffect(() => { load() }, [house.id])

  function toggleActive(hu: HouseUser) {
    supabase.from('house_users').update({ is_active: !hu.is_active }).eq('id', hu.id)
      .then(r => { if (!r.error) load(); else st2(r.error.message, 'error') })
  }

  function saveRole() {
    if (!editing) return
    supabase.from('house_users').update({ role: editRole }).eq('id', editing.id)
      .then(r => {
        if (!r.error) { setEditing(null); load(); st2('Papel atualizado!', 'success') }
        else st2(r.error.message, 'error')
      })
  }

  async function sendInvite() {
    if (!inviteCode.trim()) { st2('Digite o código do usuário', 'warn'); return }
    
    // Find user by code
    const { data: prof, error: profErr } = await supabase.from('profiles').select('id, full_name').eq('user_code', inviteCode.trim()).single()
    if (profErr || !prof) { st2('Usuário não encontrado com este código', 'error'); return }
    
    // Check if already in house
    const { data: ext } = await supabase.from('house_users').select('id').eq('house_id', house.id).eq('user_id', prof.id).maybeSingle()
    if (ext) { st2('Usuário já está na equipe', 'warn'); return }

    // Check if invite exists
    const { data: inv } = await supabase.from('house_invites').select('id').eq('house_id', house.id).eq('user_id', prof.id).eq('status', 'pending').maybeSingle()
    if (inv) { st2('Convite já enviado e pendente', 'warn'); return }

    // Create invite
    const { error } = await supabase.from('house_invites').insert({
      house_id: house.id,
      user_id: prof.id,
      role: inviteRole
    })

    if (error) st2('Erro ao enviar convite: ' + error.message, 'error')
    else {
      st2(`Convite enviado para ${prof.full_name || 'Usuário'}!`, 'success')
      setInviteModal(false)
      setInviteCode('')
    }
  }

  if (ldg) return <div style={{ padding: 60, textAlign: 'center', color: C.mut }}>Carregando...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <Toast toast={toast} />

      {/* Modal Convidar */}
      <Modal open={inviteModal} title="Convidar Membro" onClose={() => setInviteModal(false)}>
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ color: C.sub, fontSize: 13, margin: 0 }}>Peça para o novo membro criar uma conta de Colaborador na tela inicial e lhe passar o <strong>Código de Usuário</strong> dele.</p>
          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 6 }}>CÓDIGO DO USUÁRIO (#NP-...)</label>
            <input className="inp-glass" placeholder="#NP-A1B2" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 6 }}>PAPEL NA CASA</label>
            <select className="inp-glass" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{RL[r] ?? r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={sendInvite} style={{ flex: 1 }}> Enviar Convite</Btn>
            <Btn onClick={() => setInviteModal(false)} variant="ghost">Cancelar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal open={!!editing} title="Alterar Papel" onClose={() => setEditing(null)}>
        {editing && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ color: C.txt, fontWeight: 700 }}>{(editing.profiles as { full_name?: string })?.full_name ?? 'Usuário'}</div>
            <div>
              <label style={{ fontSize: 12, color: C.mut, fontWeight: 600, display: 'block', marginBottom: 6 }}>PAPEL</label>
              <select className="inp-glass" value={editRole} onChange={e => setEditRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{RL[r] ?? r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={saveRole} style={{ flex: 1 }}><i className="bi bi-check2-circle" /> Salvar</Btn>
              <Btn onClick={() => setEditing(null)} variant="ghost">Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: C.txt, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-people" style={{ color: C.acc }} /> Usuários
          </h1>
          <p style={{ color: C.mut, fontSize: 14 }}>{users.length} membros da equipe</p>
        </div>
        <Btn onClick={() => setInviteModal(true)}>+ Convidar</Btn>
      </div>

      <Card>
        {users.map((hu, i) => {
          const prof = hu.profiles as { full_name?: string; email?: string } | undefined
          const isSelf = hu.user_id === user.id
          return (
            <div key={hu.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < users.length - 1 ? `1px solid ${C.brd}` : 'none', opacity: hu.is_active ? 1 : 0.5 }}>
              <div style={{ width: 38, height: 38, borderRadius: 19, background: (RC[hu.role] ?? C.mut) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: RC[hu.role] ?? C.mut }}>
                <i className="bi bi-person-fill" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: C.txt, fontWeight: 700, fontSize: 14 }}>{prof?.full_name ?? prof?.email ?? 'Usuário'}</span>
                  {isSelf && <span style={{ color: C.acc, fontSize: 11, fontWeight: 600 }}>(você)</span>}
                </div>
                <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>{prof?.email} · desde {fd(hu.created_at)}</div>
              </div>
              <Pill color={RC[hu.role] ?? C.mut} small>{RL[hu.role] ?? hu.role}</Pill>
              <div style={{ display: 'flex', gap: 6 }}>
                {!isSelf && <Btn onClick={() => { setEditing(hu); setEditRole(hu.role) }} variant="ghost" small><i className="bi bi-pencil" /> Papel</Btn>}
                {!isSelf && (
                  <Btn onClick={() => toggleActive(hu)} variant={hu.is_active ? 'danger' : 'secondary'} small>
                    <i className={hu.is_active ? "bi bi-lock" : "bi bi-unlock"} /> {hu.is_active ? 'Desativar' : 'Ativar'}
                  </Btn>
                )}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
