import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fix() {
  const email = 'teste@gmail.com'
  const password = '123456'

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
  if (loginError) {
    console.error('Erro ao fazer login:', loginError.message)
    return
  }
  const userId = loginData.user.id
  console.log('Login feito. User ID:', userId)

  const { data: profile, error: profErr } = await supabase.from('profiles').insert([{ id: userId, email: email, full_name: 'Teste' }]).select().single()
  
  const { data: house } = await supabase.from('houses').select('*').eq('slug', 'demo').single()
  
  if (house) {
    await supabase.from('house_users').insert([{ house_id: house.id, user_id: userId, role: 'super_admin' }])
    console.log('Vinculado!')
  } else {
    const { data: newHouse } = await supabase.from('houses').insert([{ name: 'NightPass Demo', slug: 'demo2' }]).select().single()
    await supabase.from('house_users').insert([{ house_id: newHouse.id, user_id: userId, role: 'super_admin' }])
    console.log('Criada casa e vinculado!')
  }
}

fix()
