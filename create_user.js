import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cbzbnqbnpawtuaysfzyj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiemJucWJucGF3dHVheXNmenlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mjk5NTAsImV4cCI6MjA5MzUwNTk1MH0.w9IjYokwFDBKawqT0eZ0UDuS0CUDN0YnoNWncF-DH5M'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const email = 'teste@gmail.com'
  const password = '123456'
  
  console.log('Tentando criar/logar usuário:', email)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    console.log('Erro no signUp (pode já existir):', error.message)
  } else {
    console.log('Usuário criado com sucesso! User ID:', data.user?.id)
  }
}

run()
