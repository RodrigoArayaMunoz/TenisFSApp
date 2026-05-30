create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_result_status') then
    create type public.match_result_status as enum (
      'Pendiente',
      'Validado',
      'Rechazado'
    );
  end if;
end $$;

create table if not exists public.leagues (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id),
  name text not null,
  played integer not null default 0 check (played >= 0),
  points integer not null default 0 check (points >= 0),
  balls integer not null default 0 check (balls >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (league_id, name)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id),
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  ball_provider_id uuid not null references public.players(id),
  winner_id uuid not null references public.players(id),
  loser_id uuid not null references public.players(id),
  winner_points integer not null check (winner_points in (2, 3)),
  loser_points integer not null check (loser_points in (0, 1)),
  sets_score text not null check (sets_score in ('2-0', '2-1')),
  set_1_player_a integer not null,
  set_1_player_b integer not null,
  set_2_player_a integer not null,
  set_2_player_b integer not null,
  set_3_player_a integer,
  set_3_player_b integer,
  status public.match_result_status not null default 'Pendiente',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_admin_id bigint,
  rejection_reason text,
  check (player_a_id <> player_b_id),
  check (winner_id in (player_a_id, player_b_id)),
  check (loser_id in (player_a_id, player_b_id)),
  check (winner_id <> loser_id),
  check (ball_provider_id in (player_a_id, player_b_id)),
  check (
    (sets_score = '2-0' and set_3_player_a is null and set_3_player_b is null)
    or
    (sets_score = '2-1' and set_3_player_a is not null and set_3_player_b is not null)
  )
);

create index if not exists players_league_id_idx
on public.players (league_id);

create index if not exists match_results_status_idx
on public.match_results (status);

create index if not exists match_results_league_status_idx
on public.match_results (league_id, status);

insert into public.leagues (id, name)
values
  ('B', 'Liga B'),
  ('C', 'Liga C')
on conflict (id) do update
set name = excluded.name;

insert into public.players (league_id, name)
values
  ('B', 'Luis Medina'),
  ('B', 'Alexis Urbina'),
  ('B', 'Daniel Caroca'),
  ('B', 'Rodolfo Hernandez'),
  ('B', 'Franco Villarroel'),
  ('B', 'Marcos Villenas'),
  ('B', 'Leonel Rojas'),
  ('B', 'Jorge Labrin'),
  ('B', 'Francisco Arias'),
  ('B', 'Bryan Barra'),
  ('B', 'Felipe Retamal'),
  ('B', 'Feña Gonzalez'),
  ('B', 'Ricardo Muñoz'),
  ('B', 'Jaime Maripangui'),
  ('B', 'Andres Tello'),
  ('B', 'Jose Valenzuela'),
  ('B', 'Benjamin Mellado'),
  ('B', 'Rodrigo Araya'),
  ('B', 'Diego Lopez'),
  ('B', 'Alvaro Villegas'),
  ('B', 'Matias Espinoza'),
  ('B', 'Diego Valenzuela')
on conflict (league_id, name) do update
set active = true;

create or replace function public.review_match_result(
  p_match_result_id uuid,
  p_status public.match_result_status,
  p_admin_id bigint default null,
  p_rejection_reason text default null
)
returns public.match_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.match_results;
begin
  if p_status not in ('Validado', 'Rechazado') then
    raise exception 'El estado debe ser Validado o Rechazado.';
  end if;

  select *
  into v_match
  from public.match_results
  where id = p_match_result_id
  for update;

  if not found then
    raise exception 'Resultado no encontrado.';
  end if;

  if v_match.status <> 'Pendiente' then
    raise exception 'El resultado ya fue revisado.';
  end if;

  update public.match_results
  set
    status = p_status,
    reviewed_at = now(),
    reviewed_by_admin_id = p_admin_id,
    rejection_reason = case
      when p_status = 'Rechazado' then p_rejection_reason
      else null
    end
  where id = p_match_result_id
  returning * into v_match;

  if p_status = 'Validado' then
    update public.players
    set
      played = played + 1,
      points = points + case
        when id = v_match.winner_id then v_match.winner_points
        when id = v_match.loser_id then v_match.loser_points
        else 0
      end,
      balls = balls + case
        when id = v_match.ball_provider_id then 1
        else 0
      end
    where id in (v_match.player_a_id, v_match.player_b_id);
  end if;

  return v_match;
end;
$$;

alter table public.leagues enable row level security;
alter table public.players enable row level security;
alter table public.match_results enable row level security;

drop policy if exists "leagues readable" on public.leagues;
create policy "leagues readable"
on public.leagues
for select
to anon, authenticated
using (true);

drop policy if exists "players readable" on public.players;
create policy "players readable"
on public.players
for select
to anon, authenticated
using (true);

drop policy if exists "match results readable" on public.match_results;
create policy "match results readable"
on public.match_results
for select
to anon, authenticated
using (true);

drop policy if exists "match results insertable" on public.match_results;
create policy "match results insertable"
on public.match_results
for insert
to anon, authenticated
with check (status = 'Pendiente');

grant usage on schema public to anon, authenticated;
grant select on public.leagues to anon, authenticated;
grant select on public.players to anon, authenticated;
grant select, insert on public.match_results to anon, authenticated;
grant execute on function public.review_match_result(
  uuid,
  public.match_result_status,
  bigint,
  text
) to anon, authenticated;
