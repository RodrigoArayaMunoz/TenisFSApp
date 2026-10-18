import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('../services/fixtureService.js', import.meta.url), 'utf8');
const playerA = { id: randomUUID(), name: 'Álex López', league_id: 'B' };
const playerB = { id: randomUUID(), name: 'Rodrigo Araya', league_id: 'B' };
const details = { leagueId: 'B', playerA, playerB, matchDate: '2099-10-20', matchTime: '18:30' };
const makeService = (dependencies = {}) => vm.runInNewContext(
  source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')
    + '\n({createFixtureRequest,submitFixture,buildFixtureWhatsAppMessage,getChileSchedule,formatFixtureDate,fetchFixturesByLeague});',
  {
    randomUUID, AbortController, setTimeout, clearTimeout, TypeError,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://tenisfs-test.invalid/', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-key' } },
    fetch: () => { throw new Error('Unexpected network request'); },
    ...dependencies,
  }
);
const receipt = (request) => ({
  id: randomUUID(), request_id: request.p_request_id, league_id: request.p_league_id,
  player_a_id: request.p_player_a_id, player_b_id: request.p_player_b_id,
  match_date: request.p_match_date, match_time: `${request.p_match_time}:00`,
});

test('fixture requests require distinct active players from the selected league', () => {
  const service = makeService();
  for (const change of [
    { leagueId: null }, { playerA: null }, { playerB: { ...playerB, id: 'invalid' } },
    { playerB: playerA }, { playerB: { ...playerB, league_id: 'C' } },
    { playerA: { ...playerA, league_id: 'C' } }, { playerA: { ...playerA, active: false } },
  ]) assert.throws(() => service.createFixtureRequest({ ...details, ...change }), /liga|jugadores|activo/);
  const request = service.createFixtureRequest(details);
  assert.equal(request.p_league_id, 'B');
  assert.equal(request.p_player_a_id, playerA.id);
  assert.equal(request.p_player_b_id, playerB.id);
  assert.equal(Object.hasOwn(request, 'court'), false);
});

test('dates must exist, times use a 24 hour clock and past schedules are rejected', () => {
  const service = makeService();
  for (const matchDate of ['', '20/10/2099', '2099-02-29', '2099-02-30', '2099-13-01']) {
    assert.throws(() => service.createFixtureRequest({ ...details, matchDate }), /fecha válida/);
  }
  for (const matchTime of ['', '25:00', '24:00', '18:60', '6:30', '18:30:01']) {
    assert.throws(() => service.createFixtureRequest({ ...details, matchTime }), /hora válida/);
  }
  assert.throws(() => service.createFixtureRequest({ ...details, matchDate: '2000-01-01' }), /futuras/);
  assert.equal(service.createFixtureRequest({ ...details, matchDate: '2096-02-29' }).p_match_date, '2096-02-29');
  assert.equal(service.getChileSchedule(new Date('2026-01-01T01:30:00Z')).date, '2025-12-31');
  assert.equal(service.getChileSchedule(new Date('2026-01-01T01:30:00Z')).time, '22:30');
});

test('retries preserve the request ID and accept only a matching Supabase receipt', async () => {
  const calls = [];
  const service = makeService({ fetch: async (url, options) => {
    const request = JSON.parse(options.body);
    calls.push({ url, ...options });
    return new Response(JSON.stringify(receipt(request)));
  } });
  const request = service.createFixtureRequest(details);
  const retry = service.createFixtureRequest({ ...details, requestId: request.p_request_id });
  await service.submitFixture(request);
  await service.submitFixture(retry);
  assert.equal(calls[0].url, 'https://tenisfs-test.invalid/rest/v1/rpc/create_fixture');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].body, calls[1].body);
  for (const change of [() => null, () => [], () => ({}), (row) => ({ ...row, id: null }),
    (row) => ({ ...row, request_id: randomUUID() }), (row) => ({ ...row, league_id: 'C' }),
    (row) => ({ ...row, player_a_id: playerB.id }), (row) => ({ ...row, player_b_id: playerA.id }),
    (row) => ({ ...row, match_date: '2099-10-21' }), (row) => ({ ...row, match_time: '20:00:00' }),
  ]) {
    const invalid = makeService({ fetch: async () => new Response(JSON.stringify(change(receipt(request)))) });
    await assert.rejects(invalid.submitFixture(request), /No se pudo confirmar/);
  }
});

test('server and connection errors retain actionable messages', async () => {
  const request = makeService().createFixtureRequest(details);
  const missing = makeService({ fetch: async () => new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 }) });
  await assert.rejects(missing.submitFixture(request), /aún no está habilitado/);
  const rejected = makeService({ fetch: async () => new Response(JSON.stringify({ message: 'Jugador inactivo' }), { status: 400 }) });
  await assert.rejects(rejected.submitFixture(request), /Jugador inactivo/);
  const disconnected = makeService({ fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(disconnected.submitFixture(request), /Revisa tu conexión/);
  const timeout = makeService({ fetch: async () => { const error = new Error(); error.name = 'AbortError'; throw error; } });
  await assert.rejects(timeout.submitFixture(request), /no se duplicará/);
});

test('WhatsApp includes the exact league, players and Chilean schedule without a court', () => {
  const message = makeService().buildFixtureWhatsAppMessage({ ...details, league: { name: 'Liga B' } });
  for (const text of ['Liga B', 'Álex López vs Rodrigo Araya', '20 de octubre de 2099', '18:30 hrs. (hora de Chile)']) assert.ok(message.includes(text));
  assert.equal(/cancha/i.test(message), false);
});

const card = (changes = {}) => ({
  id: randomUUID(), league_id: 'B', player_a_name: playerA.name, player_b_name: playerB.name,
  match_date: '2099-10-20', match_time: '18:30:00', ...changes,
});

test('public fixture reads filter the league, paginate and pass a cancellation signal', async () => {
  const calls = [];
  const rows = Array.from({ length: 50 }, () => card());
  const service = makeService({ fetch: async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify(calls.length === 1 ? rows : [card()]));
  } });
  const first = await service.fetchFixturesByLeague('B');
  assert.equal(first.fixtures.length, 50);
  assert.equal(first.hasMore, true);
  assert.equal(first.nextOffset, 50);
  const controller = new AbortController();
  const second = await service.fetchFixturesByLeague('B', { offset: first.nextOffset, signal: controller.signal });
  assert.equal(second.hasMore, false);
  assert.equal(second.nextOffset, 51);
  assert.equal(calls[0].url, 'https://tenisfs-test.invalid/rest/v1/rpc/list_fixtures');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].body), { p_league_id: 'B', p_limit: 50, p_offset: 50 });
  controller.abort();
  assert.equal(calls[1].signal.aborted, false, 'completed requests remove the cancellation listener');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
});

test('fixture reads accept empty leagues and reject mixed leagues or malformed cards', async () => {
  const empty = await makeService({ fetch: async () => new Response('[]') }).fetchFixturesByLeague('B');
  assert.equal(empty.fixtures.length, 0);
  assert.equal(empty.hasMore, false);
  for (const rows of [null, {}, [card({ league_id: 'C' })], [card({ id: null })],
    [card({ player_a_name: '' })], [card({ player_b_name: null })],
    [card({ match_date: '2099-02-30' })], [card({ match_time: '24:00:00' })],
  ]) {
    const service = makeService({ fetch: async () => new Response(JSON.stringify(rows)) });
    await assert.rejects(service.fetchFixturesByLeague('B'), /No se pudo confirmar la lista/);
  }
});

test('fixture read failures are errors, and obsolete league requests can be cancelled', async () => {
  const service = makeService();
  await assert.rejects(service.fetchFixturesByLeague(null), /Selecciona una liga/);
  await assert.rejects(service.fetchFixturesByLeague('B', { offset: -1 }), /página/);
  const missing = makeService({ fetch: async () => new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 }) });
  await assert.rejects(missing.fetchFixturesByLeague('B'), /consulta de partidos aún no está habilitada/);
  const disconnected = makeService({ fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(disconnected.fetchFixturesByLeague('B'), /Revisa tu conexión/);
  const controller = new AbortController();
  const cancellable = makeService({ fetch: async (_url, options) => {
    controller.abort();
    assert.equal(options.signal.aborted, true);
    const failure = new Error('Cancelled'); failure.name = 'AbortError'; throw failure;
  } });
  await assert.rejects(cancellable.fetchFixturesByLeague('B', { signal: controller.signal }), { name: 'AbortError' });
});
