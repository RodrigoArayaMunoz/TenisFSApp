-- Run after fixtures.sql in a test database; all changes roll back.
begin;
do $$
declare
  v_league text := 'fixture-test-' || gen_random_uuid()::text;
  v_other_league text := 'fixture-other-' || gen_random_uuid()::text;
  v_a uuid;
  v_b uuid;
  v_other uuid;
  v_inactive uuid;
  v_request uuid := gen_random_uuid();
  v_fixture public.fixtures;
  v_retry public.fixtures;
  v_card record;
  v_early_id uuid;
  v_date date := (now() at time zone 'America/Santiago')::date + 2;
begin
  insert into public.leagues (id, name) values (v_league, v_league), (v_other_league, v_other_league);
  insert into public.players (league_id, name) values (v_league, 'Jugador A') returning id into v_a;
  insert into public.players (league_id, name) values (v_league, 'Jugador B') returning id into v_b;
  insert into public.players (league_id, name) values (v_other_league, 'Jugador C') returning id into v_other;
  insert into public.players (league_id, name, active) values (v_league, 'Inactivo', false) returning id into v_inactive;

  if has_table_privilege('anon', 'public.fixtures', 'INSERT')
    or has_table_privilege('authenticated', 'public.fixtures', 'UPDATE')
    or has_table_privilege('anon', 'public.fixtures', 'SELECT')
    or not has_function_privilege('anon', 'public.create_fixture(uuid,text,uuid,uuid,date,time)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.list_fixtures(text,integer,integer)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_fixtures(text,integer,integer)', 'EXECUTE') then
    raise exception 'Fixture writes must use the RPC, not direct client writes.';
  end if;

  select * into v_fixture from public.create_fixture(v_request, v_league, v_a, v_b, v_date, '18:30');
  if v_fixture.id is null or v_fixture.match_date <> v_date or v_fixture.match_time <> time '18:30'
    or v_fixture.time_zone <> 'America/Santiago' then raise exception 'Fixture was not saved correctly.'; end if;
  select * into v_retry from public.create_fixture(v_request, v_league, v_a, v_b, v_date, '18:30');
  if v_fixture.id <> v_retry.id or (select count(*) from public.fixtures where request_id = v_request) <> 1 then
    raise exception 'Retries must not create duplicate matches.';
  end if;

  begin
    perform public.create_fixture(v_request, v_league, v_a, v_b, v_date, '19:00');
    raise exception 'Changed retry payload must fail.';
  exception when others then
    if sqlerrm <> 'Esta solicitud ya corresponde a otro partido.' then raise; end if;
  end;
  begin
    perform public.create_fixture(gen_random_uuid(), v_league, v_a, v_other, v_date, '18:30');
    raise exception 'Cross-league players must fail.';
  exception when others then
    if sqlerrm <> 'Los dos jugadores deben estar activos y pertenecer a la liga seleccionada.' then raise; end if;
  end;
  begin
    perform public.create_fixture(gen_random_uuid(), v_league, v_a, v_inactive, v_date, '18:30');
    raise exception 'Inactive players must fail.';
  exception when others then
    if sqlerrm <> 'Los dos jugadores deben estar activos y pertenecer a la liga seleccionada.' then raise; end if;
  end;
  begin
    perform public.create_fixture(gen_random_uuid(), v_league, v_a, v_a, v_date, '18:30');
    raise exception 'A player must not play against themselves.';
  exception when others then
    if sqlerrm <> 'Selecciona dos jugadores diferentes.' then raise; end if;
  end;
  begin
    perform public.create_fixture(gen_random_uuid(), v_league, v_a, v_b, current_date - 2, '18:30');
    raise exception 'Past schedules must fail.';
  exception when others then
    if sqlerrm <> 'La fecha y hora del partido deben ser futuras (hora de Chile).' then raise; end if;
  end;
  begin
    perform public.create_fixture(gen_random_uuid(), v_league, v_a, v_b, v_date, '24:00');
    raise exception 'Invalid time must fail.';
  exception when others then
    if sqlerrm <> 'Selecciona una fecha y hora válidas.' then raise; end if;
  end;
  begin
    insert into public.fixtures (request_id, league_id, player_a_id, player_b_id, match_date, match_time)
    values (gen_random_uuid(), v_league, v_a, v_other, v_date, '18:30');
    raise exception 'Foreign keys must enforce same-league players in direct SQL too.';
  exception when foreign_key_violation then null;
  end;
  if exists (select 1 from public.players where id in (v_a, v_b) and (points <> 0 or played <> 0)) then
    raise exception 'Scheduling must not change rankings.';
  end if;

  select id into v_early_id from public.create_fixture(gen_random_uuid(), v_league, v_a, v_b, v_date, '10:00');
  select * into v_card from public.list_fixtures(v_league, 1, 0);
  if v_card.id <> v_early_id or v_card.league_id <> v_league
    or v_card.player_a_name <> 'Jugador A' or v_card.player_b_name <> 'Jugador B' then
    raise exception 'Cards must have the right league, names and chronological order.';
  end if;
  if to_jsonb(v_card) ? 'request_id' or to_jsonb(v_card) ? 'player_a_id' then
    raise exception 'Public cards must not expose request or player IDs.';
  end if;
  select * into v_card from public.list_fixtures(v_league, 1, 1);
  if v_card.id <> v_fixture.id then raise exception 'Pagination must preserve chronological order.'; end if;
  if (select count(*) from public.list_fixtures(v_league, 10, 2)) <> 0
    or (select count(*) from public.list_fixtures(v_other_league)) <> 0 then
    raise exception 'Empty pages and leagues must not contain other matches.';
  end if;
  begin
    perform public.list_fixtures(null);
    raise exception 'Public reads must require a valid league.';
  exception when others then
    if sqlerrm <> 'La liga seleccionada ya no está disponible.' then raise; end if;
  end;
  begin
    perform public.list_fixtures(v_league, 101, 0);
    raise exception 'Public reads must bound the page size.';
  exception when others then
    if sqlerrm <> 'La página de partidos solicitada no es válida.' then raise; end if;
  end;
  begin
    perform public.list_fixtures(v_league, 50, -1);
    raise exception 'Public reads must reject negative offsets.';
  exception when others then
    if sqlerrm <> 'La página de partidos solicitada no es válida.' then raise; end if;
  end;
  update public.players set active = false where id = v_a;
  select * into v_retry from public.create_fixture(v_request, v_league, v_a, v_b, v_date, '18:30');
  if v_retry.id <> v_fixture.id then raise exception 'A saved match must remain retryable after player deactivation.'; end if;
  if (select count(*) from public.list_fixtures(v_league)) <> 2 then
    raise exception 'Player deactivation must not hide saved fixtures.';
  end if;
end;
$$;
rollback;
