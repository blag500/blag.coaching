-- Barcodes can be wrong, and until now they stayed wrong.
--
-- The shared cache only allowed inserts, so a product entered with bad macros —
-- whether by Open Food Facts or by someone typing it in — was permanent for
-- every user who scanned it afterwards. This lets a signed-in user correct one,
-- and records that it was corrected so a bad edit can be found later.
alter table public.barcode_products
  add column if not exists corrected_at timestamptz,
  add column if not exists corrected_by uuid references auth.users(id);

create policy "authenticated correct barcode products"
  on public.barcode_products for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
