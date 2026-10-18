-- Run after results_schema.sql. Safe to run again without removing fixtures.
begin;

-- Composite foreign keys enforce league membership even for direct SQL writes.
create unique index if not exists players_id_league_id_uidx
on public.players (id, league_id);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  league_id text not null references public.leagues(id),
  player_a_id uuid not null,
  player_b_id uuid not null,
  match_date date not null,
  match_time time(0) without time zone not null,
  time_zone text not null default 'America/Santiago' check (time_zone = 'America/Santiago'),
  created_at timestamptz not null default now(),
  foreign key (player_a_id, league_id) references public.players(id, league_id),
  foreign key (player_b_id, league_id) references public.players(id, league_id),
  check (player_a_id <> player_b_id),
  check (match_time < time '24:00:00' and extract(second from match_time) = 0)
);

create index if not exists fixtures_league_schedule_idx
on public.fixtures (league_id, match_date, match_time);

alter table public.fixtures enable row level security;
revoke all on public.fixtures from public, anon, authenticated;

create or replace function public.create_fixture(
  p_request_id uuid,
  p_league_id text,
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_match_date date,
  p_match_time time without time zone
)
returns public.fixtures
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fixture public.fixtures;
  v_player_count integer;
begin
  if p_request_id is null then
    raise exception 'No se pudo identificar la solicitud. Intenta nuevamente.';
  end if;

  -- Serialize retries, including a retry after the first response was lost.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_fixture from public.fixtures where request_id = p_request_id;
  if found then
    if v_fixture.league_id is distinct from p_league_id
      or v_fixture.player_a_id is distinct from p_player_a_id
      or v_fixture.player_b_id is distinct from p_player_b_id
      or v_fixture.match_date is distinct from p_match_date
      or v_fixture.match_time is distinct from p_match_time then
      raise exception 'Esta solicitud ya corresponde a otro partido.';
    end if;
    return v_fixture;
  end if;

  if p_league_id is null or not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'La liga seleccionada ya no está disponible.';
  end if;
  if p_player_a_id is null or p_player_b_id is null or p_player_a_id = p_player_b_id then
    raise exception 'Selecciona dos jugadores diferentes.';
  end if;
  -- Keep players active and in the chosen league until the transaction commits.
  perform id from public.players
  where id in (p_player_a_id, p_player_b_id)
  order by id for share;
  select count(*) into v_player_count from public.players
  where id in (p_player_a_id, p_player_b_id) and league_id = p_league_id and active;
  if v_player_count <> 2 then
    raise exception 'Los dos jugadores deben estar activos y pertenecer a la liga seleccionada.';
  end if;
  if p_match_date is null or not isfinite(p_match_date) or p_match_time is null
    or p_match_time >= time '24:00:00' or extract(second from p_match_time) <> 0 then
    raise exception 'Selecciona una fecha y hora válidas.';
  end if;
  if ((p_match_date + p_match_time) at time zone 'America/Santiago') <= now() then
    raise exception 'La fecha y hora del partido deben ser futuras (hora de Chile).';
  end if;

  insert into public.fixtures (request_id, league_id, player_a_id, player_b_id, match_date, match_time)
  values (p_request_id, p_league_id, p_player_a_id, p_player_b_id, p_match_date, p_match_time)
  returning * into v_fixture;
  return v_fixture;
end;
$$;

revoke all on function public.create_fixture(uuid, text, uuid, uuid, date, time without time zone) from public;
grant execute on function public.create_fixture(uuid, text, uuid, uuid, date, time without time zone) to anon, authenticated;

-- Public fixture cards expose names and schedules, never request IDs or write access.
create or replace function public.list_fixtures(
  p_league_id text,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  league_id text,
  player_a_name text,
  player_b_name text,
  match_date date,
  match_time time without time zone
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_league_id is null or not exists (select 1 from public.leagues l where l.id = p_league_id) then
    raise exception 'La liga seleccionada ya no está disponible.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'La página de partidos solicitada no es válida.';
  end if;
  return query
  select f.id, f.league_id, a.name, b.name, f.match_date, f.match_time
  from public.fixtures f
  join public.players a on a.id = f.player_a_id and a.league_id = f.league_id
  join public.players b on b.id = f.player_b_id and b.league_id = f.league_id
  where f.league_id = p_league_id
  order by f.match_date asc, f.match_time asc, f.created_at asc, f.id asc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.list_fixtures(text, integer, integer) from public;
grant execute on function public.list_fixtures(text, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
