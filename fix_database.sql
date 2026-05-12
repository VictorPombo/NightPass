-- 1. CRIAR AS TABELAS DE RESERVAS (SE NÃO EXISTIREM)
CREATE TABLE IF NOT EXISTS house_spaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity int,
  price_cents int,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE house_spaces ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS reservation_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_spend_cents int,
  max_people int,
  active boolean DEFAULT true,
  icon text,
  color text,
  sort_order int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reservation_types ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  reservation_type_id uuid REFERENCES reservation_types(id) ON DELETE SET NULL,
  space_id uuid REFERENCES house_spaces(id) ON DELETE SET NULL,
  reservation_date date NOT NULL,
  expected_arrival time,
  people_count int,
  amount_cents int DEFAULT 0,
  deposit_cents int DEFAULT 0,
  payment_status text DEFAULT 'unpaid',
  status text DEFAULT 'pending',
  arrived_at timestamptz,
  flyer_url text,
  invite_message text,
  observations text,
  list_type text DEFAULT 'normal',
  list_custom_value_cents int,
  list_male_value_cents int,
  list_female_value_cents int,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservation_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity int DEFAULT 1,
  price_cents int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservation_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  checked_in boolean DEFAULT false,
  checked_in_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS birthday_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  birthday_person_name text NOT NULL,
  token text UNIQUE NOT NULL,
  status text DEFAULT 'active',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS birthday_list_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid REFERENCES birthday_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  checked_in boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2. CRIAR AS TABELAS DE PROMOTERS (SE NÃO EXISTIREM)
CREATE TABLE IF NOT EXISTS promoters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promoter_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  promoter_id uuid REFERENCES promoters(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'active',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promoter_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  promoter_id uuid REFERENCES promoters(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promoter_list_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid REFERENCES promoter_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  checked_in boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. HABILITAR SEGURANÇA E ACESSOS
ALTER TABLE house_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_list_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_list_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full Access Authenticated" ON house_spaces;
CREATE POLICY "Full Access Authenticated" ON house_spaces FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON reservation_types;
CREATE POLICY "Full Access Authenticated" ON reservation_types FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON reservations;
CREATE POLICY "Full Access Authenticated" ON reservations FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON reservation_items;
CREATE POLICY "Full Access Authenticated" ON reservation_items FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON reservation_guests;
CREATE POLICY "Full Access Authenticated" ON reservation_guests FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON birthday_lists;
CREATE POLICY "Full Access Authenticated" ON birthday_lists FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON birthday_list_guests;
CREATE POLICY "Full Access Authenticated" ON birthday_list_guests FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON promoters;
CREATE POLICY "Full Access Authenticated" ON promoters FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON promoter_lists;
CREATE POLICY "Full Access Authenticated" ON promoter_lists FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON promoter_tokens;
CREATE POLICY "Full Access Authenticated" ON promoter_tokens FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Full Access Authenticated" ON promoter_list_guests;
CREATE POLICY "Full Access Authenticated" ON promoter_list_guests FOR ALL TO authenticated USING (true);

-- 4. ATUALIZAR O CACHE
NOTIFY pgrst, 'reload schema';
