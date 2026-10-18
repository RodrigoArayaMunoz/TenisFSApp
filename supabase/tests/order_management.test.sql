-- Run after sales_orders.sql and order_management.sql in a test database.
-- All fixtures and changes roll back.
begin;
create table if not exists public."Admin" (id bigint primary key, "Admin_Key" text not null);
insert into public."Admin" (id,"Admin_Key") values (9000001,'2468'),(9000002,'0123');
insert into public.leagues (id,name) values ('_management_test','Liga gestión SQL');
insert into public.players (id,league_id,name) values ('00000000-0000-4000-8000-000000000021','_management_test','Nicolás Gestión SQL');

create function pg_temp.expect_management_error(p_key text, p_limit integer, p_offset integer, p_status text, p_search text, p_message text)
returns void language plpgsql as $$
begin
  begin
    perform public.list_sales_orders(p_key,p_limit,p_offset,p_status,p_search);
  exception when others then
    if position(p_message in sqlerrm) = 0 then raise exception 'Unexpected error: %',sqlerrm; end if;
    return;
  end;
  raise exception 'Expected an error containing %',p_message;
end;
$$;

do $$
declare
  v_first jsonb; v_second jsonb; v_third jsonb; v_page jsonb;
  v_total bigint; v_pending bigint; v_sorted uuid[];
begin
  select count(*), count(*) filter (where status='Pendiente') into v_total,v_pending from public.sales_orders;
  v_first := public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000021','[{"product_id":"grip","quantity":3}]',8000);
  v_second := public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000021','[{"product_id":"servicio-encordado","quantity":2}]',12000);
  v_third := public.create_sales_order(gen_random_uuid(),'00000000-0000-4000-8000-000000000021','[{"product_id":"pelotas-dunlop","quantity":2}]',23000);
  update public.sales_orders set created_at='2026-10-17T12:00:00Z' where id=(v_first->>'id')::uuid;
  update public.sales_orders set created_at='2026-10-17T13:00:00Z',status='Completado' where id=(v_second->>'id')::uuid;
  update public.sales_orders set created_at='2026-10-17T13:00:00Z',status='Cancelado' where id=(v_third->>'id')::uuid;
  select array_agg(id order by created_at desc,id desc) into v_sorted from public.sales_orders where player_id='00000000-0000-4000-8000-000000000021';
  v_page := public.list_sales_orders('2468',1,0,null,'nicolas gestion sql');
  if (v_page->>'matching_count')::integer <> 3 or jsonb_array_length(v_page->'orders') <> 1 or not (v_page->>'has_more')::boolean
    or v_page->'orders'->0->>'id' <> v_sorted[1]::text then raise exception 'First page, accent-insensitive search or sorting failed'; end if;
  if (v_page->'stats'->>'total')::bigint <> v_total+3 or (v_page->'stats'->>'pending')::bigint <> v_pending+1 then raise exception 'Global statistics failed'; end if;
  v_page := public.list_sales_orders('2468',1,1,null,'nicolas gestion sql');
  if v_page->'orders'->0->>'id' <> v_sorted[2]::text then raise exception 'Second page failed'; end if;
  v_page := public.list_sales_orders('2468',1,2,null,'nicolas gestion sql');
  if (v_page->>'has_more')::boolean or v_page->'orders'->0->>'id' <> v_sorted[3]::text then raise exception 'Final page failed'; end if;
  v_page := public.list_sales_orders('2468',20,0,'Pendiente','nicolas gestion sql');
  if (v_page->>'matching_count')::integer <> 1 or v_page->'orders'->0->'items'->0->>'subtotal' <> '8000' then raise exception 'Status filter or promoted line details failed'; end if;
  if (v_page->'orders'->0) ? 'request_id' or (v_page->'orders'->0) ? 'request_items' then raise exception 'Idempotency metadata should not be exposed'; end if;
  update public.sales_order_items set product_name='Encordado histórico gestión_sql' where order_id=(v_second->>'id')::uuid;
  update public.players set active=false,name='Nombre actualizado' where id='00000000-0000-4000-8000-000000000021';
  v_page := public.list_sales_orders('2468',20,0,null,'historico gestion_sql');
  if (v_page->>'matching_count')::integer <> 1 or v_page->'orders'->0->>'player_name' <> 'Nicolás Gestión SQL'
    or v_page->'orders'->0->'items'->0->>'product_name' <> 'Encordado histórico gestión_sql' then raise exception 'Historical product search and player snapshots failed'; end if;
  v_page := public.list_sales_orders('2468',20,0,null,'%');
  if (v_page->>'matching_count')::integer <> 0 then raise exception 'Search must treat wildcards literally'; end if;
end;
$$;

select pg_temp.expect_management_error(null,20,0,null,null,'administrador');
select pg_temp.expect_management_error('9999',20,0,null,null,'administrador');
select pg_temp.expect_management_error('24',20,0,null,null,'administrador');
select pg_temp.expect_management_error('2468',0,0,null,null,'página');
select pg_temp.expect_management_error('2468',101,0,null,null,'página');
select pg_temp.expect_management_error('2468',20,-1,null,null,'página');
select pg_temp.expect_management_error('2468',20,0,'invalid',null,'estado');
select pg_temp.expect_management_error('2468',20,0,null,repeat('x',101),'100 caracteres');

create function pg_temp.expect_confirmation_error(p_key text, p_id uuid, p_message text)
returns void language plpgsql as $$
begin
  begin
    perform public.confirm_sales_order(p_key,p_id);
  exception when others then
    if position(p_message in sqlerrm) = 0 then raise exception 'Unexpected confirmation error: %',sqlerrm; end if;
    return;
  end;
  raise exception 'Expected confirmation error containing %',p_message;
end;
$$;

do $$
declare
  v_id uuid; v_cancelled uuid; v_before jsonb; v_items jsonb;
  v_receipt jsonb; v_page jsonb; v_pending bigint; v_total bigint;
begin
  select id, to_jsonb(o) - 'status' into v_id,v_before from public.sales_orders o
    where player_id='00000000-0000-4000-8000-000000000021' and status='Pendiente';
  select id into v_cancelled from public.sales_orders
    where player_id='00000000-0000-4000-8000-000000000021' and status='Cancelado';
  select jsonb_agg(to_jsonb(i) order by product_id) into v_items from public.sales_order_items i where order_id=v_id;
  select count(*), count(*) filter (where status='Pendiente') into v_total,v_pending from public.sales_orders;
  perform pg_temp.expect_confirmation_error(null,v_id,'administrador');
  perform pg_temp.expect_confirmation_error('9999',v_id,'administrador');
  perform pg_temp.expect_confirmation_error('24',v_id,'administrador');
  if (select status from public.sales_orders where id=v_id) <> 'Pendiente' then raise exception 'Unauthorized confirmation changed the order'; end if;
  perform pg_temp.expect_confirmation_error('2468',null,'ya no existe');
  perform pg_temp.expect_confirmation_error('2468','ffffffff-ffff-4fff-8fff-ffffffffffff','ya no existe');
  perform pg_temp.expect_confirmation_error('2468',v_cancelled,'cancelado');
  if (select status from public.sales_orders where id=v_cancelled) <> 'Cancelado' then raise exception 'Cancelled order was changed'; end if;
  v_receipt := public.confirm_sales_order('2468',v_id);
  if v_receipt <> jsonb_build_object('id',v_id,'status','Completado') then raise exception 'Confirmation receipt failed'; end if;
  if public.confirm_sales_order('2468',v_id) <> v_receipt then raise exception 'Confirmation retry is not idempotent'; end if;
  if (select status from public.sales_orders where id=v_id) <> 'Completado' then raise exception 'Confirmation was not saved'; end if;
  if (select to_jsonb(o)-'status' from public.sales_orders o where id=v_id) <> v_before
    or (select jsonb_agg(to_jsonb(i) order by product_id) from public.sales_order_items i where order_id=v_id) <> v_items then
    raise exception 'Confirmation modified snapshots, timestamps or prices';
  end if;
  v_page := public.list_sales_orders('2468',20,0,'Pendiente','nicolas gestion sql');
  if (v_page->>'matching_count')::integer <> 0 or (v_page->'stats'->>'pending')::bigint <> v_pending-1
    or (v_page->'stats'->>'total')::bigint <> v_total then raise exception 'Pending filter or counts did not update'; end if;
  v_page := public.list_sales_orders('2468',20,0,'Completado','nicolas gestion sql');
  if (v_page->>'matching_count')::integer <> 2 then raise exception 'Completed filter did not include confirmation'; end if;
end;
$$;

-- Both numeric and text legacy PIN columns must work, including leading zeros.
select public.list_sales_orders('0123',1,0,null,'nicolas gestion sql');
select public.confirm_sales_order('0123',(select id from public.sales_orders where player_id='00000000-0000-4000-8000-000000000021' and status='Completado' limit 1));
alter table public."Admin" alter column "Admin_Key" type integer using "Admin_Key"::integer;
select public.list_sales_orders('0123',1,0,null,'nicolas gestion sql');
select public.confirm_sales_order('0123',(select id from public.sales_orders where player_id='00000000-0000-4000-8000-000000000021' and status='Completado' limit 1));
do $$
begin
  if has_table_privilege('anon','public.sales_orders','SELECT') or has_table_privilege('authenticated','public.sales_order_items','SELECT')
    or has_table_privilege('anon','public.sales_orders','UPDATE') or has_table_privilege('authenticated','public.sales_orders','UPDATE') then
    raise exception 'Order tables must remain private';
  end if;
end;
$$;
-- A protected RPC can confirm while direct table reads/writes remain unavailable.
select set_config('test.order_management_id',(select id::text from public.sales_orders where player_id='00000000-0000-4000-8000-000000000021' and status='Completado' limit 1),true);
set local role anon;
select public.list_sales_orders('2468',20,0,null,'nicolas gestion sql');
select public.confirm_sales_order('2468',current_setting('test.order_management_id')::uuid);
reset role;
rollback;
