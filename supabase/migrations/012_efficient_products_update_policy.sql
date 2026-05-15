-- Allow owners to update their own efficient_products entries
create policy "owner update efficient_products"
  on public.efficient_products for update
  using (auth.uid() = added_by)
  with check (auth.uid() = added_by);
