import test from "node:test";
import assert from "node:assert/strict";
import { createLocalDb } from "../assets/js/data/local-db.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

const seed = {
  site: { brand: "Test" },
  banners: [],
  theme: {},
  categories: [
    { id: "rolly", code: "rolly", name: "Роллы", sortOrder: 1, isActive: true },
    { id: "sety", code: "sety", name: "Сеты", sortOrder: 2, isActive: true },
  ],
  products: [
    {
      id: "p1",
      code: "california",
      name: "Калифорния",
      categoryCode: "rolly",
      price: 450,
      sortOrder: 1,
      isAvailable: true,
      imageUrl: "https://example.com/1.jpg",
      tags: [],
      modifications: [],
      toppingGroups: [],
    },
    {
      id: "p2",
      code: "hotset",
      name: "Горячий сет",
      categoryCode: "sety",
      price: 1100,
      sortOrder: 2,
      isAvailable: false,
      imageUrl: "https://example.com/2.jpg",
      tags: [],
      modifications: [],
      toppingGroups: [],
    },
  ],
};

test("local-db init and query products", async () => {
  const storage = createMemoryStorage();
  const db = createLocalDb({ storage, fetchSeed: async () => seed });
  await db.init();

  const categories = db.getCategories();
  assert.equal(categories.length, 2);
  assert.equal(categories[0].code, "rolly");

  const allProducts = db.getProducts({ page: 1, pageSize: 10, onlyAvailable: false });
  assert.equal(allProducts.items.length, 2);

  const availableOnly = db.getProducts({ page: 1, pageSize: 10, onlyAvailable: true });
  assert.equal(availableOnly.items.length, 1);
  assert.equal(availableOnly.items[0].code, "california");

  const bySearch = db.getProducts({ search: "сет", page: 1, pageSize: 10 });
  assert.equal(bySearch.items.length, 1);
  assert.equal(bySearch.items[0].code, "hotset");
});

test("local-db admin auth", async () => {
  const storage = createMemoryStorage();
  const db = createLocalDb({ storage, fetchSeed: async () => seed });
  await db.init();

  assert.throws(() => db.loginAdmin("admin", "wrong"));
  const session = db.loginAdmin("admin", "admin123");
  assert.equal(session.role, "admin");
  assert.equal(db.getCurrentAdmin().login, "admin");

  db.logoutAdmin();
  assert.equal(db.getCurrentAdmin(), null);
});
