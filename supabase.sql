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
  drawn_at timestamptz not null default now()
);

alter table public.roulette_phone_entries enable row level security;
alter table public.roulette_draws enable row level security;

create policy "roulette entries public read" on public.roulette_phone_entries for select using (true);
create policy "roulette entries public insert" on public.roulette_phone_entries for insert with check (true);
create policy "roulette draws public read" on public.roulette_draws for select using (true);
create policy "roulette draws public insert" on public.roulette_draws for insert with check (true);
