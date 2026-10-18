-- Run after sales_orders.sql. Uses the existing public."Admin" PIN table.
-- Keeps order tables private; administrator access is checked on every operation.
begin;

create or replace function public.list_sales_orders(
  p_admin_key text,
  p_limit integer default 20,
  p_offset integer default 0,
  p_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text;
  v_result jsonb;
begin
  if p_admin_key is null or p_admin_key !~ '^[0-9]{4}$' then
    raise exception 'Ingresa nuevamente al panel de administrador.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public."Admin" a
    where case
      when pg_typeof(a."Admin_Key")::text in ('smallint','integer','bigint','numeric')
        then a."Admin_Key"::numeric = p_admin_key::numeric
      else a."Admin_Key"::text = p_admin_key
    end
  ) then
    raise exception 'Ingresa nuevamente al panel de administrador.' using errcode = '28000';
  end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception 'La página de pedidos solicitada no es válida.';
  end if;
  if p_status is not null and p_status not in ('Pendiente','Completado','Cancelado') then
    raise exception 'El estado del pedido no es válido.';
  end if;
  v_search := translate(lower(regexp_replace(trim(coalesce(p_search,'')), '[[:space:]]+', ' ', 'g')), 'áéíóúüñ', 'aeiouun');
  if char_length(v_search) > 100 then
    raise exception 'La búsqueda debe tener como máximo 100 caracteres.';
  end if;

  with matching as materialized (
    select o.id, o.player_id, o.player_name, o.league_id, o.league_name, o.total, o.status, o.created_at
    from public.sales_orders o
    where (p_status is null or o.status = p_status)
      and (v_search = ''
        or strpos(translate(lower(o.player_name || ' ' || o.league_name || ' ' || o.id::text), 'áéíóúüñ', 'aeiouun'), v_search) > 0
        or exists (
          select 1 from public.sales_order_items i where i.order_id = o.id
            and strpos(translate(lower(i.product_name), 'áéíóúüñ', 'aeiouun'), v_search) > 0
        )
      )
  ), page as (
    select * from matching order by created_at desc, id desc limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'player_id', o.player_id, 'player_name', o.player_name,
        'league_id', o.league_id, 'league_name', o.league_name,
        'total', o.total, 'status', o.status, 'created_at', o.created_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product_id', i.product_id, 'product_name', i.product_name,
            'quantity', i.quantity, 'unit_price', i.unit_price, 'subtotal', i.subtotal
          ) order by i.product_name, i.product_id)
          from public.sales_order_items i where i.order_id = o.id
        ), '[]'::jsonb)
      ) order by o.created_at desc, o.id desc) from page o
    ), '[]'::jsonb),
    'matching_count', (select count(*) from matching),
    'stats', (select jsonb_build_object('total',count(*),'pending',count(*) filter (where status = 'Pendiente')) from public.sales_orders),
    'offset', p_offset,
    'limit', p_limit,
    'has_more', p_offset::bigint + p_limit < (select count(*) from matching)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.list_sales_orders(text, integer, integer, text, text) from public;
grant execute on function public.list_sales_orders(text, integer, integer, text, text) to anon, authenticated;

create or replace function public.confirm_sales_order(p_admin_key text, p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.sales_orders;
begin
  if p_admin_key is null or p_admin_key !~ '^[0-9]{4}$' then
    raise exception 'Ingresa nuevamente al panel de administrador.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public."Admin" a
    where case
      when pg_typeof(a."Admin_Key")::text in ('smallint','integer','bigint','numeric')
        then a."Admin_Key"::numeric = p_admin_key::numeric
      else a."Admin_Key"::text = p_admin_key
    end
  ) then
    raise exception 'Ingresa nuevamente al panel de administrador.' using errcode = '28000';
  end if;

  -- Serialize simultaneous confirmations and allow safe retries after a lost response.
  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'El pedido ya no existe.' using errcode = 'P0002';
  end if;
  if v_order.status = 'Cancelado' then
    raise exception 'El pedido fue cancelado y no se puede confirmar.' using errcode = '23514';
  end if;
  if v_order.status = 'Pendiente' then
    update public.sales_orders set status = 'Completado' where id = v_order.id;
  end if;
  return jsonb_build_object('id', v_order.id, 'status', 'Completado');
end;
$$;

revoke all on function public.confirm_sales_order(text, uuid) from public;
grant execute on function public.confirm_sales_order(text, uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
