const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const getSupabaseUrl = (path) =>
  `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`;

const parseResponseBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const requestSupabase = async (path, options = {}) => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const response = await fetch(getSupabaseUrl(path), {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    if (body?.code === 'PGRST202') {
      throw new Error('La gestión de jugadores aún no está habilitada en el servidor. Contacta al administrador.');
    }

    const message =
      typeof body === 'object' && body?.message
        ? body.message
        : 'No se pudo consultar Supabase.';

    throw new Error(message);
  }

  return body;
};

export const verifyAdminKey = async (adminKey) => {
  const params = new URLSearchParams({
    select: 'id',
    Admin_Key: `eq.${adminKey}`,
    limit: '1',
  });

  const admins = await requestSupabase(`Admin?${params.toString()}`);

  return Array.isArray(admins) && admins.length > 0;
};

export const fetchLeagues = async () => {
  const params = new URLSearchParams({ select: 'id,name', order: 'name.asc' });
  const leagues = await requestSupabase(`leagues?${params.toString()}`);

  if (!Array.isArray(leagues)) {
    throw new Error('No se pudieron cargar las ligas. Intenta nuevamente.');
  }

  return leagues;
};

const managePlayer = async (action, leagueId, details) => {
  const result = await requestSupabase('rpc/manage_player', {
    method: 'POST',
    body: JSON.stringify({
      p_action: action,
      p_league_id: leagueId,
      ...details,
    }),
  });
  const player = Array.isArray(result) ? result[0] : result;

  if (!player?.id || player.active !== (action === 'add')) {
    throw new Error('No se pudo confirmar el cambio. Actualiza los jugadores antes de volver a intentar.');
  }

  return player;
};

export const addPlayer = (leagueId, name) => {
  const cleanName = name.trim().replace(/\s+/g, ' ');

  if (!leagueId || cleanName.length < 2 || cleanName.length > 80) {
    throw new Error('Selecciona una liga e ingresa un nombre de entre 2 y 80 caracteres.');
  }

  return managePlayer('add', leagueId, { p_name: cleanName });
};

export const removePlayer = (leagueId, playerId) => {
  if (!leagueId || !playerId) {
    throw new Error('Selecciona la liga y el jugador que deseas eliminar.');
  }

  return managePlayer('remove', leagueId, { p_player_id: playerId });
};
