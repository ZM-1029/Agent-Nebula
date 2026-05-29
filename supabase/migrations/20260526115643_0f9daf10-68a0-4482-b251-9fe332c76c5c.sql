
create policy "Users can self-assign initial role"
on public.user_roles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid())
);
