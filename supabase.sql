create table if not exists public.roulette_phone_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  phone text not null,
  entry_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.roulette_draws (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.roulette_phone_entries(id),
  winner_employee_id uuid not null references public.employees(id),
  selected_phone text not null,
  source_date date not null,
  checklist jsonb not null default '{}'::jsonb,
  drawn_at timestamptz not null default now()
);

alter table public.roulette_phone_entries enable row level security;
alter table public.roulette_draws enable row level security;

alter table public.roulette_draws add column if not exists checklist jsonb not null default '{}'::jsonb;

-- Политики RLS не заменяют SQL-привилегии. Эти grants восстанавливают доступ
-- браузерного anon-клиента, если его отозвали при настройке других таблиц.
grant usage on schema public to anon, authenticated;
grant select on table public.employees to anon, authenticated;
grant select, insert, update on table public.roulette_phone_entries to anon, authenticated;
grant select, insert on table public.roulette_draws to anon, authenticated;

-- Отдельная безопасная точка чтения сотрудников. Виджет использует её как
-- резервный путь, если прямой SELECT был отозван настройками другого проекта.
create or replace function public.get_roulette_employees()
returns table (id uuid, name text, "Position" text)
language sql
stable
security definer
set search_path = public
as $$
  select employee.id, employee.name, employee."Position"
  from public.employees as employee
  order by employee.name;
$$;

revoke all on function public.get_roulette_employees() from public;
grant execute on function public.get_roulette_employees() to anon, authenticated;

-- Таблица employees уже существует. Для виджета нужен select через anon key.
-- Если RLS на employees включен, эта политика откроет только чтение списка сотрудников.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'employees' and policyname = 'employees public read') then
    create policy "employees public read" on public.employees for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roulette_phone_entries' and policyname = 'roulette entries public read') then
    create policy "roulette entries public read" on public.roulette_phone_entries for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roulette_phone_entries' and policyname = 'roulette entries public insert') then
    create policy "roulette entries public insert" on public.roulette_phone_entries for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roulette_phone_entries' and policyname = 'roulette entries public update') then
    create policy "roulette entries public update" on public.roulette_phone_entries for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roulette_draws' and policyname = 'roulette draws public read') then
    create policy "roulette draws public read" on public.roulette_draws for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roulette_draws' and policyname = 'roulette draws public insert') then
    create policy "roulette draws public insert" on public.roulette_draws for insert with check (true);
  end if;
end $$;

-- Обновляем schema cache PostgREST после изменения таблиц/связей в проекте.
notify pgrst, 'reload schema';
