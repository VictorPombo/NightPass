ALTER TABLE promoters RENAME COLUMN name TO full_name;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS commission_pct int DEFAULT 10;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS fixed_fee_cents int DEFAULT 0;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS min_entries int DEFAULT 0;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS entry_fee_cents int DEFAULT 0;
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS consumacao_cents int DEFAULT 0;
NOTIFY pgrst, 'reload schema';
