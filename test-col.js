import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCol() {
  const { data, error } = await supabase.from('events').select('updated_at').limit(1)
  if (error) {
    console.error('ERRO:', error.message)
  } else {
    console.log('SUCESSO! Coluna encontrada:', data)
  }
}
testCol()
