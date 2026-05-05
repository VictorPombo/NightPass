import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'victordeassis2010@hotmail.com',
    password: '123456'
  })
  
  if (error) {
    console.error('Login error:', error.message)
    return
  }
  
  const userId = data.session.user.id
  console.log('Login success! User ID:', userId)
  
  // Create house
  const { data: house, error: hErr } = await supabase
    .from('houses')
    .insert({ name: 'NightPass Club', slug: 'nightpass' })
    .select()
    .single()
    
  if (hErr) {
    console.log('House already exists or error:', hErr.message)
  }
  
  // Get house id
  let houseId;
  if (house) {
    houseId = house.id;
  } else {
    const { data: existingH } = await supabase.from('houses').select('id').eq('slug', 'nightpass').single();
    if (existingH) houseId = existingH.id;
  }
  
  if (houseId) {
    const { error: huErr } = await supabase
      .from('house_users')
      .insert({ house_id: houseId, user_id: userId, role: 'super_admin' })
      
    if (huErr) {
      console.log('House user link error (might exist):', huErr.message)
    } else {
      console.log('User linked to house successfully!')
    }
  }
}

test()
