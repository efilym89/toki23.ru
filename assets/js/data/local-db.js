import { getAppConfig } from "../app-config.js";
import { LOG_ACTION, ORDER_METHOD, ORDER_STATUS, STORAGE_KEYS } from "../shared/constants.js";
import {
  clampPage,
  formatPhone,
  getPeriodRange,
  isOrderInSales,
  sortBySortOrder,
  toNumber,
  uid,
} from "../shared/utils.js";

function defaultDb(config, seed = null) {
  const categories = sortBySortOrder(seed?.categories || []).map((item) => ({
    id: item.id || item.code,
    code: item.code,
    name: item.name,
    description: item.description || "",
    sortOrder: toNumber(item.sortOrder, 9999),
    isActive: item.isActive !== false,
    coverImage: item.coverImage || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const products = sortBySortOrder(seed?.products || []).map((item, index) => ({
    id: item.id || item.code || uid("prd"),
    code: item.code || uid("code"),
    name: item.name || "Без названия",
    description: item.description || "",
    categoryCode: item.categoryCode || categories[0]?.code || "other",
    categoryCodes: item.categoryCodes || [item.categoryCode],
    price: toNumber(item.price, 0),
    oldPrice: item.oldPrice ? toNumber(item.oldPrice, 0) : null,
    weight: item.weight ? toNumber(item.weight, 0) : null,
    calories: item.calories ? toNumber(item.calories, 0) : null,
    volume: item.volume ? toNumber(item.volume, 0) : null,
    imageUrl: item.imageUrl || item.images?.[0] || "",
    images: item.images || [],
    media: item.media || [],
    isAvailable: item.isAvailable !== false,
    sortOrder: toNumber(item.sortOrder, index + 1),
    tags: item.tags || [],
    modifications: item.modifications || [],
    toppingGroups: item.toppingGroups || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return {
    meta: {
      version: 1,
      orderCounter: 1000,
      site: seed?.site || {},
      banners: seed?.banners || [],
      theme: seed?.theme || {},
      generatedAt: seed?.generatedAt || null,
    },
    users: [
      {
        id: "local-admin",
        role: "admin",
        login: config.ADMIN_LOGIN,
        password: config.ADMIN_PASSWORD,
        name: "Администратор",
      },
    ],
    categories,
    products,
    orders: [],
    actionLogs: [],
  };
}

function parseStorage(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createLocalDb(options = {}) {
  const config = getAppConfig();
  const storage = options.storage || window.localStorage;
  const now = options.now || (() => new Date().toISOString());
  const fetchSeed =
    options.fetchSeed ||
    (async () => {
      const response = await fetch("./data/kgsushi.seed.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Не удалось загрузить seed меню");
      }
      return response.json();
    });

  let db = null;

  function hasProducts(value) {
    return Array.isArray(value?.products) && value.products.length > 0;
  }

  function hasCategories(value) {
    return Array.isArray(value?.categories) && value.categories.length > 0;
  }

  function hasMeta(value) {
    return Boolean(value?.meta && typeof value.meta === "object");
  }

  function ensureAdminUser() {
    if (!Array.isArray(db.users)) {
      db.users = [];
    }
    const existingAdmin = db.users.find((user) => user.id === "local-admin");
    if (existingAdmin) {
      existingAdmin.role = "admin";
      existingAdmin.login = config.ADMIN_LOGIN;
      existingAdmin.password = config.ADMIN_PASSWORD;
      existingAdmin.name = existingAdmin.name || "Администратор";
      return;
    }

    db.users.unshift({
      id: "local-admin",
      role: "admin",
      login: config.ADMIN_LOGIN,
      password: config.ADMIN_PASSWORD,
      name: "Администратор",
    });
  }

  function mergeWithSeed(baseSeed) {
    const fallback = defaultDb(config, baseSeed);

    if (!hasMeta(db)) {
      db.meta = fallback.meta;
    } else {
      db.meta = {
        ...fallback.meta,
        ...db.meta,
        site: db.meta.site || fallback.meta.site,
        banners: Array.isArray(db.meta.banners) ? db.meta.banners : fallback.meta.banners,
        theme: db.meta.theme || fallback.meta.theme,
      };
    }

    if (!hasCategories(db)) {
      db.categories = fallback.categories;
    }

    if (!hasProducts(db)) {
      db.products = fallback.products;
    }

    if (!Array.isArray(db.orders)) {
      db.orders = [];
    }

    if (!Array.isArray(db.actionLogs)) {
      db.actionLogs = [];
    }

    ensureAdminUser();
  }

  async function init() {
    if (db) {
      return;
    }

    const existing = parseStorage(storage, STORAGE_KEYS.DB);
    if (existing && typeof existing === "object") {
      db = existing;
      try {
        const seed = await fetchSeed();
        mergeWithSeed(seed);
      } catch {
        ensureAdminUser();
      }
      save();
      return;
    }

    const seed = await fetchSeed();
    db = defaultDb(config, seed);
    save();
  }

  function save() {
    storage.setItem(STORAGE_KEYS.DB, JSON.stringify(db));
  }

  function getSiteSnapshot() {
    return {
      site: db.meta.site,
      banners: db.meta.banners,
      theme: db.meta.theme,
      generatedAt: db.meta.generatedAt,
    };
  }

  function getCategories() {
    return sortBySortOrder(db.categories.filter((category) => category.isActive !== false));
  }

  function listCategories({ includeInactive = false } = {}) {
    return sortBySortOrder(db.categories).filter((category) => includeInactive || category.isActive !== false);
  }

  function getProducts(query = {}) {
    const pageSize = toNumber(query.pageSize, config.PAGE_SIZE);
    const page = toNumber(query.page, 1);
    const search = String(query.search || "").trim().toLowerCase();
    const categoryCode = query.categoryCode || "";
    const onlyAvailable = Boolean(query.onlyAvailable);

    let items = sortBySortOrder(db.products);

    if (categoryCode) {
      items = items.filter((item) => item.categoryCode === categoryCode || item.categoryCodes?.includes(categoryCode));
    }

    if (onlyAvailable) {
      items = items.filter((item) => item.isAvailable);
    }

    if (search) {
      items = items.filter((item) => {
        const haystack = `${item.name} ${item.description} ${item.code}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = clampPage(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  function getProductByCode(code) {
    return db.products.find((item) => item.code === code) || null;
  }

  function getProductById(id) {
    return db.products.find((item) => item.id === id) || null;
  }

  function upsertProduct(input, user = "admin") {
    const nowValue = now();
    const payload = {
      ...input,
      id: input.id || uid("prd"),
      code: input.code,
      name: input.name,
      description: input.description || "",
      categoryCode: input.categoryCode,
      categoryCodes: [input.categoryCode],
      price: toNumber(input.price, 0),
      oldPrice: input.oldPrice ? toNumber(input.oldPrice, 0) : null,
      imageUrl: input.imageUrl || "",
      images: input.images || (input.imageUrl ? [input.imageUrl] : []),
      media: input.media || (input.imageUrl ? [input.imageUrl] : []),
      isAvailable: input.isAvailable !== false,
      sortOrder: toNumber(input.sortOrder, 9999),
      weight: input.weight ? toNumber(input.weight, 0) : null,
      calories: input.calories ? toNumber(input.calories, 0) : null,
      volume: input.volume ? toNumber(input.volume, 0) : null,
      tags: input.tags || [],
      modifications: input.modifications || [],
      toppingGroups: input.toppingGroups || [],
      updatedAt: nowValue,
      createdAt: input.createdAt || nowValue,
    };

    const index = db.products.findIndex((item) => item.id === payload.id);
    const existsByCode = db.products.find((item) => item.code === payload.code && item.id !== payload.id);
    if (existsByCode) {
      throw new Error("Товар с таким кодом уже существует");
    }

    if (index >= 0) {
      db.products[index] = { ...db.products[index], ...payload };
      logAction(LOG_ACTION.PRODUCT_UPDATE, "product", payload.id, user, { code: payload.code });
    } else {
      db.products.push(payload);
      logAction(LOG_ACTION.PRODUCT_CREATE, "product", payload.id, user, { code: payload.code });
    }

    save();
    return payload;
  }

  function deleteProduct(id, user = "admin") {
    const index = db.products.findIndex((item) => item.id === id);
    if (index < 0) {
      return false;
    }
    const [deleted] = db.products.splice(index, 1);
    save();
    logAction(LOG_ACTION.PRODUCT_DELETE, "product", id, user, { code: deleted.code });
    save();
    return true;
  }

  function upsertCategory(input, user = "admin") {
    const nowValue = now();
    const payload = {
      id: input.id || input.code,
      code: input.code,
      name: input.name,
      description: input.description || "",
      sortOrder: toNumber(input.sortOrder, 9999),
      isActive: input.isActive !== false,
      coverImage: input.coverImage || "",
      updatedAt: nowValue,
      createdAt: input.createdAt || nowValue,
    };

    const index = db.categories.findIndex((item) => item.id === payload.id || item.code === payload.code);
    const existsByCode = db.categories.find((item) => item.code === payload.code && item.id !== payload.id);
    if (existsByCode) {
      throw new Error("Категория с таким кодом уже существует");
    }

    if (index >= 0) {
      db.categories[index] = { ...db.categories[index], ...payload };
      logAction(LOG_ACTION.CATEGORY_UPDATE, "category", payload.id, user, { code: payload.code });
    } else {
      db.categories.push(payload);
      logAction(LOG_ACTION.CATEGORY_CREATE, "category", payload.id, user, { code: payload.code });
    }
    save();
    return payload;
  }

  function deleteCategory(id, user = "admin") {
    const index = db.categories.findIndex((item) => item.id === id);
    if (index < 0) {
      return false;
    }

    const category = db.categories[index];
    const productsCount = db.products.filter((item) => item.categoryCode === category.code).length;
    if (productsCount > 0) {
      throw new Error("Нельзя удалить категорию, пока в ней есть товары");
    }

    db.categories.splice(index, 1);
    logAction(LOG_ACTION.CATEGORY_DELETE, "category", id, user, { code: category.code });
    save();
    return true;
  }

  function createOrder(input) {
    const orderId = uid("ord");
    db.meta.orderCounter += 1;
    const number = `TK23-${db.meta.orderCounter}`;

    const items = (input.items || []).map((item) => ({
      id: uid("itm"),
      productId: item.productId,
      qty: toNumber(item.qty, 1),
      priceAtOrderTime: toNumber(item.price, 0),
      nameSnapshot: item.name,
      imageSnapshot: item.imageUrl || "",
      modifiers: item.modifiers || null,
    }));

    const total = items.reduce((sum, item) => sum + item.qty * item.priceAtOrderTime, 0);

    const order = {
      id: orderId,
      number,
      status: ORDER_STATUS.NEW,
      total,
      customerName: (input.customerName || "").trim(),
      phone: formatPhone(input.phone || ""),
      comment: (input.comment || "").trim(),
      method: input.method === ORDER_METHOD.DELIVERY ? ORDER_METHOD.DELIVERY : ORDER_METHOD.PICKUP,
      address: (input.address || "").trim(),
      items,
      isPaid: Boolean(input.isPaid),
      createdAt: now(),
      updatedAt: now(),
    };

    db.orders.unshift(order);
    save();
    return order;
  }

  function listOrders(query = {}) {
    const pageSize = toNumber(query.pageSize, config.ADMIN_PAGE_SIZE);
    const page = toNumber(query.page, 1);
    const status = query.status || "";
    const search = (query.search || "").trim().toLowerCase();

    let items = [...db.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (status) {
      items = items.filter((order) => order.status === status);
    }

    if (search) {
      items = items.filter((order) => {
        const haystack = `${order.number} ${order.customerName} ${order.phone}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = clampPage(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  function getOrderById(id) {
    return db.orders.find((order) => order.id === id) || null;
  }

  function updateOrderStatus(id, status, user = "admin") {
    const order = db.orders.find((item) => item.id === id);
    if (!order) {
      throw new Error("Заказ не найден");
    }
    order.status = status;
    order.updatedAt = now();
    logAction(LOG_ACTION.ORDER_STATUS_UPDATE, "order", id, user, { status });
    save();
    return order;
  }

  function updateOrderPayment(id, isPaid, user = "admin") {
    const order = db.orders.find((item) => item.id === id);
    if (!order) {
      throw new Error("Заказ не найден");
    }
    order.isPaid = Boolean(isPaid);
    order.updatedAt = now();
    logAction(LOG_ACTION.ORDER_PAYMENT_UPDATE, "order", id, user, { isPaid: order.isPaid });
    save();
    return order;
  }

  function logAction(action, entityType, entityId, user = "admin", details = {}) {
    db.actionLogs.unshift({
      id: uid("log"),
      action,
      entityType,
      entityId,
      user,
      details,
      createdAt: now(),
    });
  }

  function listActionLogs(query = {}) {
    const pageSize = toNumber(query.pageSize, config.ADMIN_PAGE_SIZE);
    const page = toNumber(query.page, 1);
    const total = db.actionLogs.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = clampPage(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: db.actionLogs.slice(start, start + pageSize),
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  function getSalesReport(query = {}) {
    const { from, to } = getPeriodRange(query.period || "today", {
      from: query.from,
      to: query.to,
    });

    const reportOrders = db.orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= from && createdAt <= to;
    });

    const salesOrders = reportOrders.filter(isOrderInSales);

    const revenue = salesOrders.reduce((sum, order) => sum + order.total, 0);
    const sold = new Map();

    for (const order of salesOrders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!sold.has(key)) {
          sold.set(key, {
            productId: key,
            name: item.nameSnapshot,
            qty: 0,
            revenue: 0,
          });
        }
        const row = sold.get(key);
        row.qty += item.qty;
        row.revenue += item.qty * item.priceAtOrderTime;
      }
    }

    const topItems = [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 20);

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      kpi: {
        ordersTotal: reportOrders.length,
        paidOrders: salesOrders.length,
        revenue,
      },
      topItems,
      orders: reportOrders,
    };
  }

  function getDashboardKpi() {
    const today = getPeriodRange("today");
    const todayOrders = db.orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= today.from && createdAt <= today.to;
    });

    const todayRevenue = todayOrders.filter(isOrderInSales).reduce((sum, order) => sum + order.total, 0);
    const topToday = getSalesReport({ period: "today" }).topItems.slice(0, 5);

    return {
      newOrdersToday: todayOrders.length,
      revenueToday: todayRevenue,
      topToday,
    };
  }

  function loginAdmin(login, password) {
    const user = db.users.find((item) => item.login === login && item.password === password && item.role === "admin");
    if (!user) {
      throw new Error("Неверный логин или пароль");
    }

    const session = {
      id: user.id,
      role: user.role,
      name: user.name,
      login: user.login,
      createdAt: now(),
    };
    storage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
    return session;
  }

  function logoutAdmin() {
    storage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }

  function getCurrentAdmin() {
    return parseStorage(storage, STORAGE_KEYS.ADMIN_SESSION);
  }

  function resetDemoData() {
    storage.removeItem(STORAGE_KEYS.DB);
    db = null;
    return init();
  }

  function getProductsRaw() {
    return sortBySortOrder(db.products);
  }

  return {
    init,
    getSiteSnapshot,
    getCategories,
    listCategories,
    getProducts,
    getProductsRaw,
    getProductByCode,
    getProductById,
    upsertProduct,
    deleteProduct,
    upsertCategory,
    deleteCategory,
    createOrder,
    listOrders,
    getOrderById,
    updateOrderStatus,
    updateOrderPayment,
    getSalesReport,
    getDashboardKpi,
    listActionLogs,
    loginAdmin,
    logoutAdmin,
    getCurrentAdmin,
    resetDemoData,
  };
}
