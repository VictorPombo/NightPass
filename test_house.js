import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cbzbnqbnpawtuaysfzyj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiemJucWJucGF3dHVheXNmenlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mjk5NTAsImV4cCI6MjA5MzUwNTk1MH0.w9IjYokwFDBKawqT0eZ0UDuS0CUDN0YnoNWncF-DH5M'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: userAuth } = await supabase.auth.signInWithPassword({ email: 'teste@gmail.com', password: '123456' })
  
  if (!userAuth.user) return console.log('not logged in')
  
  const { data: houses } = await supabase.from('houses').select('*')
  console.log('Casas do usuario:', houses)
  
  if (!houses || houses.length === 0) {
     const { data: newHouse, error } = await supabase.from('houses').insert({ owner_id: userAuth.user.id, name: 'NightPass Club', slug: 'nightpass' }).select()
     console.log('Casa criada:', newHouse, error)
  }
}
run()
