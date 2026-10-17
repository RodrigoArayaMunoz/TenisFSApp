import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, beforeEach, test } from 'node:test';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://tenisfs-test.invalid';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
const source = await readFile(new URL('../services/adminService.js', import.meta.url), 'utf8');
const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let requests;
let responses;

beforeEach(() => {
  requests = [];
  responses = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: new URL(url), ...options });
    assert.ok(responses.length, 'An unexpected request was attempted');
    const { body, status = 200 } = responses.shift();
    return new Response(JSON.stringify(body), { status });
  };
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
});

const authorize = async () => {
  responses.push({ body: [{ id: 1 }] });
  assert.equal(await service.verifyAdminKey('1234'), true);
};

test('adds and removes players without administrator verification', async () => {
  responses.push({ body: { id: 'player-id', name: 'Nicolás González', active: true } });
  assert.equal((await service.addPlayer('B', 'Nicolás González')).active, true);
  responses.push({ body: { id: 'player-id', active: false } });
  assert.equal((await service.removePlayer('B', 'player-id')).active, false);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.url.pathname, '/rest/v1/rpc/manage_player');
    assert.equal(Object.hasOwn(JSON.parse(request.body), 'p_admin_key'), false);
  }
});

test('the administrator panel still validates its entrance PIN', async () => {
  await authorize();
  responses.push({ body: [] });
  assert.equal(await service.verifyAdminKey('9999'), false);
});

test('fetches the actual leagues without hardcoded options', async () => {
  responses.push({ body: [{ id: 'D', name: 'Liga D' }] });
  assert.deepEqual(await service.fetchLeagues(), [{ id: 'D', name: 'Liga D' }]);
  assert.equal(requests[0].url.pathname, '/rest/v1/leagues');
  assert.equal(requests[0].url.searchParams.get('select'), 'id,name');
});

test('normalizes player names without forwarding the panel PIN to the RPC', async () => {
  await authorize();
  responses.push({ body: { id: 'new-id', name: 'Nicolás González', active: true } });
  const player = await service.addPlayer('B', '  Nicolás   González  ');
  assert.equal(player.name, 'Nicolás González');
  const request = requests[1];
  assert.equal(request.method, 'POST');
  assert.equal(request.url.pathname, '/rest/v1/rpc/manage_player');
  assert.deepEqual(JSON.parse(request.body), {
    p_action: 'add', p_league_id: 'B', p_name: 'Nicolás González',
  });
  assert.equal(request.url.search, '');
});

test('validates missing league, blank and overlong names before making requests', () => {
  assert.throws(() => service.addPlayer(null, 'Nicolás González'), /Selecciona una liga/);
  assert.throws(() => service.addPlayer('B', '  '), /entre 2 y 80/);
  assert.throws(() => service.addPlayer('B', 'x'.repeat(81)), /entre 2 y 80/);
  assert.throws(() => service.removePlayer('B', null), /Selecciona la liga/);
  assert.equal(requests.length, 0);
});

test('removes only the chosen player in the chosen league through the RPC', async () => {
  responses.push({ body: { id: 'player-id', active: false } });
  assert.equal((await service.removePlayer('C', 'player-id')).active, false);
  assert.deepEqual(JSON.parse(requests[0].body), {
    p_action: 'remove', p_league_id: 'C', p_player_id: 'player-id',
  });
});

test('propagates duplicate-name errors and rejects unconfirmed mutations', async () => {
  responses.push({ body: { code: '23505', message: 'Ya existe un jugador con ese nombre en esta liga.' }, status: 409 });
  await assert.rejects(service.addPlayer('B', 'Nicolás González'), /Ya existe un jugador/);
  responses.push({ body: null });
  await assert.rejects(service.removePlayer('B', 'player-id'), /No se pudo confirmar/);
});

test('reports an actionable error when the RPC has not been installed', async () => {
  responses.push({ body: { code: 'PGRST202', message: 'Function not found' }, status: 404 });
  await assert.rejects(service.addPlayer('B', 'Nicolás González'), /aún no está habilitada en el servidor/);
});
