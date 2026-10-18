import { randomUUID } from 'expo-crypto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const FIXTURE_TIME_ZONE = 'America/Santiago';

export const getChileSchedule = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FIXTURE_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
};

export const formatFixtureDate = (date, options = {}) => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', ...options,
}).format(new Date(`${date}T12:00:00Z`));

export const createFixtureRequest = ({ leagueId, playerA, playerB, matchDate, matchTime, requestId = randomUUID() }) => {
  if (!leagueId) throw new Error('Selecciona una liga.');
  if (!UUID.test(playerA?.id || '') || !UUID.test(playerB?.id || '')) {
    throw new Error('Selecciona los dos jugadores.');
  }
  if (playerA.id === playerB.id) throw new Error('Selecciona dos jugadores diferentes.');
  if (playerA.league_id !== leagueId || playerB.league_id !== leagueId) {
    throw new Error('Los dos jugadores deben pertenecer a la liga seleccionada.');
  }
  if (playerA.active === false || playerB.active === false) {
    throw new Error('Uno de los jugadores ya no está activo. Actualiza la lista.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate || '')
    || Number.isNaN(Date.parse(`${matchDate}T12:00:00Z`))
    || new Date(`${matchDate}T12:00:00Z`).toISOString().slice(0, 10) !== matchDate) {
    throw new Error('Selecciona una fecha válida.');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(matchTime || '')) {
    throw new Error('Selecciona una hora válida.');
  }
  const now = getChileSchedule();
  if (`${matchDate}T${matchTime}` <= `${now.date}T${now.time}`) {
    throw new Error('La fecha y hora del partido deben ser futuras (hora de Chile).');
  }
  if (!UUID.test(requestId || '')) throw new Error('No se pudo preparar el partido. Intenta nuevamente.');
  return {
    p_request_id: requestId,
    p_league_id: leagueId,
    p_player_a_id: playerA.id,
    p_player_b_id: playerB.id,
    p_match_date: matchDate,
    p_match_time: matchTime,
  };
};

export const submitFixture = async (request) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('No se pudo conectar con el registro de partidos. Contacta al administrador.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/create_fixture`, {
      method: 'POST', signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json', 'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (['PGRST202', '42883', '42P01'].includes(body?.code)) {
        throw new Error('El registro de partidos aún no está habilitado. Contacta al administrador.');
      }
      throw new Error(body?.message || 'No se pudo guardar el partido. Intenta nuevamente.');
    }
    const fixture = Array.isArray(body) ? body[0] : body;
    if (!UUID.test(fixture?.id || '') || fixture.request_id !== request.p_request_id
      || fixture.league_id !== request.p_league_id
      || fixture.player_a_id !== request.p_player_a_id || fixture.player_b_id !== request.p_player_b_id
      || fixture.match_date !== request.p_match_date
      || fixture.match_time?.slice(0, 5) !== request.p_match_time) {
      throw new Error('No se pudo confirmar el registro. Reintenta; el partido no se duplicará.');
    }
    return fixture;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('El guardado tardó demasiado. Reintenta; el partido no se duplicará.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar. Revisa tu conexión y vuelve a intentar.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const buildFixtureWhatsAppMessage = ({ league, playerA, playerB, matchDate, matchTime }) => [
  '🎾 *Nuevo partido programado*',
  `🏆 ${league.name}`,
  '',
  `*${playerA.name} vs ${playerB.name}*`,
  `📅 ${formatFixtureDate(matchDate)}`,
  `🕒 ${matchTime} hrs. (hora de Chile)`,
].join('\n');

export const fetchFixturesByLeague = async (leagueId, { offset = 0, signal } = {}) => {
  if (typeof leagueId !== 'string' || !leagueId.trim()) throw new Error('Selecciona una liga para ver sus partidos.');
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('No se pudo cargar esta página de partidos.');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('No se pudo conectar con los partidos. Intenta nuevamente más tarde.');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 15000);
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/list_fixtures`, {
      method: 'POST', signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json', 'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_league_id: leagueId, p_limit: 50, p_offset: offset }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (['PGRST202', '42883', '42P01'].includes(body?.code)) {
        throw new Error('La consulta de partidos aún no está habilitada. Contacta al administrador.');
      }
      throw new Error(body?.message || 'No se pudieron cargar los partidos. Intenta nuevamente.');
    }
    if (!Array.isArray(body) || body.length > 50 || body.some((fixture) =>
      !UUID.test(fixture?.id || '') || fixture.league_id !== leagueId
      || typeof fixture.player_a_name !== 'string' || !fixture.player_a_name.trim()
      || typeof fixture.player_b_name !== 'string' || !fixture.player_b_name.trim()
      || !/^\d{4}-\d{2}-\d{2}$/.test(fixture.match_date || '')
      || Number.isNaN(Date.parse(`${fixture.match_date}T12:00:00Z`))
      || new Date(`${fixture.match_date}T12:00:00Z`).toISOString().slice(0, 10) !== fixture.match_date
      || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(fixture.match_time || '')
    )) throw new Error('No se pudo confirmar la lista de partidos. Intenta nuevamente.');
    return { fixtures: body, hasMore: body.length === 50, nextOffset: offset + body.length };
  } catch (error) {
    if (error.name === 'AbortError') {
      if (signal?.aborted) throw error;
      throw new Error('La consulta tardó demasiado. Revisa tu conexión y vuelve a intentar.');
    }
    if (error instanceof TypeError) throw new Error('No se pudo conectar. Revisa tu conexión y vuelve a intentar.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
};
