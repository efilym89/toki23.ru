import { ORDER_METHOD, ORDER_STATUS } from "../shared/constants.js";
import { clampPage, getPeriodRange, isOrderInSales, toNumber, uid } from "../shared/utils.js";

function ensureClient(config) {
  if (typeof window === "undefined" || !window.supabase || !window.supabase.createClient) {
    throw new Error("Supabase SDK не загружен");
  }
  return window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

function mapCategory(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    sortOrder: row.sort_order || 9999,
    isActive: row.is_active !== false,
    coverImage: row.cover_image || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    categoryCode: row.category_code,
    categoryCodes: [row.category_code],
    price: toNumber(row.price, 0),
    oldPrice: row.old_price,
    weight: row.weight,
    calories: row.calories,
    volume: row.volume,
    imageUrl: row.image_url || "",
    images: row.images || [],
    media: row.media || [],
    isAvailable: row.is_available !== false,
    sortOrder: row.sort_order || 9999,
    tags: row.tags || [],
    modifications: row.modifications || [],
    toppingGroups: row.topping_groups || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseDb(config) {
  const client = ensureClient(config);

  async function init() {
    return true;
  }

  async function getSiteSnapshot() {
    const { data, error } = await client.from("settings").select("key,value").in("key", ["site", "banners", "theme"]);
    if (error || !data) {
      return { site: {}, banners: [], theme: {} };
    }

    const map = new Map(data.map((row) => [row.key, row.value]));
    return {
      site: map.get("site") || {},
      banners: map.get("banners") || [],
      theme: map.get("theme") || {},
      generatedAt: null,
    };
  }

  async function getCategories() {
    const { data, error } = await client
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data || []).map(mapCategory);
  }

  async function listCategories({ includeInactive = false } = {}) {
    let query = client.from("categories").select("*");
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query.order("sort_order", { ascending: true }).order("name", { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data || []).map(mapCategory);
  }

  async function getProducts(query = {}) {
    const pageSize = toNumber(query.pageSize, config.PAGE_SIZE);
    const page = toNumber(query.page, 1);
    const search = String(query.search || "").trim();

    let dbQuery = client.from("products").select("*", { count: "exact" });

    if (query.categoryCode) {
      dbQuery = dbQuery.eq("category_code", query.categoryCode);
    }
    if (query.onlyAvailable) {
      dbQuery = dbQuery.eq("is_available", true);
    }
    if (search) {
      dbQuery = dbQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await dbQuery
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: (data || []).map(mapProduct),
      pagination: {
        page: clampPage(page, totalPages),
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async function getProductsRaw() {
    const { data, error } = await client.from("products").select("*").order("sort_order", { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data || []).map(mapProduct);
  }

  async function getProductByCode(code) {
    const { data, error } = await client.from("products").select("*").eq("code", code).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapProduct(data) : null;
  }

  async function getProductById(id) {
    const { data, error } = await client.from("products").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapProduct(data) : null;
  }

  async function upsertProduct(input, user = "admin") {
    const payload = {
      id: input.id || undefined,
      code: input.code,
      name: input.name,
      description: input.description || "",
      category_code: input.categoryCode,
      price: toNumber(input.price, 0),
      old_price: input.oldPrice || null,
      weight: input.weight || null,
      calories: input.calories || null,
      volume: input.volume || null,
      image_url: input.imageUrl || "",
      images: input.images || (input.imageUrl ? [input.imageUrl] : []),
      media: input.media || (input.imageUrl ? [input.imageUrl] : []),
      is_available: input.isAvailable !== false,
      sort_order: toNumber(input.sortOrder, 9999),
      tags: input.tags || [],
      modifications: input.modifications || [],
      topping_groups: input.toppingGroups || [],
    };

    const { data, error } = await client.from("products").upsert(payload).select("*").single();
    if (error) {
      throw new Error(error.message);
    }

    await addActionLog("product_upsert", "product", data.id, user, { code: data.code });
    return mapProduct(data);
  }

  async function deleteProduct(id, user = "admin") {
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    await addActionLog("product_delete", "product", id, user, {});
    return true;
  }

  async function upsertCategory(input, user = "admin") {
    const payload = {
      id: input.id || undefined,
      code: input.code,
      name: input.name,
      description: input.description || "",
      sort_order: toNumber(input.sortOrder, 9999),
      is_active: input.isActive !== false,
      cover_image: input.coverImage || "",
    };

    const { data, error } = await client.from("categories").upsert(payload).select("*").single();
    if (error) {
      throw new Error(error.message);
    }

    await addActionLog("category_upsert", "category", data.id, user, { code: data.code });
    return mapCategory(data);
  }

  async function deleteCategory(id, user = "admin") {
    const { error } = await client.from("categories").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    await addActionLog("category_delete", "category", id, user, {});
    return true;
  }

  async function createOrder(input) {
    const nowValue = new Date().toISOString();
    const number = `KG-${Date.now().toString().slice(-7)}`;

    const orderPayload = {
      number,
      status: ORDER_STATUS.NEW,
      total: 0,
      customer_name: input.customerName,
      phone: input.phone,
      comment: input.comment || "",
      method: input.method === ORDER_METHOD.DELIVERY ? ORDER_METHOD.DELIVERY : ORDER_METHOD.PICKUP,
      address: input.address || "",
      is_paid: Boolean(input.isPaid),
      created_at: nowValue,
      updated_at: nowValue,
    };

    const { data: orderRow, error: orderError } = await client.from("orders").insert(orderPayload).select("*").single();
    if (orderError) {
      throw new Error(orderError.message);
    }

    const orderItems = (input.items || []).map((item) => ({
      id: uid("it"),
      order_id: orderRow.id,
      product_id: item.productId,
      qty: toNumber(item.qty, 1),
      price_at_order_time: toNumber(item.price, 0),
      name_snapshot: item.name,
      image_snapshot: item.imageUrl || "",
      modifiers: item.modifiers || null,
    }));

    if (orderItems.length) {
      const { error: itemsError } = await client.from("order_items").insert(orderItems);
      if (itemsError) {
        throw new Error(itemsError.message);
      }
    }

    const total = orderItems.reduce((sum, item) => sum + item.qty * item.price_at_order_time, 0);
    const { data: updatedOrder, error: updateError } = await client
      .from("orders")
      .update({ total, updated_at: new Date().toISOString() })
      .eq("id", orderRow.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      id: updatedOrder.id,
      number: updatedOrder.number,
      status: updatedOrder.status,
      total: updatedOrder.total,
      customerName: updatedOrder.customer_name,
      phone: updatedOrder.phone,
      comment: updatedOrder.comment,
      method: updatedOrder.method,
      address: updatedOrder.address,
      isPaid: updatedOrder.is_paid,
      createdAt: updatedOrder.created_at,
      updatedAt: updatedOrder.updated_at,
      items: orderItems.map((item) => ({
        id: item.id,
        productId: item.product_id,
        qty: item.qty,
        priceAtOrderTime: item.price_at_order_time,
        nameSnapshot: item.name_snapshot,
        imageSnapshot: item.image_snapshot,
        modifiers: item.modifiers,
      })),
    };
  }

  async function listOrders(query = {}) {
    const pageSize = toNumber(query.pageSize, config.ADMIN_PAGE_SIZE);
    const page = toNumber(query.page, 1);
    let dbQuery = client.from("orders").select("*", { count: "exact" });

    if (query.status) {
      dbQuery = dbQuery.eq("status", query.status);
    }
    if (query.search) {
      const search = query.search.trim();
      dbQuery = dbQuery.or(`number.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await dbQuery.order("created_at", { ascending: false }).range(from, to);
    if (error) {
      throw new Error(error.message);
    }

    const ids = (data || []).map((row) => row.id);
    const { data: itemsRows, error: itemsError } = await client.from("order_items").select("*").in("order_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (itemsError && ids.length) {
      throw new Error(itemsError.message);
    }

    const itemsByOrderId = new Map();
    for (const row of itemsRows || []) {
      if (!itemsByOrderId.has(row.order_id)) {
        itemsByOrderId.set(row.order_id, []);
      }
      itemsByOrderId.get(row.order_id).push({
        id: row.id,
        productId: row.product_id,
        qty: row.qty,
        priceAtOrderTime: row.price_at_order_time,
        nameSnapshot: row.name_snapshot,
        imageSnapshot: row.image_snapshot,
        modifiers: row.modifiers,
      });
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      total: row.total,
      customerName: row.customer_name,
      phone: row.phone,
      comment: row.comment,
      method: row.method,
      address: row.address,
      isPaid: row.is_paid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: itemsByOrderId.get(row.id) || [],
    }));

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: mapped,
      pagination: {
        page: clampPage(page, totalPages),
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async function getOrderById(id) {
    const { data: row, error } = await client.from("orders").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!row) {
      return null;
    }

    const { data: itemsRows, error: itemsError } = await client.from("order_items").select("*").eq("order_id", id);
    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return {
      id: row.id,
      number: row.number,
      status: row.status,
      total: row.total,
      customerName: row.customer_name,
      phone: row.phone,
      comment: row.comment,
      method: row.method,
      address: row.address,
      isPaid: row.is_paid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: (itemsRows || []).map((item) => ({
        id: item.id,
        productId: item.product_id,
        qty: item.qty,
        priceAtOrderTime: item.price_at_order_time,
        nameSnapshot: item.name_snapshot,
        imageSnapshot: item.image_snapshot,
        modifiers: item.modifiers,
      })),
    };
  }

  async function updateOrderStatus(id, status, user = "admin") {
    const { data, error } = await client
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }
    await addActionLog("order_status_update", "order", id, user, { status });
    return data;
  }

  async function updateOrderPayment(id, isPaid, user = "admin") {
    const { data, error } = await client
      .from("orders")
      .update({ is_paid: Boolean(isPaid), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }
    await addActionLog("order_payment_update", "order", id, user, { isPaid: Boolean(isPaid) });
    return data;
  }

  async function listActionLogs(query = {}) {
    const pageSize = toNumber(query.pageSize, config.ADMIN_PAGE_SIZE);
    const page = toNumber(query.page, 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await client
      .from("action_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: (data || []).map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        user: row.user_login,
        details: row.details,
        createdAt: row.created_at,
      })),
      pagination: {
        page: clampPage(page, totalPages),
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async function addActionLog(action, entityType, entityId, user, details = {}) {
    const { error } = await client.from("action_logs").insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_login: user,
      details,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function getSalesReport(query = {}) {
    const { from, to } = getPeriodRange(query.period || "today", {
      from: query.from,
      to: query.to,
    });

    let dbQuery = client
      .from("orders")
      .select("*", { count: "exact" })
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false });

    const { data: orders, error } = await dbQuery;
    if (error) {
      throw new Error(error.message);
    }

    const ids = (orders || []).map((order) => order.id);
    const { data: itemsRows, error: itemsError } = await client.from("order_items").select("*").in("order_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (itemsError && ids.length) {
      throw new Error(itemsError.message);
    }

    const itemsByOrderId = new Map();
    for (const row of itemsRows || []) {
      if (!itemsByOrderId.has(row.order_id)) {
        itemsByOrderId.set(row.order_id, []);
      }
      itemsByOrderId.get(row.order_id).push({
        id: row.id,
        productId: row.product_id,
        qty: row.qty,
        priceAtOrderTime: row.price_at_order_time,
        nameSnapshot: row.name_snapshot,
        imageSnapshot: row.image_snapshot,
        modifiers: row.modifiers,
      });
    }

    const mappedOrders = (orders || []).map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      total: order.total,
      customerName: order.customer_name,
      phone: order.phone,
      comment: order.comment,
      method: order.method,
      address: order.address,
      isPaid: order.is_paid,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: itemsByOrderId.get(order.id) || [],
    }));

    const salesOrders = mappedOrders.filter(isOrderInSales);
    const revenue = salesOrders.reduce((sum, order) => sum + order.total, 0);

    const sold = new Map();
    for (const order of salesOrders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!sold.has(key)) {
          sold.set(key, { productId: key, name: item.nameSnapshot, qty: 0, revenue: 0 });
        }
        const row = sold.get(key);
        row.qty += item.qty;
        row.revenue += item.qty * item.priceAtOrderTime;
      }
    }

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      kpi: {
        ordersTotal: mappedOrders.length,
        paidOrders: salesOrders.length,
        revenue,
      },
      topItems: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 20),
      orders: mappedOrders,
    };
  }

  async function getDashboardKpi() {
    const report = await getSalesReport({ period: "today" });
    return {
      newOrdersToday: report.kpi.ordersTotal,
      revenueToday: report.kpi.revenue,
      topToday: report.topItems.slice(0, 5),
    };
  }

  async function loginAdmin(login, password) {
    const { data, error } = await client.auth.signInWithPassword({
      email: login,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const userId = data.user?.id;
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,name,email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile || profile.role !== "admin") {
      await client.auth.signOut();
      throw new Error("Недостаточно прав");
    }

    return {
      id: userId,
      role: profile.role,
      name: profile.name || "Администратор",
      login: profile.email || login,
      createdAt: new Date().toISOString(),
    };
  }

  async function logoutAdmin() {
    await client.auth.signOut();
  }

  async function getCurrentAdmin() {
    const { data } = await client.auth.getUser();
    if (!data.user) {
      return null;
    }

    const { data: profile } = await client
      .from("profiles")
      .select("role,name,email")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return null;
    }

    return {
      id: data.user.id,
      role: profile.role,
      name: profile.name || "Администратор",
      login: profile.email || data.user.email,
    };
  }

  async function resetDemoData() {
    return false;
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
    _client: client,
  };
}
