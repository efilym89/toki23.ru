import test from "node:test";
import assert from "node:assert/strict";
import { createLocalDb } from "../assets/js/data/local-db.js";
import { ORDER_STATUS } from "../assets/js/shared/constants.js";

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
  };
}

const seed = {
  site: { brand: "Test" },
  banners: [],
  theme: {},
  categories: [{ id: "rolly", code: "rolly", name: "Роллы", sortOrder: 1, isActive: true }],
  products: [
    {
      id: "p1",
      code: "philadelphia",
      name: "Филадельфия",
      categoryCode: "rolly",
      price: 899,
      sortOrder: 1,
      isAvailable: true,
      imageUrl: "https://example.com/philadelphia.jpg",
      tags: [],
      modifications: [],
      toppingGroups: [],
    },
  ],
};

test("order flow creates order, updates status and report", async () => {
  const storage = createMemoryStorage();
  let nowCounter = 0;
  const db = createLocalDb({
    storage,
    fetchSeed: async () => seed,
    now: () => {
      nowCounter += 1;
      return new Date(2026, 1, 13, 12, nowCounter, 0).toISOString();
    },
  });

  await db.init();

  const order = db.createOrder({
    customerName: "Иван",
    phone: "+7 (900) 000-00-00",
    comment: "Позвоните при доставке",
    method: "delivery",
    address: "Краснодар, ул. Тестовая, 1",
    items: [
      {
        productId: "p1",
        qty: 2,
        price: 899,
        name: "Филадельфия",
      },
    ],
  });

  assert.equal(order.total, 1798);
  assert.equal(order.status, ORDER_STATUS.NEW);
  assert.equal(order.items.length, 1);

  db.updateOrderStatus(order.id, ORDER_STATUS.COMPLETED);
  db.updateOrderPayment(order.id, true);

  const stored = db.getOrderById(order.id);
  assert.equal(stored.status, ORDER_STATUS.COMPLETED);
  assert.equal(stored.isPaid, true);

  const report = db.getSalesReport({ period: "today" });
  assert.equal(report.kpi.paidOrders, 1);
  assert.equal(report.kpi.revenue, 1798);
  assert.equal(report.topItems[0].qty, 2);

  const dashboard = db.getDashboardKpi();
  assert.equal(dashboard.newOrdersToday, 1);
  assert.equal(dashboard.revenueToday, 1798);
});
