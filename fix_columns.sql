ALTER TABLE reservation_types ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE reservation_types ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE reservation_types ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE reservation_types ADD COLUMN IF NOT EXISTS max_people int;
ALTER TABLE reservation_types ADD COLUMN IF NOT EXISTS min_spend_cents int;

ALTER TABLE house_spaces ADD COLUMN IF NOT EXISTS capacity int;
ALTER TABLE house_spaces ADD COLUMN IF NOT EXISTS price_cents int;
ALTER TABLE house_spaces ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

NOTIFY pgrst, 'reload schema';
