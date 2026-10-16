import { useSyncExternalStore } from 'react';

const EMPTY_CART = Object.freeze({});
let quantities = EMPTY_CART;
const subscribers = new Set();
const getCart = () => quantities;
const getServerCart = () => EMPTY_CART;
const subscribe = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// Keep the selection while navigating within this app session.
const updateQuantity = (product, nextQuantity) => {
  const quantity = Math.max(0, Math.min(product.stock, nextQuantity));
  if ((quantities[product.id] || 0) === quantity) return;
  const nextCart = { ...quantities };
  if (quantity === 0) {
    delete nextCart[product.id];
  } else {
    nextCart[product.id] = quantity;
  }
  quantities = nextCart;
  subscribers.forEach((callback) => callback());
};

export function useSalesCart() {
  const cart = useSyncExternalStore(subscribe, getCart, getServerCart);
  return {
    quantities: cart,
    addProduct: (product) => updateQuantity(product, (quantities[product.id] || 0) + 1),
    removeProduct: (product) => updateQuantity(product, (quantities[product.id] || 0) - 1),
  };
}