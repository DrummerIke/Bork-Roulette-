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
grant select on table public.office_shifts to anon, authenticated;
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

-- Возвращает только сотрудников, которые работали в выбранный день. Чтение
-- через JSON делает интеграцию устойчивой к типовым названиям колонок графика:
-- shift_date/date/work_date, employee_id/consultant_id и status/shift_type/type.
create or replace function public.get_roulette_working_employees(p_work_date date)
returns table (employee_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with normalized_shifts as (
    select
      coalesce(
        to_jsonb(shift_row) ->> 'employee_id',
        to_jsonb(shift_row) ->> 'consultant_id',
        to_jsonb(shift_row) ->> 'user_id',
        to_jsonb(shift_row) ->> 'staff_id',
        to_jsonb(shift_row) #>> '{employee,id}',
        to_jsonb(shift_row) ->> 'employee'
      ) as employee_value,
      coalesce(
        to_jsonb(shift_row) ->> 'employee_name',
        to_jsonb(shift_row) #>> '{employee,name}',
        to_jsonb(shift_row) ->> 'employee',
        to_jsonb(shift_row) ->> 'full_name',
        to_jsonb(shift_row) ->> 'name',
        to_jsonb(shift_row) ->> 'col1'
      ) as employee_name,
      coalesce(
        to_jsonb(shift_row) ->> 'shift_date',
        to_jsonb(shift_row) ->> 'date',
        to_jsonb(shift_row) ->> 'work_date',
        to_jsonb(shift_row) ->> 'day',
        to_jsonb(shift_row) ->> 'start_at',
        to_jsonb(shift_row) ->> 'starts_at'
      ) as date_value,
      lower(coalesce(
        to_jsonb(shift_row) ->> 'status',
        to_jsonb(shift_row) ->> 'shift_type',
        to_jsonb(shift_row) ->> 'type',
        'working'
      )) as shift_status,
      coalesce(to_jsonb(shift_row) ->> 'is_working', 'true') as is_working,
      case extract(isodow from p_work_date)::int
        when 1 then to_jsonb(shift_row) ->> 'col2'
        when 2 then to_jsonb(shift_row) ->> 'col3'
        when 3 then to_jsonb(shift_row) ->> 'col4'
        when 4 then to_jsonb(shift_row) ->> 'col5'
        when 5 then to_jsonb(shift_row) ->> 'col6'
        else null
      end as matrix_shift,
      to_jsonb(shift_row) as row_data
    from public.office_shifts as shift_row
  )
  select distinct coalesce(
    case
      when shift.employee_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then shift.employee_value::uuid
      else null
    end,
    employee.id
  )
  from normalized_shifts as shift
  left join public.employees as employee
    on lower(coalesce(to_jsonb(employee) ->> 'name', to_jsonb(employee) ->> 'full_name')) = lower(shift.employee_name)
  where (
      case
        when left(shift.date_value, 10) ~ '^\d{4}-\d{2}-\d{2}$' then left(shift.date_value, 10)::date
        else null
      end = p_work_date
      or shift.row_data::text like ('%' || to_char(p_work_date, 'YYYY-MM-DD') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'YYYY/MM/DD') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'YYYY.MM.DD') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'YYYY_MM_DD') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'DD-MM-YYYY') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'DD.MM.YYYY') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'DD/MM/YYYY') || '%')
      or shift.row_data::text like ('%' || to_char(p_work_date, 'DD_MM_YYYY') || '%')
      or (
        shift.row_data::text like ('%' || to_char(p_work_date, 'YYYY-MM') || '%')
        and shift.row_data::text like ('%"' || extract(day from p_work_date)::int::text || '"%')
      )
      or (
        shift.date_value is null
        and shift.employee_name is not null
        and coalesce(lower(trim(shift.matrix_shift)), '') not in (
          '', '-', '—', '0', 'false', 'нет', 'off', 'day off', 'weekend',
          'vacation', 'sick', 'выходной', 'вых', 'в', 'отпуск', 'отп', 'о',
          'больничный', 'бл', 'б', 'не работает'
        )
        and coalesce(lower(trim(shift.matrix_shift)), '') !~
          '(выход|вых|отпуск|отп\.|больнич|не работ|day off|weekend|vacation|sick|absence)'
      )
    )
    and coalesce(shift.employee_value, shift.employee_name) is not null
    and (
      shift.employee_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or employee.id is not null
    )
    and lower(shift.is_working) not in ('false', '0', 'no')
    and shift.shift_status not in (
      'off', 'day off', 'weekend', 'vacation', 'sick',
      'выходной', 'вых', 'в', 'отпуск', 'отп', 'о',
      'больничный', 'бл', 'б', 'не работает'
    )
    and shift.shift_status !~
      '(выход|вых|отпуск|отп\.|больнич|не работ|day off|weekend|vacation|sick|absence)';
$$;

revoke all on function public.get_roulette_working_employees(date) from public;
grant execute on function public.get_roulette_working_employees(date) to anon, authenticated;

-- Ищет фактическую таблицу семидневного рабочего графика среди закрытых и
-- открытых public-таблиц. Это отделяет «График работы» от office_shifts («Офис»).
create or replace function public.get_roulette_unified_working_employees(p_work_date date)
returns table (employee_id uuid, source_table text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  source record;
  row_data jsonb;
  row_text text;
  employee_value text;
  employee_name text;
  schedule_data jsonb;
  shift_value text;
  mapped_employee uuid;
  week_monday date;
  direct_date_match boolean;
  week_match boolean;
  day_key_en text;
  day_key_ru text;
  day_index int;
begin
  week_monday := p_work_date - (extract(isodow from p_work_date)::int - 1);
  day_index := extract(isodow from p_work_date)::int;
  day_key_en := (array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])[day_index];
  day_key_ru := (array['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'])[day_index];

  for source in
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
      and (
        tablename ~* '(schedule|shift|work|roster|timetable|граф|смен)'
        or exists (
          select 1
          from information_schema.columns as column_info
          where column_info.table_schema = 'public'
            and column_info.table_name = pg_tables.tablename
            and column_info.column_name in ('employee_id', 'consultant_id', 'user_id', 'staff_id', 'week_start', 'week_start_date')
        )
      )
      and tablename not in ('employees', 'vacations', 'office_shifts', 'roulette_phone_entries', 'roulette_draws')
  loop
    begin
      for row_data in execute format('select to_jsonb(t) from public.%I t limit 5000', source.tablename)
      loop
        row_text := row_data::text;
        direct_date_match :=
          row_text like ('%' || to_char(p_work_date, 'YYYY-MM-DD') || '%') or
          row_text like ('%' || to_char(p_work_date, 'DD-MM-YYYY') || '%') or
          row_text like ('%' || to_char(p_work_date, 'DD.MM.YYYY') || '%') or
          row_text like ('%' || to_char(p_work_date, 'DD/MM/YYYY') || '%');
        week_match :=
          row_text like ('%' || to_char(week_monday, 'YYYY-MM-DD') || '%') or
          row_text like ('%' || to_char(week_monday, 'DD.MM.YYYY') || '%') or
          row_text like ('%' || to_char(week_monday, 'DD-MM-YYYY') || '%');
        if not direct_date_match and not week_match then continue; end if;

        employee_value := coalesce(
          row_data ->> 'employee_id', row_data ->> 'consultant_id',
          row_data ->> 'user_id', row_data ->> 'staff_id',
          row_data #>> '{employee,id}'
        );
        employee_name := coalesce(
          row_data ->> 'employee_name', row_data ->> 'full_name',
          row_data ->> 'name', row_data #>> '{employee,name}'
        );
        schedule_data := coalesce(row_data -> 'schedule', row_data -> 'shifts', row_data -> 'week_data', row_data -> 'days');
        shift_value := null;
        if schedule_data is not null then
          if jsonb_typeof(schedule_data) = 'array' then
            shift_value := schedule_data ->> (day_index - 1);
          elsif jsonb_typeof(schedule_data) = 'object' then
            shift_value := coalesce(
              schedule_data ->> day_key_en,
              schedule_data ->> day_key_ru,
              schedule_data ->> day_index::text
            );
          end if;
        end if;
        shift_value := coalesce(
          shift_value, row_data ->> day_key_en, row_data ->> day_key_ru,
          case when direct_date_match then coalesce(row_data ->> 'status', row_data ->> 'shift_type', row_data ->> 'type', 'working') end
        );
        if shift_value is null then continue; end if;
        if lower(trim(shift_value)) in ('', '-', '—', '0', 'false', 'off', 'day off', 'weekend', 'vacation', 'sick', 'выходной', 'вых', 'в', 'отпуск', 'отп', 'о', 'больничный', 'бл', 'б')
          or lower(trim(shift_value)) ~ '(выход|вых|отпуск|отп\.|больнич|не работ|day off|weekend|vacation|sick|absence)'
        then continue; end if;

        mapped_employee := null;
        if employee_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          mapped_employee := employee_value::uuid;
        elsif employee_name is not null then
          select employee.id into mapped_employee
          from public.employees as employee
          where lower(coalesce(to_jsonb(employee) ->> 'name', to_jsonb(employee) ->> 'full_name')) = lower(employee_name)
          limit 1;
        end if;
        if mapped_employee is null then continue; end if;

        employee_id := mapped_employee;
        source_table := source.tablename;
        return next;
      end loop;
    exception when others then
      continue;
    end;
  end loop;
end;
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

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'office_shifts' and policyname = 'office shifts roulette read') then
    create policy "office shifts roulette read" on public.office_shifts for select using (true);
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
