import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { after, beforeEach, test } from 'node:test';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://tenisfs-test.invalid';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
const source = await readFile(new URL('../services/resultService.js', import.meta.url), 'utf8');
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

test('order players include active players from every league and preserve duplicate names as distinct IDs', async () => {
  const players = [
    { id: 'player-b', name: 'Alex López', league_id: 'B', league: { id: 'B', name: 'Liga B' } },
    { id: 'player-c', name: 'Alex López', league_id: 'C', league: { id: 'C', name: 'Liga C' } },
  ];
  responses.push({ body: players });
  assert.deepEqual(await service.fetchActivePlayers(), players);
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.url.pathname, '/rest/v1/players');
  assert.equal(request.url.searchParams.has('league_id'), false);
  assert.equal(request.url.searchParams.get('active'), 'eq.true');
  assert.equal(request.url.searchParams.get('select'), 'id,name,league_id,league:leagues(id,name)');
  assert.equal(request.url.searchParams.get('order'), 'name.asc,id.asc');
  assert.equal(request.method ?? 'GET', 'GET');
});

test('player loading paginates past the server page limit and passes the cancellation signal', async () => {
  const firstPage = Array.from({ length: 1000 }, (_, index) => ({ id: `player-${index}`, name: `Jugador ${index}`, league_id: 'B' }));
  const finalPage = [{ id: 'last-player', name: 'Último jugador', league_id: 'C' }];
  responses.push({ body: firstPage }, { body: finalPage });
  const controller = new AbortController();
  const players = await service.fetchActivePlayers({ signal: controller.signal });
  assert.equal(players.length, 1001);
  assert.deepEqual(players.at(-1), finalPage[0]);
  assert.deepEqual(requests.map((request) => request.url.searchParams.get('offset')), ['0', '1000']);
  assert.equal(requests.every((request) => request.signal === controller.signal), true);
});

test('empty player lists are valid and server failures are not presented as an empty successful list', async () => {
  responses.push({ body: [] });
  assert.deepEqual(await service.fetchActivePlayers(), []);
  responses.push({ body: { message: 'No autorizado' }, status: 403 });
  await assert.rejects(service.fetchActivePlayers(), /No autorizado/);
  responses.push({ body: { unexpected: true } });
  await assert.rejects(service.fetchActivePlayers(), /No se pudieron cargar los jugadores/);
});
