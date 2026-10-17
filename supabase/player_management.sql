-- Run after results_schema.sql. Player mutations do not require an Admin PIN.
-- Mutations go through this function; players keeps its read-only client policy.
-- Also upgrades installations that already have the previous PIN-based function.
begin;

drop function if exists public.manage_player(text, text, text, text, uuid);

create or replace function public.manage_player(
  p_action text,
  p_league_id text,
  p_name text default null,
  p_player_id uuid default null
)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_player public.players;
begin
  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'La liga seleccionada ya no está disponible.';
  end if;

  if p_action = 'add' then
    v_name := trim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
    if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80 then
      raise exception 'El nombre debe tener entre 2 y 80 caracteres.';
    end if;

    -- Serialize additions of the same name, including different letter casing.
    perform pg_advisory_xact_lock(hashtext(p_league_id), hashtext(lower(v_name)));
    select * into v_player
    from public.players
    where league_id = p_league_id and lower(name) = lower(v_name)
    order by active desc, created_at asc
    limit 1
    for update;

    if found then
      if v_player.active then
        raise exception 'Ya existe un jugador con ese nombre en esta liga.'
          using errcode = '23505';
      end if;
      -- Restore a removed player without losing their match references or totals.
      update public.players set active = true, name = v_name
      where id = v_player.id returning * into v_player;
    else
      insert into public.players (league_id, name)
      values (p_league_id, v_name) returning * into v_player;
    end if;
  elsif p_action = 'remove' then
    -- Preserve historical results and foreign keys when removing a player.
    update public.players set active = false
    where id = p_player_id and league_id = p_league_id and active = true
    returning * into v_player;

    if not found then
      raise exception 'El jugador ya no está disponible. Actualiza la lista.';
    end if;
  else
    raise exception 'La acción solicitada no es válida.';
  end if;

  return v_player;
end;
$$;

revoke all on function public.manage_player(text, text, text, uuid) from public;
grant execute on function public.manage_player(text, text, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
