import { initRepository, getRepository } from "../data/repository.js";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "../shared/constants.js";
import { toast } from "../shared/dom.js";
import { downloadTextFile, toCsv } from "../shared/utils.js";
import { validateProduct } from "../shared/validation.js";
import { renderPagination } from "../public/ui.js";
import { renderDashboard } from "./dashboard.js";
import { getInitialProductForm, readProductForm, renderMenuSection } from "./menu.js";
import { renderOrdersSection } from "./orders.js";
import { renderReportsSection } from "./reports.js";
import { renderLogsSection } from "./logs.js";
import { getCurrentAdmin, loginAdmin, logoutAdmin } from "./auth.js";
import { renderSettingsSection, readSettingsForm } from "./settings.js";

const state = {
  admin: null,
  tab: "dashboard",
  dashboard: {
    kpi: { newOrdersToday: 0, revenueToday: 0, topToday: [] },
  },
  menu: {
    categories: [],
    products: { items: [], pagination: { page: 1, totalPages: 1 } },
    search: "",
    categoryFilter: "",
    page: 1,
    form: {},
  },
  orders: {
    orders: { items: [], pagination: { page: 1, totalPages: 1 } },
    statusFilter: "",
    search: "",
    page: 1,
    activeOrder: null,
  },
  reports: {
    period: "today",
    from: "",
    to: "",
    report: null,
  },
  logs: {
    logs: { items: [], pagination: { page: 1, totalPages: 1 } },
    page: 1,
  },
  settings: {
    site: {},
  },
};

async function boot() {
  await initRepository();
  state.admin = await getCurrentAdmin();

  if (state.admin) {
    await hydrateAll();
    showAdminPanel();
  } else {
    showLoginPanel();
  }

  bindGlobalEvents();
}

async function hydrateAll() {
  await Promise.all([loadDashboard(), loadMenu(), loadOrders(), loadReport(), loadLogs(), loadSettings()]);
  renderAll();
}

async function loadDashboard() {
  state.dashboard.kpi = await getRepository().getDashboardKpi();
}

async function loadMenu() {
  state.menu.categories = await getRepository().listCategories({ includeInactive: true });
  if (!state.menu.form || !Object.keys(state.menu.form).length) {
    state.menu.form = getInitialProductForm(state.menu.categories);
  }

  state.menu.products = await getRepository().getProducts({
    page: state.menu.page,
    pageSize: 20,
    search: state.menu.search,
    categoryCode: state.menu.categoryFilter,
    onlyAvailable: false,
  });
}

async function loadOrders() {
  state.orders.orders = await getRepository().listOrders({
    page: state.orders.page,
    pageSize: 20,
    status: state.orders.statusFilter,
    search: state.orders.search,
  });

  if (state.orders.activeOrder) {
    const fresh = await getRepository().getOrderById(state.orders.activeOrder.id);
    state.orders.activeOrder = fresh;
  }
}

async function loadReport() {
  state.reports.report = await getRepository().getSalesReport({
    period: state.reports.period,
    from: state.reports.from,
    to: state.reports.to,
  });
}

async function loadLogs() {
  state.logs.logs = await getRepository().listActionLogs({
    page: state.logs.page,
    pageSize: 20,
  });
}

async function loadSettings() {
  state.settings.site = await getRepository().getSiteSettings();
}

function showLoginPanel() {
  document.querySelector("[data-admin-login]").hidden = false;
  document.querySelector("[data-admin-panel]").hidden = true;
}

function showAdminPanel() {
  document.querySelector("[data-admin-login]").hidden = true;
  document.querySelector("[data-admin-panel]").hidden = false;
  document.querySelector("[data-admin-user]").textContent = state.admin?.login || "admin";
  renderAll();
}

function renderAll() {
  renderTabs();
  renderActiveTab();
}

function renderTabs() {
  const nav = document.querySelector("[data-admin-nav]");
  nav.innerHTML = [
    ["dashboard", "Дашборд"],
    ["menu", "Меню"],
    ["orders", "Заказы"],
    ["reports", "Отчёты"],
    ["logs", "Журнал"],
    ["settings", "Настройки"],
  ]
    .map(
      ([code, label]) =>
        `<button class="admin-tab ${state.tab === code ? "is-active" : ""}" data-admin-tab="${code}">${label}</button>`,
    )
    .join("");
}

function renderActiveTab() {
  const container = document.querySelector("[data-admin-content]");
  if (state.tab === "dashboard") {
    renderDashboard(container, state.dashboard.kpi);
    return;
  }

  if (state.tab === "menu") {
    renderMenuSection(container, state.menu);
    renderPagination("[data-admin-menu-pager]", state.menu.products.pagination, "admin-menu");
    return;
  }

  if (state.tab === "orders") {
    renderOrdersSection(container, state.orders);
    renderPagination("[data-admin-orders-pager]", state.orders.orders.pagination, "admin-orders");
    return;
  }

  if (state.tab === "reports") {
    renderReportsSection(container, state.reports);
    return;
  }

  if (state.tab === "logs") {
    renderLogsSection(container, state.logs);
    renderPagination("[data-admin-logs-pager]", state.logs.logs.pagination, "admin-logs");
    return;
  }

  renderSettingsSection(container, state.settings);
}

function bindGlobalEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("change", onChange);
}

async function onSubmit(event) {
  if (event.target.matches("[data-admin-login-form]")) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const login = (formData.get("login") || "").toString().trim();
    const password = (formData.get("password") || "").toString().trim();

    try {
      state.admin = await loginAdmin(login, password);
      await hydrateAll();
      showAdminPanel();
      toast("Вход выполнен", "success");
    } catch (error) {
      toast(error.message || "Не удалось войти", "error");
    }
    return;
  }

  if (event.target.matches("[data-menu-form]")) {
    event.preventDefault();
    const form = event.target;
    const payload = readProductForm(form);
    const validation = validateProduct(payload);
    if (!validation.ok) {
      toast(validation.errors[0], "error");
      return;
    }

    try {
      await getRepository().upsertProduct(validation.data, state.admin?.login || "admin");
      state.menu.form = getInitialProductForm(state.menu.categories);
      await loadMenu();
      renderActiveTab();
      toast("Товар сохранён", "success");
    } catch (error) {
      toast(error.message || "Не удалось сохранить товар", "error");
    }
    return;
  }

  if (event.target.matches("[data-reports-form]")) {
    event.preventDefault();
    const data = new FormData(event.target);
    state.reports.from = (data.get("from") || "").toString();
    state.reports.to = (data.get("to") || "").toString();
    await loadReport();
    renderActiveTab();
  }

  if (event.target.matches("[data-settings-form]")) {
    event.preventDefault();
    const payload = readSettingsForm(event.target);
    try {
      await getRepository().updateSiteSettings(payload, state.admin?.login || "admin");
      await loadSettings();
      renderActiveTab();
      toast("Настройки сохранены", "success");
    } catch (error) {
      toast(error.message || "Не удалось сохранить настройки", "error");
    }
  }
}

async function onClick(event) {
  const tabButton = event.target.closest("[data-admin-tab]");
  if (tabButton) {
    state.tab = tabButton.dataset.adminTab;
    renderAll();
    return;
  }

  if (event.target.closest("[data-admin-logout]")) {
    await logoutAdmin();
    state.admin = null;
    showLoginPanel();
    return;
  }

  const pager = event.target.closest("[data-page]");
  if (pager) {
    const page = Number(pager.dataset.page || 1);
    const target = pager.dataset.pageTarget;

    if (target === "admin-menu") {
      state.menu.page = page;
      await loadMenu();
      renderActiveTab();
      return;
    }
    if (target === "admin-orders") {
      state.orders.page = page;
      await loadOrders();
      renderActiveTab();
      return;
    }
    if (target === "admin-logs") {
      state.logs.page = page;
      await loadLogs();
      renderActiveTab();
      return;
    }
  }

  const editProductBtn = event.target.closest("[data-edit-product]");
  if (editProductBtn) {
    const product = await getRepository().getProductById(editProductBtn.dataset.editProduct);
    if (product) {
      state.menu.form = { ...product };
      renderActiveTab();
    }
    return;
  }

  const deleteProductBtn = event.target.closest("[data-delete-product]");
  if (deleteProductBtn) {
    const confirmed = window.confirm("Удалить товар? Это действие нельзя отменить.");
    if (!confirmed) {
      return;
    }

    try {
      await getRepository().deleteProduct(deleteProductBtn.dataset.deleteProduct, state.admin?.login || "admin");
      await loadMenu();
      renderActiveTab();
      toast("Товар удалён", "success");
    } catch (error) {
      toast(error.message || "Ошибка удаления", "error");
    }
    return;
  }

  if (event.target.closest("[data-reset-product-form]")) {
    state.menu.form = getInitialProductForm(state.menu.categories);
    renderActiveTab();
    return;
  }

  const openOrderBtn = event.target.closest("[data-open-order]");
  if (openOrderBtn) {
    state.orders.activeOrder = await getRepository().getOrderById(openOrderBtn.dataset.openOrder);
    renderActiveTab();
    return;
  }

  if (event.target.closest("[data-save-order-state]")) {
    const active = state.orders.activeOrder;
    if (!active) {
      return;
    }

    const status = document.querySelector("[data-order-status]")?.value || ORDER_STATUS.NEW;
    const isPaid = Boolean(document.querySelector("[data-order-paid]")?.checked);

    try {
      await getRepository().updateOrderStatus(active.id, status, state.admin?.login || "admin");
      await getRepository().updateOrderPayment(active.id, isPaid, state.admin?.login || "admin");
      await loadOrders();
      await loadDashboard();
      await loadReport();
      await loadLogs();
      renderActiveTab();
      toast("Заказ обновлён", "success");
    } catch (error) {
      toast(error.message || "Ошибка обновления заказа", "error");
    }
    return;
  }

  if (event.target.closest("[data-print-order]")) {
    const active = state.orders.activeOrder;
    if (!active) {
      return;
    }
    const popup = window.open("", "print-order", "width=720,height=920");
    popup.document.write(`
      <html><head><title>Заказ ${active.number}</title></head><body>
      <h1>Заказ ${active.number}</h1>
      <p>Клиент: ${active.customerName}</p>
      <p>Телефон: ${active.phone}</p>
      <p>Статус: ${ORDER_STATUS_LABELS[active.status] || active.status}</p>
      <p>Оплачен: ${active.isPaid ? "Да" : "Нет"}</p>
      <ul>${active.items.map((item) => `<li>${item.nameSnapshot} x ${item.qty}</li>`).join("")}</ul>
      <p>Итого: ${active.total} ₽</p>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
    return;
  }

  const reportPeriodBtn = event.target.closest("[data-report-period]");
  if (reportPeriodBtn) {
    state.reports.period = reportPeriodBtn.dataset.reportPeriod;
    renderActiveTab();
    return;
  }

  if (event.target.closest("[data-export-report]")) {
    const report = state.reports.report;
    if (!report) {
      return;
    }

    const rows = [["Позиция", "Количество", "Выручка"]];
    for (const row of report.topItems) {
      rows.push([row.name, row.qty, row.revenue]);
    }
    downloadTextFile(`sales-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  }
}

async function onChange(event) {
  const menuSearch = event.target.closest("[data-menu-search]");
  if (menuSearch) {
    state.menu.search = menuSearch.value;
    state.menu.page = 1;
    await loadMenu();
    renderActiveTab();
    return;
  }

  const menuCategory = event.target.closest("[data-menu-category]");
  if (menuCategory) {
    state.menu.categoryFilter = menuCategory.value;
    state.menu.page = 1;
    await loadMenu();
    renderActiveTab();
    return;
  }

  const ordersSearch = event.target.closest("[data-orders-search]");
  if (ordersSearch) {
    state.orders.search = ordersSearch.value;
    state.orders.page = 1;
    await loadOrders();
    renderActiveTab();
    return;
  }

  const ordersStatus = event.target.closest("[data-orders-status-filter]");
  if (ordersStatus) {
    state.orders.statusFilter = ordersStatus.value;
    state.orders.page = 1;
    await loadOrders();
    renderActiveTab();
    return;
  }

  const fileInput = event.target.closest("[data-menu-image-file]");
  if (fileInput && fileInput.files?.[0]) {
    const dataUrl = await fileToDataUrl(fileInput.files[0]);
    const urlInput = document.querySelector("[data-menu-form] input[name='imageUrl']");
    if (urlInput) {
      urlInput.value = dataUrl;
      state.menu.form.imageUrl = dataUrl;
      renderActiveTab();
      toast("Изображение загружено", "success");
    }
  }

  const heroFile = event.target.closest("[data-settings-hero-file]");
  if (heroFile && heroFile.files?.[0]) {
    const dataUrl = await fileToDataUrl(heroFile.files[0]);
    const input = document.querySelector("[data-settings-form] input[name='heroImage']");
    if (input) {
      input.value = dataUrl;
      state.settings.site.heroImage = dataUrl;
      renderActiveTab();
      toast("Hero обновлен", "success");
    }
  }

  const promoFile = event.target.closest("[data-settings-promo-file]");
  if (promoFile && promoFile.files?.[0]) {
    const dataUrl = await fileToDataUrl(promoFile.files[0]);
    const input = document.querySelector("[data-settings-form] input[name='promoBackground']");
    if (input) {
      input.value = dataUrl;
      state.settings.site.promoBackground = dataUrl;
      renderActiveTab();
      toast("Фон акций обновлен", "success");
    }
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

boot().catch((error) => {
  console.error(error);
  toast("Ошибка запуска админ-панели", "error");
});
