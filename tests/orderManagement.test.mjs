import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('../services/orderManagementService.js', import.meta.url), 'utf8');
const sessionSource = await readFile(new URL('../services/adminSession.js', import.meta.url), 'utf8');
const makeSession = () => vm.runInNewContext(sessionSource.replace(/^export /gm, '') + '\n({rememberAdminAccess,getAdminAccessKey,clearAdminAccess});');
const makeService = (session, fetch) => vm.runInNewContext(
  source.replace(/^import .*from .*;\r?\n/gm, '').replace(/^export /gm, '') + '\n({fetchSalesOrders,confirmSalesOrder});',
  { ...session, fetch, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://tenisfs-test.invalid/', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' } } }
);
const order = {
  id: '11111111-1111-4111-8111-111111111111', player_name: 'Nicolás González', league_name: 'Liga C',
  total: 8000, status: 'Pendiente', created_at: '2026-10-17T18:30:00Z',
  items: [{ product_id: 'grip', product_name: 'Nombre histórico del grip', quantity: 3, unit_price: 3000, subtotal: 8000 }],
};
const result = (overrides = {}) => ({ orders: [order], stats: { total: 21, pending: 8 }, matching_count: 21, offset: 0, limit: 20, has_more: true, ...overrides });

test('administrator access is reused in memory and removed on logout', () => {
  const session = makeSession();
  assert.equal(session.getAdminAccessKey(), null);
  session.rememberAdminAccess('2468');
  assert.equal(session.getAdminAccessKey(), '2468');
  session.clearAdminAccess();
  assert.equal(session.getAdminAccessKey(), null);
});

test('order reads require administrator access before making any request', async () => {
  let calls = 0;
  const service = makeService(makeSession(), async () => { calls++; });
  await assert.rejects(service.fetchSalesOrders(), (error) => error.code === 'ADMIN_AUTH_REQUIRED');
  assert.equal(calls, 0);
});

test('protected reads use POST body credentials, preserve snapshots, and pass filters and cancellation', async () => {
  const session = makeSession();
  session.rememberAdminAccess('2468');
  const calls = [];
  const service = makeService(session, async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify(result({ offset: 20 })));
  });
  const controller = new AbortController();
  const response = await service.fetchSalesOrders({ offset: 20, status: 'Pendiente', search: '  nicolas  ', signal: controller.signal });
  assert.equal(response.orders[0].items[0].product_name, 'Nombre histórico del grip');
  assert.equal(calls[0].url, 'https://tenisfs-test.invalid/rest/v1/rpc/list_sales_orders');
  assert.equal(calls[0].url.includes('2468'), false);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].signal, controller.signal);
  assert.deepEqual(JSON.parse(calls[0].body), { p_admin_key: '2468', p_limit: 20, p_offset: 20, p_status: 'Pendiente', p_search: 'nicolas' });
});

test('expired administrator access is cleared and requires a new login', async () => {
  const session = makeSession();
  session.rememberAdminAccess('2468');
  const service = makeService(session, async () => new Response(JSON.stringify({ code: '28000' }), { status: 403 }));
  await assert.rejects(service.fetchSalesOrders(), (error) => error.code === 'ADMIN_AUTH_REQUIRED');
  assert.equal(session.getAdminAccessKey(), null);
});

test('missing setup and network errors are actionable and do not masquerade as empty lists', async () => {
  const session = makeSession(); session.rememberAdminAccess('2468');
  const missing = makeService(session, async () => new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 }));
  await assert.rejects(missing.fetchSalesOrders(), /aún no está habilitada/);
  const offline = makeService(session, async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.fetchSalesOrders(), /Revisa tu conexión/);
});

test('invalid filters and malformed pages are rejected instead of displaying misleading orders', async () => {
  const session = makeSession(); session.rememberAdminAccess('2468');
  let calls = 0;
  const service = makeService(session, async () => { calls++; return new Response(JSON.stringify({})); });
  for (const options of [{ offset: -1 }, { limit: 101 }, { limit: 0 }, { status: 'Invalid' }, { search: 'x'.repeat(101) }]) {
    await assert.rejects(service.fetchSalesOrders(options), /filtros/);
  }
  assert.equal(calls, 0);
  for (const data of [null, {}, result({ offset: 20 }), result({ orders: [{ ...order, total: -1 }] }), result({ orders: [{ ...order, created_at: 'invalid' }] }), result({ orders: [{ ...order, items: [{ ...order.items[0], quantity: 0 }] }] })]) {
    const malformed = makeService(session, async () => new Response(JSON.stringify(data)));
    await assert.rejects(malformed.fetchSalesOrders(), /interpretar/);
  }
});

test('pending prices and genuine empty lists are valid responses', async () => {
  const session = makeSession(); session.rememberAdminAccess('2468');
  const pending = makeService(session, async () => new Response(JSON.stringify(result({ orders: [{ ...order, total: null, items: [{ ...order.items[0], unit_price: null, subtotal: null }] }] }))));
  assert.equal((await pending.fetchSalesOrders()).orders[0].total, null);
  const empty = makeService(session, async () => new Response(JSON.stringify(result({ orders: [], matching_count: 0, has_more: false, stats: { total: 0, pending: 0 } }))));
  assert.equal((await empty.fetchSalesOrders()).orders.length, 0);
});

test('confirming a specific order uses administrator credentials in the RPC body', async () => {
  const session = makeSession(); session.rememberAdminAccess('2468');
  const calls = [];
  const service = makeService(session, async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify({ id: order.id, status: 'Completado' }));
  });
  const receipt = await service.confirmSalesOrder(order.id);
  assert.equal(receipt.id, order.id);
  assert.equal(receipt.status, 'Completado');
  assert.equal(calls[0].url, 'https://tenisfs-test.invalid/rest/v1/rpc/confirm_sales_order');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].url.includes('2468'), false);
  assert.deepEqual(JSON.parse(calls[0].body), { p_admin_key: '2468', p_order_id: order.id });
});

test('confirmation requires a valid session and order before making any mutation', async () => {
  const session = makeSession(); let calls = 0;
  const service = makeService(session, async () => { calls++; });
  await assert.rejects(service.confirmSalesOrder(order.id), (error) => error.code === 'ADMIN_AUTH_REQUIRED');
  session.rememberAdminAccess('2468');
  for (const id of [null, undefined, '', 123, 'not-an-order', order.id + '/all']) {
    await assert.rejects(service.confirmSalesOrder(id), /pedido válido/);
  }
  assert.equal(calls, 0);
});

test('confirmation clears expired access and reports missing setup, cancelled and missing orders', async () => {
  const session = makeSession();
  for (const [code, expected] of [['28000', /administrador/], ['PGRST202', /aún no está habilitada/], ['23514', /cancelado/], ['P0002', /ya no existe/]]) {
    session.rememberAdminAccess('2468');
    const service = makeService(session, async () => new Response(JSON.stringify({ code }), { status: 400 }));
    await assert.rejects(service.confirmSalesOrder(order.id), expected);
    assert.equal(session.getAdminAccessKey(), code === '28000' ? null : '2468');
  }
});

test('confirmation is never reported as successful for malformed or unrelated receipts', async () => {
  const session = makeSession(); session.rememberAdminAccess('2468');
  for (const body of [null, {}, { id: 5, status: 'Completado' }, { id: order.id, status: 'Pendiente' }, { id: '22222222-2222-4222-8222-222222222222', status: 'Completado' }]) {
    const service = makeService(session, async () => new Response(JSON.stringify(body)));
    await assert.rejects(service.confirmSalesOrder(order.id), /verificar la confirmación/);
  }
});

test('lost confirmation responses can be retried for the same order', async () => {
  const session = makeSession(); session.rememberAdminAccess('2468');
  const ids = [];
  const service = makeService(session, async (_url, options) => {
    ids.push(JSON.parse(options.body).p_order_id);
    if (ids.length === 1) throw new TypeError('Connection lost after saving');
    return new Response(JSON.stringify({ id: order.id, status: 'Completado' }));
  });
  await assert.rejects(service.confirmSalesOrder(order.id), /confirmar el pedido.*Revisa tu conexión/);
  assert.equal((await service.confirmSalesOrder(order.id)).status, 'Completado');
  assert.deepEqual(ids, [order.id, order.id]);
});
