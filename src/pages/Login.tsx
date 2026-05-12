import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'

const INP: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: `1px solid #1e2736`,
  borderRadius: 10, padding: '12px 14px', color: '#f9fafb', fontSize: 15,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

function genCode(prefix: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let res = ''
  for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length))
  return `#${prefix}-${res}`
}

export function LoginPage({ onLogin }: { onLogin: (s: any) => void }) {
  const [tab, setTab] = useState<'login'|'register'>('login')
  const [regType, setRegType] = useState<'admin'|'colab'>('colab')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [houseName, setHouseName] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) { setError('Preencha e-mail e senha'); return }
    setLoading(true); setError('')

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr || !data.session) {
      setError('E-mail ou senha inválidos')
      setLoading(false); return
    }

    const uid = data.session.user.id
    const [profRes, houseRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('house_users').select('*,houses(*)').eq('user_id', uid).eq('is_active', true).limit(1).maybeSingle()
    ])

    onLogin({
      user: { ...data.session.user, full_name: profRes.data?.full_name, user_code: profRes.data?.user_code },
      house: houseRes.data ? houseRes.data.houses : null,
      role: houseRes.data ? houseRes.data.role : null,
    })
  }

  async function handleRegister() {
    if (!email || !password || !name) { setError('Preencha todos os campos obrigatórios'); return }
    if (regType === 'admin' && !houseName) { setError('Preencha o nome da casa'); return }
    setLoading(true); setError('')

    const { data, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr || !data.user) {
      setError(authErr?.message || 'Erro ao criar conta')
      setLoading(false); return
    }

    const uid = data.user.id
    const userCode = genCode('NP')
    
    // Create Profile
    const { error: profErr } = await supabase.from('profiles').insert({
      id: uid, email, full_name: name, user_code: userCode
    })
    if (profErr) { setError('Erro ao criar perfil'); setLoading(false); return }

    if (regType === 'admin') {
      const houseCode = genCode('HS')
      // Create House
      const { data: hData, error: hErr } = await supabase.from('houses').insert({
        name: houseName, house_code: houseCode
      }).select().single()
      if (hErr || !hData) { setError('Erro ao criar casa'); setLoading(false); return }

      // Link User to House as Super Admin
      await supabase.from('house_users').insert({
        house_id: hData.id, user_id: uid, role: 'super_admin'
      })

      onLogin({
        user: { id: uid, email, full_name: name, user_code: userCode },
        house: hData,
        role: 'super_admin',
      })
    } else {
      // Just colab, login without house
      onLogin({
        user: { id: uid, email, full_name: name, user_code: userCode },
        house: null,
        role: null,
      })
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: 20,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.brd}`, borderRadius: 20, padding: 36, maxWidth: 400, width: '100%',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8, color: C.acc }}><i className="bi bi-moon-stars" /></div>
          <h1 style={{ color: C.txt, fontWeight: 900, fontSize: 26, margin: 0 }}>NightPass</h1>
          <p style={{ color: C.mut, fontSize: 13, marginTop: 6 }}>Gestão inteligente para sua casa noturna</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, background: '#111827', padding: 4, borderRadius: 12 }}>
          <button onClick={() => { setTab('login'); setError('') }} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            background: tab === 'login' ? C.bg2 : 'transparent', color: tab === 'login' ? C.txt : C.mut,
          }}>Entrar</button>
          <button onClick={() => { setTab('register'); setError('') }} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            background: tab === 'register' ? C.bg2 : 'transparent', color: tab === 'register' ? C.txt : C.mut,
          }}>Criar Conta</button>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gap: 14 }}>
          {tab === 'register' && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                 <div onClick={() => setRegType('admin')} style={{ flex: 1, padding: 12, border: `1px solid ${regType==='admin'?C.acc:C.brd}`, borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: regType==='admin'?C.acc+'11':'transparent' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>🏢</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: regType==='admin'?C.acc:C.mut }}>Criar Casa</div>
                 </div>
                 <div onClick={() => setRegType('colab')} style={{ flex: 1, padding: 12, border: `1px solid ${regType==='colab'?C.acc:C.brd}`, borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: regType==='colab'?C.acc+'11':'transparent' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>👤</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: regType==='colab'?C.acc:C.mut }}>Sou Colaborador</div>
                 </div>
              </div>

              <div>
                <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>NOME COMPLETO</label>
                <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
              </div>
              
              {regType === 'admin' && (
                <div>
                  <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>NOME DA CASA DE SHOW</label>
                  <input style={INP} value={houseName} onChange={e => setHouseName(e.target.value)} placeholder="Ex: Club Night" />
                </div>
              )}
            </>
          )}

          <div>
            <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>E-MAIL</label>
            <input style={INP} type="email" value={email} autoFocus onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())} placeholder="seu@email.com" />
          </div>
          <div>
            <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>SENHA</label>
            <input style={INP} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())} placeholder="••••••••" />
          </div>

          {error && (
            <div style={{ background: '#f8717122', border: '1px solid #f8717144', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            onClick={tab === 'login' ? handleLogin : handleRegister} disabled={loading}
            style={{
              background: loading ? C.brd : `linear-gradient(135deg, #3b82f6, #1d4ed8)`, color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px', fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4,
            }}
          >
            {loading ? 'Aguarde...' : tab === 'login' ? <><i className="bi bi-box-arrow-in-right" /> Entrar</> : 'Criar Conta'}
          </button>
        </div>

        <p style={{ color: C.mut, fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          {tab === 'login' ? 'Acesso restrito a colaboradores autorizados' : 'Você receberá um código único ao finalizar o cadastro'}
        </p>
      </div>
    </div>
  )
}
