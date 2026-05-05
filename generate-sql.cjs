const fs = require('fs');

const sql = `
-- ==========================================
-- NIGHTPASS - SUPABASE DATABASE SCHEMA
-- ==========================================

-- 1. ENUMS E TIPOS
CREATE TYPE fee_type AS ENUM ('fixed', 'percent', 'mixed', 'tbd');
CREATE TYPE work_type AS ENUM ('limpeza', 'cozinha', 'servicos_gerais', 'garcom', 'cumim', 'recepcao', 'atendente', 'seguranca');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'both');

-- 2. TABELAS CORE

CREATE TABLE houses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE house_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE house_spaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity int,
  created_at timestamptz DEFAULT now()
);

-- 3. CLIENTES

CREATE TABLE clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cpf text,
  phone text,
  birth_date date,
  source text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- 4. EVENTOS E PORTARIA

CREATE TABLE events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date timestamptz NOT NULL,
  genre text,
  start_time time,
  end_time time,
  price_male_cents int,
  price_female_cents int,
  price_male_list_cents int,
  price_female_list_cents int,
  capacity int,
  repeat_rule text,
  attractions text,
  promotions text,
  flyer_url text,
  birthday_list_enabled boolean DEFAULT true,
  observations text,
  artist_fee_cents int,
  artists jsonb,
  consumption_cents int,
  production_cost_cents int,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE checkin_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  amount_cents int DEFAULT 0,
  payment_method text,
  checkin_type text,
  operator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text,
  created_at timestamptz DEFAULT now()
);

-- 5. RESERVAS

CREATE TABLE reservation_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_spend_cents int,
  max_people int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  expected_arrival time,
  location text,
  people_count int,
  status text DEFAULT 'pending',
  token text UNIQUE,
  max_guests int,
  reservation_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reservation_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int,
  quantity int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reservation_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  name text NOT NULL,
  checked_in boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. ANIVERSÁRIOS

CREATE TABLE birthday_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  birthday_person_name text NOT NULL,
  phone text,
  birthday_date date,
  token text UNIQUE,
  max_guests int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE birthday_list_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid REFERENCES birthday_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  checked_in boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 7. FREELANCERS / STAFF

CREATE TABLE freelancers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  address text,
  phone text,
  pix_key text,
  daily_rate_cents int,
  work_types text[],
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE event_freelancers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  freelancer_id uuid REFERENCES freelancers(id) ON DELETE CASCADE,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE event_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE event_checklist_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  item text NOT NULL,
  checked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 8. PROMOTERS

CREATE TABLE promoters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE promoter_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  promoter_id uuid REFERENCES promoters(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE promoter_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  promoter_id uuid REFERENCES promoters(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE promoter_list_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid REFERENCES promoter_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  checked_in boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 9. INGRESSOS (TICKETS)

CREATE TABLE ticket_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender text DEFAULT 'both',
  price_cents int NOT NULL,
  quantity int NOT NULL,
  sold int DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ticket_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES ticket_batches(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_cpf text,
  buyer_phone text,
  buyer_email text,
  quantity int DEFAULT 1,
  amount_cents int NOT NULL,
  payment_status text DEFAULT 'pending',
  payment_method text,
  payment_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  order_id uuid REFERENCES ticket_orders(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  holder_name text,
  checked_in boolean DEFAULT false,
  checked_in_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 10. WHATSAPP & INTEGRACOES

CREATE TABLE whatsapp_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  active boolean DEFAULT false,
  send_checkin_confirm boolean DEFAULT false,
  send_birthday_wish boolean DEFAULT false,
  send_event_invite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE whatsapp_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  type text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE whatsapp_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message text NOT NULL,
  status text,
  created_at timestamptz DEFAULT now()
);


-- ==========================================
-- FUNÇÃO RPC: INCREMENT_BATCH_SOLD
-- ==========================================

CREATE OR REPLACE FUNCTION increment_batch_sold(batch_id uuid, qty int)
RETURNS void AS $$
BEGIN
  UPDATE ticket_batches
  SET sold = sold + qty
  WHERE id = batch_id AND (sold + qty) <= quantity;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote esgotado ou quantidade inválida';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Para garantir que o sistema não quebre, vamos habilitar o RLS mas com 
-- políticas abertas para leitura pública (onde necessário) e total acesso
-- para usuários autenticados. Num sistema produtivo rigoroso, limitaríamos por house_id.

-- Habilitar RLS
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_list_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_list_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Usuários Autenticados
-- Permite que usuários logados gerenciem tudo
CREATE POLICY "Full Access Authenticated" ON houses FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON house_users FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON house_spaces FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON events FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON checkin_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON checkins FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON reservation_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON reservations FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON reservation_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON reservation_guests FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON birthday_lists FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON birthday_list_guests FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON freelancers FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON event_freelancers FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON event_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON event_checklist_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON promoters FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON promoter_lists FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON promoter_tokens FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON promoter_list_guests FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON ticket_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON ticket_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON tickets FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON whatsapp_config FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Full Access Authenticated" ON whatsapp_logs FOR ALL TO authenticated USING (true);

-- Políticas de Leitura e Escrita Pública (Anon) para Portais e Links
-- Visitantes precisam poder ver eventos, lotes de ingressos e criar pedidos
CREATE POLICY "Anon Read Events" ON events FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Anon Read Houses" ON houses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Read Batches" ON ticket_batches FOR SELECT TO anon USING (active = true);
CREATE POLICY "Anon Insert Orders" ON ticket_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon Update Orders" ON ticket_orders FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon Select Orders" ON ticket_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Read Birthday Lists" ON birthday_lists FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Insert Birthday Guests" ON birthday_list_guests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon Select Birthday Guests" ON birthday_list_guests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Read Reservations" ON reservations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Read Promoter Lists" ON promoter_lists FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Insert Promoter Guests" ON promoter_list_guests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon Select Promoter Guests" ON promoter_list_guests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Read Promoter Tokens" ON promoter_tokens FOR SELECT TO anon USING (true);

`;

fs.writeFileSync('schema.sql', sql);
console.log('schema.sql generated');
