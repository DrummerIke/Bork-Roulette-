-- Точечное исправление чтения единого «Графика работы» для Bork Roulette.
-- Этот файл безопасно выполнять повторно: он не изменяет и не удаляет строки
-- графика, сотрудников, заявок или результатов.

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

notify pgrst, 'reload schema';
