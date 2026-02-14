import { STORAGE_KEYS } from "../shared/constants.js";

function read(storage) {
  const raw = storage.getItem(STORAGE_KEYS.CART);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createCartStore(storage = window.localStorage) {
  let items = read(storage);

  function persist() {
    storage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
  }

  function getItems() {
    return [...items];
  }

  function getCount() {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }

  function getTotal() {
    return items.reduce((sum, item) => sum + item.qty * item.price, 0);
  }

  function add(product, qty = 1, modifiers = null) {
    const key = `${product.id}:${modifiers ? JSON.stringify(modifiers) : "base"}`;
    const existing = items.find((item) => item.key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        key,
        productId: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        qty,
        modifiers,
      });
    }
    items = items.filter((item) => item.qty > 0);
    persist();
  }

  function setQty(key, qty) {
    const next = Number(qty);
    const item = items.find((row) => row.key === key);
    if (!item) {
      return;
    }
    item.qty = Math.max(0, next);
    items = items.filter((row) => row.qty > 0);
    persist();
  }

  function remove(key) {
    items = items.filter((item) => item.key !== key);
    persist();
  }

  function clear() {
    items = [];
    persist();
  }

  return {
    getItems,
    getCount,
    getTotal,
    add,
    setQty,
    remove,
    clear,
  };
}
