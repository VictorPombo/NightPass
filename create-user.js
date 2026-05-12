import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAccess() {
  const email = 'teste@gmail.com'
  const password = '123456'

  console.log('Criando usuário...')
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    console.error('Erro ao criar usuário (pode já existir):', authError.message)
    // Try logging in to get the user ID if it already exists
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      console.error('Erro ao fazer login:', loginError.message)
      return
    }
    console.log('Usuário já existia e login foi feito.')
    return await setupHouse(loginData.user.id)
  }

  console.log('Usuário criado com sucesso!', authData.user?.id)
  if (authData.user) {
    await setupHouse(authData.user.id)
  }
}

async function setupHouse(userId) {
  console.log('Verificando se já tem uma casa...')
  const { data: existingHu } = await supabase
    .from('house_users')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existingHu) {
    console.log('Usuário já está vinculado a uma casa!')
    return
  }

  console.log('Criando casa "NightPass Demo"...')
  const { data: house, error: houseError } = await supabase
    .from('houses')
    .insert([{ name: 'NightPass Demo', slug: 'demo' }])
    .select()
    .single()

  if (houseError) {
    console.error('Erro ao criar casa. Políticas de RLS podem estar bloqueando. Erro:', houseError.message)
    return
  }

  console.log('Vinculando usuário à casa como super_admin...')
  const { error: huError } = await supabase
    .from('house_users')
    .insert([{ house_id: house.id, user_id: userId, role: 'super_admin' }])

  if (huError) {
    console.error('Erro ao vincular usuário:', huError.message)
  } else {
    console.log('Tudo pronto! Acesso criado.')
  }
}

createAccess()
