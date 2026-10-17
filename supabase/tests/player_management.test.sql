-- Run after player_management.sql in a test database.
-- All fixture data is rolled back at the end.
begin;

do $$
declare
  v_league text := 'test-' || gen_random_uuid()::text;
  v_other_league text := 'test-' || gen_random_uuid()::text;
  v_player public.players;
  v_opponent public.players;
  v_match_id uuid;
begin
  if to_regprocedure('public.manage_player(text,text,text,text,uuid)') is not null then
    raise exception 'The old PIN-based function must be removed.';
  end if;
  if not has_function_privilege('anon', 'public.manage_player(text,text,text,uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.manage_player(text,text,text,uuid)', 'EXECUTE') then
    raise exception 'The client roles must be able to call manage_player without a PIN.';
  end if;

  insert into public.leagues (id, name) values
    (v_league, v_league), (v_other_league, v_other_league);

  select * into v_player from public.manage_player('add', v_league, '  Nicolás   González  ');
  if v_player.name <> 'Nicolás González' or not v_player.active
    or v_player.league_id <> v_league or v_player.points <> 0 then
    raise exception 'Adding a player must normalize the name and assign the chosen league.';
  end if;

  begin
    perform public.manage_player('add', v_league, 'NICOLÁS GONZÁLEZ');
    raise exception 'Duplicate names must be rejected.';
  exception when unique_violation then
    null;
  end;

  begin
    perform public.manage_player('add', v_league, '  ');
    raise exception 'Blank names must be rejected.';
  exception when others then
    if sqlerrm <> 'El nombre debe tener entre 2 y 80 caracteres.' then raise; end if;
  end;
  begin
    perform public.manage_player('add', v_league, repeat('x', 81));
    raise exception 'Overlong names must be rejected.';
  exception when others then
    if sqlerrm <> 'El nombre debe tener entre 2 y 80 caracteres.' then raise; end if;
  end;
  begin
    perform public.manage_player('add', null, 'Jugador de prueba');
    raise exception 'A missing league must be rejected.';
  exception when others then
    if sqlerrm <> 'La liga seleccionada ya no está disponible.' then raise; end if;
  end;

  -- The same name can exist in another league with a separate player ID.
  select * into v_opponent from public.manage_player('add', v_other_league, v_player.name);
  if v_player.id = v_opponent.id then
    raise exception 'Player IDs must remain distinct across leagues.';
  end if;
  begin
    perform public.manage_player('remove', v_other_league, null, v_player.id);
    raise exception 'Removal must verify the selected league.';
  exception when others then
    if sqlerrm <> 'El jugador ya no está disponible. Actualiza la lista.' then raise; end if;
  end;

  select * into v_opponent from public.manage_player('add', v_league, 'Jugador Rival');
  update public.players set points = 12, played = 4, balls = 2 where id = v_player.id;
  insert into public.match_results (
    league_id, player_a_id, player_b_id, ball_provider_id, winner_id, loser_id,
    winner_points, loser_points, sets_score, set_1_player_a, set_1_player_b,
    set_2_player_a, set_2_player_b, status
  ) values (
    v_league, v_player.id, v_opponent.id, v_player.id, v_player.id, v_opponent.id,
    3, 0, '2-0', 6, 3, 6, 4, 'Validado'
  ) returning id into v_match_id;

  select * into v_player from public.manage_player('remove', v_league, null, v_player.id);
  if v_player.active or v_player.points <> 12 or v_player.played <> 4 or v_player.balls <> 2 then
    raise exception 'Removing a player must preserve their statistics.';
  end if;
  if not exists (select 1 from public.match_results where id = v_match_id and player_a_id = v_player.id) then
    raise exception 'Removing a player must preserve match history.';
  end if;

  select * into v_opponent from public.manage_player('add', v_league, 'Nicolás González');
  if v_opponent.id <> v_player.id or not v_opponent.active or v_opponent.points <> 12
    or v_opponent.played <> 4 or v_opponent.balls <> 2 then
    raise exception 'Reactivation must reuse the original ID and statistics.';
  end if;
end;
$$;

rollback;
