import { clearAdminAccess, getAdminAccessKey } from './adminSession';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const STATUSES = ['Pendiente', 'Completado', 'Cancelado'];
const validAmount = (value) => value === null || (Number.isSafeInteger(value) && value >= 0);
const accessError = () => Object.assign(new Error('Ingresa nuevamente al panel de administrador.'), { code: 'ADMIN_AUTH_REQUIRED' });

const requestOrders = async (rpc, parameters, { signal, action = 'cargar los pedidos' } = {}) => {
  const adminKey = getAdminAccessKey();
  if (!adminKey) throw accessError();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('No se pudo conectar con la gestión de pedidos.');
  let response;
  try {
    response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      signal,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_admin_key: adminKey, ...parameters }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(`No se pudo ${action}. Revisa tu conexión e intenta nuevamente.`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.code === '28000') { clearAdminAccess(); throw accessError(); }
    if (['PGRST202','42883','42P01'].includes(body?.code)) throw new Error('La gestión de pedidos aún no está habilitada en el servidor. Contacta al administrador.');
    if (body?.code === 'P0002') throw new Error('El pedido ya no existe. Actualiza la lista de pedidos.');
    if (body?.code === '23514') throw new Error('El pedido fue cancelado y no se puede confirmar. Actualiza la lista de pedidos.');
    throw new Error(`No se pudo ${action}. Revisa tu conexión e intenta nuevamente.`);
  }
  return body;
};

export const fetchSalesOrders = async ({ limit = 20, offset = 0, status = null, search = '', signal } = {}) => {
  if (!getAdminAccessKey()) throw accessError();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0
    || (status !== null && !STATUSES.includes(status)) || typeof search !== 'string' || search.length > 100) {
    throw new Error('Los filtros de pedidos no son válidos.');
  }
  const body = await requestOrders('list_sales_orders', { p_limit: limit, p_offset: offset, p_status: status, p_search: search.trim() }, { signal });
  if (!body || !Array.isArray(body.orders) || !Number.isSafeInteger(body.matching_count) || body.matching_count < 0
    || !Number.isSafeInteger(body.stats?.total) || body.stats.total < 0 || !Number.isSafeInteger(body.stats?.pending) || body.stats.pending < 0
    || body.offset !== offset || body.limit !== limit || typeof body.has_more !== 'boolean'
    || body.orders.some((order) => !order.id || !order.player_name || !order.league_name || Number.isNaN(Date.parse(order.created_at))
      || !STATUSES.includes(order.status) || !validAmount(order.total) || !Array.isArray(order.items)
      || order.items.some((item) => !item.product_id || !item.product_name || !Number.isSafeInteger(item.quantity) || item.quantity < 1
        || !validAmount(item.unit_price) || !validAmount(item.subtotal)))) {
    throw new Error('No se pudieron interpretar los pedidos. Intenta actualizar la lista.');
  }
  return body;
};

export const confirmSalesOrder = async (orderId) => {
  if (!getAdminAccessKey()) throw accessError();
  if (typeof orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error('Selecciona un pedido válido para confirmar.');
  }
  const body = await requestOrders('confirm_sales_order', { p_order_id: orderId }, { action: 'confirmar el pedido' });
  if (!body || typeof body.id !== 'string' || body.id.toLowerCase() !== orderId.toLowerCase() || body.status !== 'Completado') {
    throw new Error('No se pudo verificar la confirmación. Actualiza la lista o intenta confirmar nuevamente.');
  }
  return body;
};
