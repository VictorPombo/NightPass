import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function resend() {
  console.log('Reenviando e-mail de confirmação...')
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: 'victordeassis2010@hotmail.com',
  })

  if (error) {
    console.error('Erro ao reenviar:', error.message)
  } else {
    console.log('E-mail de confirmação reenviado com sucesso!')
  }
}

resend()
