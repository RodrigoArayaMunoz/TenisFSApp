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

const requestSupabase = async (path) => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const response = await fetch(getSupabaseUrl(path), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
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
