import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setChecked(true); return }
      const uid = data.session.user.id
      const [profRes, houseRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('house_users').select('*,houses(*)').eq('user_id', uid).eq('is_active', true).single()
      ])
      if (houseRes.data) {
        setSession({
          user: { id: uid, email: data.session.user.email ?? '', full_name: profRes.data?.full_name },
          house: houseRes.data.houses as any,
          role: houseRes.data.role,
        })
      }
      setChecked(true)
    })
  }, [])

  return { session, setSession, checked }
}
