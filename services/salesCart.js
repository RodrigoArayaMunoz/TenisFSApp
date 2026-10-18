import { useSyncExternalStore } from 'react';
import { createSalesOrderRequest, submitSalesOrder } from './salesOrderService';

const EMPTY_CART = Object.freeze({ quantities: Object.freeze({}), orderPlayer: null, checkoutStatus: 'idle', checkoutError: '', lastOrder: null });
let cart = EMPTY_CART;
let retryRequest = null;
let submission = null;
const subscribers = new Set();
const getCart = () => cart;
const getServerCart = () => EMPTY_CART;
const subscribe = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// Keep the selection while navigating within this app session.
const updateQuantity = (product, nextQuantity) => {
  if (cart.checkoutStatus === 'submitting') return 0;
  const stockLimit = Number.isFinite(product.stock) ? product.stock : Infinity;
  const quantity = Math.max(0, Math.min(stockLimit, nextQuantity));
  const previousQuantity = cart.quantities[product.id] || 0;
  if (previousQuantity === quantity) return 0;
  const nextQuantities = { ...cart.quantities };
  if (quantity === 0) {
    delete nextQuantities[product.id];
  } else {
    nextQuantities[product.id] = quantity;
  }
  retryRequest = null;
  cart = { ...EMPTY_CART, quantities: nextQuantities, orderPlayer: Object.keys(nextQuantities).length ? cart.orderPlayer : null };
  subscribers.forEach((callback) => callback());
  return quantity - previousQuantity;
};

const placeOrder = (player) => {
  if (submission) return submission;
  let request;
  try {
    request = createSalesOrderRequest({
      playerId: player?.id,
      quantities: cart.quantities,
      requestId: retryRequest && retryRequest.p_player_id === player?.id ? retryRequest.p_request_id : undefined,
    });
  } catch (error) {
    cart = { ...cart, checkoutStatus: 'error', checkoutError: error.message };
    subscribers.forEach((callback) => callback());
    return Promise.reject(error);
  }
  retryRequest = request;
  cart = { ...cart, orderPlayer: player, checkoutStatus: 'submitting', checkoutError: '', lastOrder: null };
  subscribers.forEach((callback) => callback());
  submission = Promise.resolve().then(() => submitSalesOrder(request))
    .then((order) => {
      retryRequest = null;
      cart = { ...EMPTY_CART, checkoutStatus: 'success', lastOrder: order };
      subscribers.forEach((callback) => callback());
      return order;
    })
    .catch((error) => {
      cart = { ...cart, checkoutStatus: 'error', checkoutError: error.message };
      subscribers.forEach((callback) => callback());
      throw error;
    })
    .finally(() => { submission = null; });
  return submission;
};

export function useSalesCart() {
  const snapshot = useSyncExternalStore(subscribe, getCart, getServerCart);
  return {
    quantities: snapshot.quantities,
    orderPlayer: snapshot.orderPlayer,
    checkoutStatus: snapshot.checkoutStatus,
    checkoutError: snapshot.checkoutError,
    lastOrder: snapshot.lastOrder,
    dismissOrderReceipt: () => {
      if (!cart.lastOrder) return;
      cart = { ...cart, lastOrder: null, checkoutStatus: 'idle' };
      subscribers.forEach((callback) => callback());
    },
    placeOrder,
    clearCheckoutError: () => {
      if (cart.checkoutStatus !== 'error') return;
      cart = { ...cart, checkoutStatus: 'idle', checkoutError: '' };
      subscribers.forEach((callback) => callback());
    },
    setOrderPlayer: (player) => {
      if (cart.checkoutStatus === 'submitting') return;
      if (!player?.id || !player?.name) throw new Error('Selecciona un jugador válido.');
      if (!Object.keys(cart.quantities).length) throw new Error('Agrega un producto antes de seleccionar al jugador del pedido.');
      if (cart.orderPlayer?.id !== player.id) retryRequest = null;
      cart = { ...cart, orderPlayer: player, checkoutStatus: 'idle', checkoutError: '' };
      subscribers.forEach((callback) => callback());
    },
    addProduct: (product, amount = 1) => {
      if (!Number.isSafeInteger(amount) || amount < 1) {
        throw new RangeError('La cantidad debe ser un entero mayor que cero.');
      }
      return updateQuantity(product, (cart.quantities[product.id] || 0) + amount);
    },
    removeProduct: (product) => updateQuantity(product, (cart.quantities[product.id] || 0) - 1),
    deleteProduct: (product) => updateQuantity(product, 0),
  };
}
