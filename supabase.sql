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
  select
    employee.id,
    coalesce(to_jsonb(employee) ->> 'name', to_jsonb(employee) ->> 'full_name') as name,
    coalesce(
      to_jsonb(employee) ->> 'Position',
      to_jsonb(employee) ->> 'position',
      to_jsonb(employee) ->> 'role'
  ) as "Position"
  from public.employees as employee
  order by 2;
$$;

revoke all on function public.get_roulette_employees() from public;
grant execute on function public.get_roulette_employees() to anon, authenticated;

-- Старый RPC читал вкладку «Офис», а не общий рабочий график.
-- Удаляем его, чтобы он не мог использоваться как источник статистики.
drop function if exists public.get_roulette_working_employees(date);

-- Используем точный опубликованный контракт G7; поиск таблиц по эвристикам удалён.
-- Старый универсальный парсер vacations больше не нужен: контракт G7 предоставляет
-- нормализованное представление vacation_days_normalized.
drop function if exists public.is_roulette_employee_absent(uuid, date);

create or replace function public.get_roulette_unified_working_employees(p_work_date date)
returns table (employee_id uuid, source_table text)
language sql
stable
security definer
set search_path = public
as $$
  -- Контракт G7: находим неделю, затем только последнюю публикацию этой
  -- недели и только её опубликованные назначения за выбранную дату.
  with selected_week as (
    select week.id
    from public.schedule_weeks as week
    where p_work_date between week.starts_on and week.ends_on
    order by
      case when week.status in ('published', 'locked') then 0 else 1 end,
      week.version desc nulls last,
      week.updated_at desc nulls last
    limit 1
  ),
  latest_publication as (
    select publication.id
    from public.schedule_publications as publication
    join selected_week on selected_week.id = publication.schedule_week_id
    order by publication.version desc, publication.published_at desc
    limit 1
  )
  select distinct
    assignment.employee_id,
    'published_shift_assignments'::text as source_table
  from public.published_shift_assignments as assignment
  join latest_publication on latest_publication.id = assignment.publication_id
  join public.employees as employee on employee.id = assignment.employee_id
  where assignment.assignment_date = p_work_date
    -- assignment_status является источником истины: day_off и sick не работают.
    and assignment.assignment_status = 'working'
    and assignment.shift_type_id is not null
    -- В статистике нужны только персональные консультанты, без лидеров.
    and lower(trim(coalesce(
      to_jsonb(employee) ->> 'Position',
      to_jsonb(employee) ->> 'position',
      to_jsonb(employee) ->> 'role',
      ''
    ))) = 'personal consultant'
    -- Отпуск визуально перекрывает опубликованную смену и хранится отдельно.
    and not exists (
      select 1
      from public.vacation_days_normalized as vacation
      where vacation.employee_id = assignment.employee_id
        and vacation.vacation_date = p_work_date
    );
$$;

revoke all on function public.get_roulette_unified_working_employees(date) from public;
grant execute on function public.get_roulette_unified_working_employees(date) to anon, authenticated;

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
