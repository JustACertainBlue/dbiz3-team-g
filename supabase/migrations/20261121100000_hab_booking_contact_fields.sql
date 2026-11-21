-- UI v3 booking (decision 20/11 #4): contact person, phone and note on a booking. Additive and nullable only.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contact_name varchar(120), ADD COLUMN IF NOT EXISTS contact_phone varchar(32), ADD COLUMN IF NOT EXISTS note text;
