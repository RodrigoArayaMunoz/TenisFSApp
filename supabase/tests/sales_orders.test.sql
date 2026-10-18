-- Run after sales_orders.sql against a test database. All fixtures roll back.
begin;

insert into public.leagues (id, name) values ('_order_test_b', 'Liga de prueba B'), ('_order_test_c', 'Liga de prueba C');
insert into public.players (id, league_id, name, active) values
  ('00000000-0000-4000-8000-000000000001', '_order_test_b', 'Jugador de prueba B', true),
  ('00000000-0000-4000-8000-000000000002', '_order_test_c', 'Jugador de prueba C', true),
  ('00000000-0000-4000-8000-000000000003', '_order_test_b', 'Jugador inactivo', false);

create function pg_temp.expect_order_error(p_sql text, p_message text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_message in sqlerrm) = 0 then
      raise exception 'Unexpected error: %, expected: %', sqlerrm, p_message;
    end if;
    return;
  end;
  raise exception 'Expected failure: %', p_message;
end;
$$;

do $$
declare
  v_order jsonb;
  v_retry jsonb;
  v_before integer;
  v_items jsonb := '[{"product_id":"grip","quantity":3},{"product_id":"pelotas-dunlop","quantity":2},{"product_id":"pelotas-tecnifibre","quantity":4},{"product_id":"cuerda-dunlop-explosive","quantity":1},{"product_id":"servicio-encordado","quantity":2}]';
begin
  select count(*) into v_before from public.sales_orders;
  v_order := public.create_sales_order('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', v_items, 104000);
  if (v_order->>'total')::bigint <> 104000 or v_order->>'status' <> 'Pendiente' or v_order->>'league_id' <> '_order_test_b' then
    raise exception 'Mixed order receipt is incorrect: %', v_order;
  end if;
  if (select count(*) from public.sales_order_items where order_id = (v_order->>'id')::uuid) <> 5 then
    raise exception 'Order did not save every line';
  end if;
  if not exists (select 1 from public.sales_order_items where order_id = (v_order->>'id')::uuid and product_id = 'grip' and quantity = 3 and unit_price = 3000 and subtotal = 8000) then
    raise exception 'Grip promotion was not applied';
  end if;

  -- Input order is irrelevant to idempotency.
  v_retry := public.create_sales_order('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
    '[{"product_id":"servicio-encordado","quantity":2},{"product_id":"cuerda-dunlop-explosive","quantity":1},{"product_id":"pelotas-tecnifibre","quantity":4},{"product_id":"pelotas-dunlop","quantity":2},{"product_id":"grip","quantity":3}]', 104000);
  if v_retry <> v_order or (select count(*) from public.sales_orders) <> v_before + 1 then
    raise exception 'Retry duplicated or changed the order';
  end if;

  update public.players set name = 'Nombre actualizado', active = false where id = '00000000-0000-4000-8000-000000000001';
  update public.sales_products set unit_price = 3500 where id = 'grip';
  v_retry := public.create_sales_order('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', v_items, 104000);
  if v_retry <> v_order or v_retry->>'player_name' <> 'Jugador de prueba B' then
    raise exception 'Retry must return the historical receipt despite later changes';
  end if;
  update public.players set name = 'Jugador de prueba B', active = true where id = '00000000-0000-4000-8000-000000000001';
  update public.sales_products set unit_price = 3000 where id = 'grip';

  -- Other leagues are allowed and seven balls use the cheapest pack combination.
  v_retry := public.create_sales_order('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '[{"product_id":"pelotas-dunlop","quantity":7}]', 72000);
  if v_retry->>'league_id' <> '_order_test_c' or (v_retry->>'total')::bigint <> 72000 then
    raise exception 'Cross-league player or combined ball promotion failed';
  end if;
end;
$$;

do $$
declare
  v_before integer;
  v_quantity jsonb;
begin
  select count(*) into v_before from public.sales_orders;
  perform pg_temp.expect_order_error($q$select public.create_sales_order('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','[{"product_id":"grip","quantity":1}]',3000)$q$, 'otro pedido');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000003','[{"product_id":"grip","quantity":1}]',3000)$q$, 'jugador ya no');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),gen_random_uuid(),'[{"product_id":"grip","quantity":1}]',3000)$q$, 'jugador ya no');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(null,'00000000-0000-4000-8000-000000000001','[{"product_id":"grip","quantity":1}]',3000)$q$, 'Selecciona un jugador');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','{}',0)$q$, 'lista de productos');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','[]',0)$q$, 'entre 1 y 100');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','[{"product_id":"grip","quantity":1},{"product_id":"grip","quantity":2}]',8000)$q$, 'más de una vez');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','[{"product_id":"grip","quantity":1},{"product_id":"missing","quantity":1}]',3000)$q$, 'producto');
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','[{"product_id":"grip","quantity":1,"price":1}]',1)$q$, 'precios del catálogo cambiaron');
  for v_quantity in select value from jsonb_array_elements('[0,-1,1.5,1000,"3",null]') loop
    perform pg_temp.expect_order_error(format(
      'select public.create_sales_order(gen_random_uuid(),%L,%L,3000)',
      '00000000-0000-4000-8000-000000000001', jsonb_build_array(jsonb_build_object('product_id','grip','quantity',v_quantity))::text
    ), 'cantidad entera');
  end loop;
  update public.sales_products set stock = 2 where id = 'grip';
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','[{"product_id":"grip","quantity":3}]',8000)$q$, 'stock suficiente');
  update public.sales_products set stock = null, active = false where id = 'grip';
  perform pg_temp.expect_order_error($q$select public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','[{"product_id":"grip","quantity":1}]',3000)$q$, 'producto');
  update public.sales_products set active = true where id = 'grip';
  if (select count(*) from public.sales_orders) <> v_before then
    raise exception 'An invalid order left partial records';
  end if;
end;
$$;

insert into public.sales_products (id, name) values ('_test_quote', 'Producto sin precio');
do $$
declare v_order jsonb;
begin
  v_order := public.create_sales_order(gen_random_uuid(), '00000000-0000-4000-8000-000000000001', '[{"product_id":"_test_quote","quantity":1}]', null);
  if v_order->'total' <> 'null'::jsonb then raise exception 'Unknown prices must keep the total pending'; end if;
  if has_table_privilege('anon','public.sales_orders','SELECT')
    or has_table_privilege('anon','public.sales_orders','INSERT')
    or has_table_privilege('authenticated','public.sales_order_items','SELECT')
    or has_table_privilege('authenticated','public.sales_order_items','UPDATE') then
    raise exception 'Order data is exposed through direct table grants';
  end if;
end;
$$;

-- Public application roles can create through the RPC, despite table RLS.
set local role anon;
select public.create_sales_order('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','[{"product_id":"servicio-encordado","quantity":1}]',6000);
reset role;

rollback;
