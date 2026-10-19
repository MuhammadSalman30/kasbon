-- Cicilan: satu debt bisa punya banyak payment.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),
  paid_at date not null default current_date,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index payments_debt_idx on public.payments (debt_id);

-- RLS: sama ketatnya dengan debts. Payment immutable (tambah / hapus aja, gak ada update).
alter table public.payments enable row level security;
alter table public.payments force row level security;

create policy "payments_select_own" on public.payments for select to authenticated
  using (user_id = (select auth.uid()));

-- insert: harus milik sendiri DAN debt-nya juga milik sendiri
create policy "payments_insert_own" on public.payments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.debts d where d.id = debt_id and d.user_id = (select auth.uid()))
  );

create policy "payments_delete_own" on public.payments for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.payments from anon;
grant select, insert, delete on public.payments to authenticated;

-- Setelah payment ditambah/dihapus: hitung ulang total terbayar, tolak kalau kelebihan,
-- dan sinkronkan settled_at. Baris debt dikunci (FOR UPDATE) supaya dua pembayaran
-- yang masuk bersamaan diproses satu-satu.
create or replace function public.sync_debt_settlement() returns trigger
language plpgsql as $$
declare
  v_debt uuid := coalesce(new.debt_id, old.debt_id);
  v_amount bigint;
  v_paid bigint;
begin
  select amount into v_amount from public.debts where id = v_debt for update;
  if v_amount is null then return null; end if; -- debt-nya lagi dihapus (cascade)

  select coalesce(sum(amount), 0) into v_paid from public.payments where debt_id = v_debt;
  if v_paid > v_amount then
    raise exception 'Pembayaran melebihi sisa hutang' using errcode = '23514';
  end if;

  update public.debts
     set settled_at = case when v_paid >= v_amount then coalesce(settled_at, now()) else null end
   where id = v_debt;
  return null;
end $$;

create trigger payments_sync_settlement after insert or delete on public.payments
for each row execute function public.sync_debt_settlement();

-- Jumlah debt gak boleh diedit lebih kecil dari yang sudah dibayar.
create or replace function public.guard_debt_amount() returns trigger
language plpgsql as $$
declare v_paid bigint;
begin
  select coalesce(sum(amount), 0) into v_paid from public.payments where debt_id = new.id;
  if new.amount < v_paid then
    raise exception 'Jumlah gak boleh lebih kecil dari yang sudah dibayar' using errcode = '23514';
  end if;
  if v_paid > 0 then
    new.settled_at := case when v_paid >= new.amount then coalesce(new.settled_at, now()) else null end;
  end if;
  return new;
end $$;

create trigger debts_guard_amount before update of amount on public.debts
for each row when (new.amount is distinct from old.amount)
execute function public.guard_debt_amount();