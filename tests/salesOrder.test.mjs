import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const catalogSource = await readFile(new URL('../services/salesCatalog.js', import.meta.url), 'utf8');
const catalog = vm.runInNewContext(catalogSource.replace(/^export /gm, '') + '\n({SALES_PRODUCTS,getSalesCartTotal});', { require: (image) => image });
const serviceSource = await readFile(new URL('../services/salesOrderService.js', import.meta.url), 'utf8');
const cartSource = await readFile(new URL('../services/salesCart.js', import.meta.url), 'utf8');
const player = { id: '00000000-0000-4000-8000-000000000001', name: 'Jugador de prueba', league_id: 'B' };
const makeService = (dependencies = {}) => vm.runInNewContext(
  serviceSource.replace(/^import .*from .*;\r?\n/gm, '').replace(/^export /gm, '') + '\n({createSalesOrderRequest,submitSalesOrder});',
  {
    ...catalog, randomUUID, AbortController, setTimeout, clearTimeout, TypeError,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://tenisfs-test.invalid/', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-key' } },
    fetch: () => { throw new Error('Unexpected network request'); },
    ...dependencies,
  }
);
const makeCart = (dependencies) => vm.runInNewContext(
  cartSource.replace(/^import .*from .*;\r?\n/gm, '').replace(/^export /gm, '') + '\nuseSalesCart;',
  { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(), createSalesOrderRequest: makeService().createSalesOrderRequest, ...dependencies }
);
const receipt = (request) => ({
  id: randomUUID(), request_id: request.p_request_id,
  player_id: request.p_player_id, player_name: 'Jugador de prueba',
  league_id: 'B', league_name: 'Liga B', total: request.p_expected_total,
  status: 'Pendiente', created_at: '2026-10-17T12:00:00Z',
});
const plain = (value) => JSON.parse(JSON.stringify(value));

test('order requests send product IDs and quantities with the exact promoted total', () => {
  const service = makeService();
  const quantities = { grip: 3, 'pelotas-dunlop': 2, 'pelotas-tecnifibre': 4, 'cuerda-dunlop-explosive': 1, 'servicio-encordado': 2 };
  const request = service.createSalesOrderRequest({ playerId: player.id, quantities });
  assert.equal(request.p_player_id, player.id);
  assert.equal(request.p_expected_total, 104000);
  assert.deepEqual(Object.keys(request).sort(), ['p_expected_total', 'p_items', 'p_player_id', 'p_request_id']);
  assert.equal(new Set(Array.from(request.p_items, (item) => item.product_id)).size, 5);
  assert.equal(request.p_items.every((item) => Object.keys(item).length === 2 && !Object.hasOwn(item, 'price')), true);
  assert.equal(quantities.grip, 3);
  assert.notEqual(service.createSalesOrderRequest({ playerId: player.id, quantities }).p_request_id, request.p_request_id);
});

test('invalid players, unknown products, empty carts and invalid quantities never become order requests', () => {
  const service = makeService();
  for (const playerId of [null, '', 'not-a-uuid']) assert.throws(() => service.createSalesOrderRequest({ playerId, quantities: { grip: 1 } }), /jugador válido/);
  assert.throws(() => service.createSalesOrderRequest({ playerId: player.id, quantities: {} }), /Agrega un producto/);
  assert.throws(() => service.createSalesOrderRequest({ playerId: player.id, quantities: { missing: 1 } }), /producto/);
  for (const quantity of [0, -1, 1.5, 1000, Infinity, '3']) assert.throws(() => service.createSalesOrderRequest({ playerId: player.id, quantities: { grip: quantity } }), /entre 1 y 999/);
});

test('confirmation calls the atomic RPC once and accepts only its matching receipt', async () => {
  const calls = [];
  const service = makeService({ fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, ...options, body });
    return new Response(JSON.stringify(receipt(body)));
  } });
  const request = service.createSalesOrderRequest({ playerId: player.id, quantities: { grip: 3 } });
  const order = await service.submitSalesOrder(request);
  assert.equal(order.total, 8000);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://tenisfs-test.invalid/rest/v1/rpc/create_sales_order');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[0].body, plain(request));
  assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
});

test('empty or mismatched responses are not treated as saved orders', async () => {
  for (const change of [() => null, () => ({}), () => [], (order) => ({ ...order, total: 1 }), (order) => ({ ...order, player_id: randomUUID() }), (order) => ({ ...order, request_id: randomUUID() }), (order) => ({ ...order, status: 'unknown' }), (order) => ({ ...order, created_at: undefined })]) {
    const service = makeService({ fetch: async (_url, options) => new Response(JSON.stringify(change(receipt(JSON.parse(options.body))))) });
    const request = service.createSalesOrderRequest({ playerId: player.id, quantities: { grip: 1 } });
    await assert.rejects(service.submitSalesOrder(request), /No se pudo confirmar/);
  }
});

test('missing server setup and connection failures produce actionable errors', async () => {
  const request = makeService().createSalesOrderRequest({ playerId: player.id, quantities: { grip: 1 } });
  const missingRpc = makeService({ fetch: async () => new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 }) });
  await assert.rejects(missingRpc.submitSalesOrder(request), /aún no está habilitado/);
  const disconnected = makeService({ fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(disconnected.submitSalesOrder(request), /Revisa tu conexión/);
  let cleared = false;
  const timedOut = makeService({
    setTimeout: (callback) => { callback(); return 7; },
    clearTimeout: (id) => { assert.equal(id, 7); cleared = true; },
    fetch: async (_url, { signal }) => {
      assert.equal(signal.aborted, true);
      throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
    },
  });
  await assert.rejects(timedOut.submitSalesOrder(request), /no se duplicará/);
  assert.equal(cleared, true);
});

test('double confirmation shares one submission and clears the cart only after success', async () => {
  const calls = [];
  let resolveServer;
  const pending = new Promise((resolve) => { resolveServer = resolve; });
  const useCart = makeCart({ submitSalesOrder: (request) => { calls.push(request); return pending; } });
  const grip = catalog.SALES_PRODUCTS.find((product) => product.id === 'grip');
  useCart().addProduct(grip, 3);
  const first = useCart().placeOrder(player);
  const second = useCart().placeOrder(player);
  assert.equal(first, second);
  assert.equal(useCart().checkoutStatus, 'submitting');
  assert.equal(useCart().quantities.grip, 3);
  assert.equal(useCart().addProduct(grip), 0);
  assert.equal(useCart().deleteProduct(grip), 0);
  await Promise.resolve();
  assert.equal(calls.length, 1);
  resolveServer(receipt(calls[0]));
  const order = await first;
  assert.equal(useCart().checkoutStatus, 'success');
  assert.equal(Object.keys(useCart().quantities).length, 0);
  assert.equal(useCart().lastOrder.id, order.id);
  assert.equal(useCart().orderPlayer, null);
  useCart().addProduct(grip);
  assert.equal(useCart().lastOrder, null);
});

test('failed submissions preserve the cart and reuse the request ID when retried', async () => {
  const calls = [];
  const useCart = makeCart({ submitSalesOrder: async (request) => {
    calls.push(request);
    if (calls.length === 1) throw new Error('Connection lost');
    return receipt(request);
  } });
  useCart().addProduct(catalog.SALES_PRODUCTS.find((product) => product.id === 'grip'), 3);
  const originalQuantities = useCart().quantities;
  await assert.rejects(useCart().placeOrder(player), /Connection lost/);
  assert.equal(useCart().quantities, originalQuantities);
  assert.equal(useCart().orderPlayer.id, player.id);
  assert.equal(useCart().checkoutStatus, 'error');
  useCart().clearCheckoutError();
  await useCart().placeOrder(player);
  assert.equal(calls[0].p_request_id, calls[1].p_request_id);
  assert.equal(useCart().lastOrder.total, 8000);
});

test('changing quantities after an unsuccessful attempt creates a new request identity', async () => {
  const calls = [];
  const useCart = makeCart({ submitSalesOrder: async (request) => { calls.push(request); throw new Error('Failure'); } });
  const grip = catalog.SALES_PRODUCTS.find((product) => product.id === 'grip');
  useCart().addProduct(grip, 3);
  await assert.rejects(useCart().placeOrder(player));
  useCart().addProduct(grip);
  await assert.rejects(useCart().placeOrder(player));
  assert.notEqual(calls[0].p_request_id, calls[1].p_request_id);
  assert.equal(calls[1].p_expected_total, 11000);
});

test('confirming without a player keeps the cart and never calls the server', async () => {
  let calls = 0;
  const useCart = makeCart({ submitSalesOrder: async () => { calls++; } });
  useCart().addProduct(catalog.SALES_PRODUCTS.find((product) => product.id === 'grip'));
  await assert.rejects(useCart().placeOrder(undefined), /jugador válido/);
  assert.equal(calls, 0);
  assert.equal(useCart().quantities.grip, 1);
  assert.equal(useCart().checkoutStatus, 'error');
});
