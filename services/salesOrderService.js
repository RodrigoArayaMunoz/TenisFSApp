import { randomUUID } from 'expo-crypto';
import { SALES_PRODUCTS, getSalesCartTotal } from './salesCatalog';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createSalesOrderRequest = ({ playerId, quantities, requestId = randomUUID() }) => {
  if (!UUID.test(playerId || '') || !UUID.test(requestId || '')) {
    throw new Error('Selecciona un jugador válido antes de confirmar el pedido.');
  }
  const items = Object.entries(quantities).map(([productId, quantity]) => {
    if (!SALES_PRODUCTS.some((product) => product.id === productId)) throw new Error('Uno de los productos ya no está disponible. Revisa tu carrito.');
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Selecciona entre 1 y 999 unidades de cada producto.');
    return { product_id: productId, quantity };
  }).sort((first, second) => first.product_id.localeCompare(second.product_id));
  if (!items.length) throw new Error('Agrega un producto antes de confirmar el pedido.');
  return {
    p_request_id: requestId,
    p_player_id: playerId,
    p_items: items,
    p_expected_total: getSalesCartTotal(SALES_PRODUCTS, quantities),
  };
};

export const submitSalesOrder = async (request) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('No se pudo conectar con el registro de pedidos. Contacta al administrador.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/create_sales_order`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (['PGRST202', '42883', '42P01'].includes(body?.code)) {
        throw new Error('El registro de pedidos aún no está habilitado. Contacta al administrador.');
      }
      throw new Error(body?.message || 'No se pudo guardar el pedido. Intenta nuevamente.');
    }
    const order = Array.isArray(body) ? body[0] : body;
    if (!order || !UUID.test(order.id || '') || order.request_id !== request.p_request_id
      || order.player_id !== request.p_player_id || !order.player_name || !order.league_name
      || !['Pendiente', 'Completado', 'Cancelado'].includes(order.status)
      || Number.isNaN(Date.parse(order.created_at))
      || order.total !== request.p_expected_total) {
      throw new Error('No se pudo confirmar el registro del pedido. Vuelve a intentar; tu carrito se conserva.');
    }
    return order;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La confirmación tardó demasiado. Vuelve a intentar; el pedido no se duplicará.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar. Revisa tu conexión y vuelve a confirmar el pedido.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
