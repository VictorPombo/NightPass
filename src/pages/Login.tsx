import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../constants/theme'

const INP: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: `1px solid #1e2736`,
  borderRadius: 10, padding: '12px 14px', color: '#f9fafb', fontSize: 15,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

export function LoginPage({ onLogin }: { onLogin: (s: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    // Load house and role
    const uid = data.session.user.id
    const { data: hu } = await supabase
      .from('house_users')
      .select('house_id, role, houses(*)')
      .eq('user_id', uid)
      .limit(1)
      .single()

    if (!hu) {
      setError('Usuário sem casa configurada. Contate o administrador.')
      await supabase.auth.signOut()
      setLoading(false); return
    }

    onLogin({
      user: data.session.user,
      house: hu.houses,
      role: hu.role,
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: 20,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.brd}`,
        borderRadius: 20, padding: 36, maxWidth: 400, width: '100%',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8, color: C.acc }}><i className="bi bi-moon-stars" /></div>
          <h1 style={{ color: C.txt, fontWeight: 900, fontSize: 26, margin: 0 }}>NightPass</h1>
          <p style={{ color: C.mut, fontSize: 13, marginTop: 6 }}>Gestão inteligente para sua casa noturna</p>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>
              E-MAIL
            </label>
            <input
              style={INP} type="email" value={email} autoFocus
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>
              SENHA
            </label>
            <input
              style={INP} type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: '#f8717122', border: '1px solid #f8717144',
              borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin} disabled={loading}
            style={{
              background: loading ? C.brd : `linear-gradient(135deg, #3b82f6, #1d4ed8)`,
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px', fontSize: 16, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', marginTop: 4,
            }}
          >
            {loading ? 'Entrando...' : <><i className="bi bi-box-arrow-in-right" /> Entrar</>}
          </button>
        </div>

        <p style={{ color: C.mut, fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          Acesso restrito a colaboradores autorizados
        </p>
      </div>
    </div>
  )
}
