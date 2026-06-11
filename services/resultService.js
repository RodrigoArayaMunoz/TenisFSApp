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
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      typeof body === 'object' && body?.message
        ? body.message
        : 'No se pudo completar la solicitud en Supabase.';

    throw new Error(message);
  }

  return body;
};

export const fetchPlayersByLeague = async (leagueId) => {
  const params = new URLSearchParams({
    select: 'id,name',
    league_id: `eq.${leagueId}`,
    active: 'eq.true',
    order: 'name.asc',
  });

  return requestSupabase(`players?${params.toString()}`);
};

export const fetchLeagueStandings = async (leagueId) => {
  const params = new URLSearchParams({
    select: 'id,name,points,played,balls',
    league_id: `eq.${leagueId}`,
    active: 'eq.true',
    order: 'points.desc,balls.desc,name.asc',
  });

  return requestSupabase(`players?${params.toString()}`);
};

export const submitPendingMatchResult = async (matchResult) =>
  requestSupabase('match_results', {
    method: 'POST',
    body: JSON.stringify(matchResult),
  });

export const fetchPendingMatchResults = async () => {
  const params = new URLSearchParams({
    select:
      'id,league_id,set_1_player_a,set_1_player_b,set_2_player_a,set_2_player_b,set_3_player_a,set_3_player_b,submitted_at,status,player_a:players!match_results_player_a_id_fkey(name),player_b:players!match_results_player_b_id_fkey(name),winner:players!match_results_winner_id_fkey(name),ball_provider:players!match_results_ball_provider_id_fkey(name)',
    status: 'eq.Pendiente',
    order: 'submitted_at.asc',
  });

  const results = await requestSupabase(`match_results?${params.toString()}`);

  return results.map((result) => ({
    id: result.id,
    league: result.league_id,
    players: [
      {
        name: result.player_a?.name ?? 'Jugador A',
        scores: [
          result.set_1_player_a,
          result.set_2_player_a,
          result.set_3_player_a,
        ],
      },
      {
        name: result.player_b?.name ?? 'Jugador B',
        scores: [
          result.set_1_player_b,
          result.set_2_player_b,
          result.set_3_player_b,
        ],
      },
    ],
    winnerName: result.winner?.name ?? 'Sin registro',
    ballsProvider: result.ball_provider?.name ?? 'Sin registro',
  }));
};

export const reviewMatchResult = async (matchResultId, status) =>
  requestSupabase('rpc/review_match_result', {
    method: 'POST',
    body: JSON.stringify({
      p_match_result_id: matchResultId,
      p_status: status,
      p_admin_id: null,
      p_rejection_reason: null,
    }),
  });
