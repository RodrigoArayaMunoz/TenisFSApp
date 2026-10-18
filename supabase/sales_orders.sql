-- Run after results_schema.sql in the Supabase SQL Editor.
-- Existing products/prices and historical orders are preserved on reruns.
begin;

create table if not exists public.sales_products (
  id text primary key,
  name text not null,
  unit_price bigint check (unit_price >= 0),
  stock integer check (stock >= 0),
  active boolean not null default true
);

create table if not exists public.sales_product_bundles (
  product_id text not null references public.sales_products(id),
  quantity integer not null check (quantity between 2 and 999),
  price bigint not null check (price >= 0),
  primary key (product_id, quantity)
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  player_id uuid not null references public.players(id),
  player_name text not null,
  league_id text not null,
  league_name text not null,
  request_items jsonb not null,
  total bigint check (total >= 0),
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Completado', 'Cancelado')),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_order_items (
  order_id uuid not null references public.sales_orders(id),
  product_id text not null references public.sales_products(id),
  product_name text not null,
  quantity integer not null check (quantity between 1 and 999),
  unit_price bigint check (unit_price >= 0),
  subtotal bigint check (subtotal >= 0),
  primary key (order_id, product_id)
);

create index if not exists sales_orders_player_created_idx on public.sales_orders (player_id, created_at desc);
create index if not exists sales_orders_status_created_idx on public.sales_orders (status, created_at desc);

insert into public.sales_products (id, name, unit_price) values
  ('grip', 'Grip', 3000),
  ('servicio-encordado', 'Servicio de encordado', 6000),
  ('cuerda-babolat-rpm-rough', 'Cuerda Babolat RPM Rough', 25000),
  ('cuerda-babolat-rpm-blast', 'Cuerda Babolat RPM Blast', 25000),
  ('cuerda-dunlop-explosive', 'Cuerda Dunlop Explosive', 18000),
  ('cuerda-kirschbaum-evolution', 'Cuerda Kirschbaum Evolution', 20000),
  ('cuerda-kirschbaum-pro-line', 'Cuerda Kirschbaum Pro Line Rough', 22000),
  ('cuerda-kirschbaum-orange', 'Cuerda Kirschbaum Orange', 16000),
  ('cuerda-yonex-polytour', 'Cuerda Yonex Polytour Strike', 24000),
  ('cuerda-zons-poly-blast', 'Cuerda Zons Poly Blast', 13000),
  ('cuerda-zons-polymo-tour', 'Cuerda Zons Polymo Tour', 14000),
  ('pelotas-dunlop', 'Pelotas Dunlop ATP Tour', 12000),
  ('pelotas-tecnifibre', 'Pelotas Tecnifibre X-One', 12000)
on conflict (id) do nothing;

insert into public.sales_product_bundles (product_id, quantity, price) values
  ('grip', 3, 8000),
  ('pelotas-dunlop', 2, 23000), ('pelotas-dunlop', 3, 34000),
  ('pelotas-dunlop', 4, 43000), ('pelotas-dunlop', 6, 60000),
  ('pelotas-tecnifibre', 2, 23000), ('pelotas-tecnifibre', 3, 34000),
  ('pelotas-tecnifibre', 4, 43000), ('pelotas-tecnifibre', 6, 60000)
on conflict (product_id, quantity) do nothing;

alter table public.sales_products enable row level security;
alter table public.sales_product_bundles enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;

-- Orders contain player details. Only the RPC can write on behalf of the app;
-- no public read/list or direct mutation permissions are granted.
revoke all on public.sales_products, public.sales_product_bundles, public.sales_orders, public.sales_order_items from public, anon, authenticated;
grant select, insert, update, delete on public.sales_products, public.sales_product_bundles, public.sales_orders, public.sales_order_items to service_role;

create or replace function public.create_sales_order(
  p_request_id uuid,
  p_player_id uuid,
  p_items jsonb,
  p_expected_total bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
  v_product public.sales_products;
  v_order public.sales_orders;
  v_entry jsonb;
  v_normalized jsonb;
  v_snapshots jsonb := '[]'::jsonb;
  v_quantity integer;
  v_count integer;
  v_index integer;
  v_costs bigint[];
  v_bundle_quantities integer[];
  v_bundle_prices bigint[];
  v_best bigint;
  v_subtotal bigint;
  v_total bigint := 0;
  v_league_name text;
begin
  if p_request_id is null or p_player_id is null then
    raise exception 'Selecciona un jugador y vuelve a confirmar el pedido.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'El pedido debe contener una lista de productos.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'El pedido debe contener entre 1 y 100 productos distintos.';
  end if;
  if p_expected_total < 0 then
    raise exception 'El total del pedido no es válido.';
  end if;

  for v_entry in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_entry) is distinct from 'object'
      or jsonb_typeof(v_entry->'product_id') is distinct from 'string'
      or char_length(v_entry->>'product_id') not between 1 and 100
      or jsonb_typeof(v_entry->'quantity') is distinct from 'number'
      or (v_entry->>'quantity') !~ '^[1-9][0-9]{0,2}$' then
      raise exception 'Cada producto debe tener una cantidad entera entre 1 y 999.';
    end if;
  end loop;
  if (select count(distinct value->>'product_id') from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then
    raise exception 'Un producto no puede aparecer más de una vez en el pedido.';
  end if;
  select jsonb_agg(jsonb_build_object('product_id', value->>'product_id', 'quantity', (value->>'quantity')::integer) order by value->>'product_id')
  into v_normalized from jsonb_array_elements(p_items);

  -- A retry with the same key returns the original receipt, even if prices or
  -- player activity changed after that order was saved.
  perform pg_advisory_xact_lock(hashtext(p_request_id::text)::bigint);
  select * into v_order from public.sales_orders where request_id = p_request_id;
  if found then
    if v_order.player_id <> p_player_id or v_order.request_items <> v_normalized
      or v_order.total is distinct from p_expected_total then
      raise exception 'Esta solicitud ya corresponde a otro pedido. Vuelve a abrir el carrito.';
    end if;
  else
    select * into v_player from public.players where id = p_player_id and active = true for share;
    if not found then
      raise exception 'El jugador ya no está disponible. Cierra esta ventana y vuelve a seleccionarlo.';
    end if;
    select name into v_league_name from public.leagues where id = v_player.league_id;

    for v_entry in select value from jsonb_array_elements(v_normalized) loop
      v_quantity := (v_entry->>'quantity')::integer;
      select * into v_product from public.sales_products
      where id = v_entry->>'product_id' and active = true for share;
      if not found then
        raise exception 'Uno de los productos ya no está disponible. Revisa tu carrito.';
      end if;
      if v_product.stock is not null and v_quantity > v_product.stock then
        raise exception 'No hay stock suficiente de %. Revisa la cantidad solicitada.', v_product.name;
      end if;

      if v_product.unit_price is null then
        v_subtotal := null;
      else
        select array_agg(quantity order by quantity), array_agg(price order by quantity)
        into v_bundle_quantities, v_bundle_prices
        from (select quantity, price from public.sales_product_bundles where product_id = v_product.id for share) bundles;
        v_costs := array[0::bigint];
        for v_count in 1..v_quantity loop
          v_best := v_costs[v_count] + v_product.unit_price;
          for v_index in 1..coalesce(cardinality(v_bundle_quantities), 0) loop
            if v_bundle_quantities[v_index] <= v_count then
              v_best := least(v_best, v_costs[v_count - v_bundle_quantities[v_index] + 1] + v_bundle_prices[v_index]);
            end if;
          end loop;
          v_costs := array_append(v_costs, v_best);
        end loop;
        v_subtotal := v_costs[v_quantity + 1];
      end if;
      v_total := v_total + v_subtotal;
      v_snapshots := v_snapshots || jsonb_build_array(jsonb_build_object(
        'product_id', v_product.id, 'product_name', v_product.name,
        'quantity', v_quantity, 'unit_price', v_product.unit_price, 'subtotal', v_subtotal
      ));
    end loop;

    if v_total is distinct from p_expected_total then
      raise exception 'Los precios del catálogo cambiaron. Actualiza la aplicación antes de confirmar el pedido.';
    end if;

    insert into public.sales_orders (request_id, player_id, player_name, league_id, league_name, request_items, total)
    values (p_request_id, v_player.id, v_player.name, v_player.league_id, v_league_name, v_normalized, v_total)
    returning * into v_order;

    insert into public.sales_order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    select v_order.id, product_id, product_name, quantity, unit_price, subtotal
    from jsonb_to_recordset(v_snapshots) as items(product_id text, product_name text, quantity integer, unit_price bigint, subtotal bigint);
  end if;

  return jsonb_build_object(
    'id', v_order.id, 'request_id', v_order.request_id,
    'player_id', v_order.player_id, 'player_name', v_order.player_name,
    'league_id', v_order.league_id, 'league_name', v_order.league_name,
    'total', v_order.total, 'status', v_order.status, 'created_at', v_order.created_at
  );
end;
$$;

revoke all on function public.create_sales_order(uuid, uuid, jsonb, bigint) from public;
grant execute on function public.create_sales_order(uuid, uuid, jsonb, bigint) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
