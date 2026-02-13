import { ORDER_STATUS } from "./constants.js";

const ruCurrency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const ruDateTime = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatPrice(value) {
  return ruCurrency.format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return ruDateTime.format(new Date(value));
}

export function formatPhone(phone) {
  return (phone || "").replace(/[^\d+]/g, "");
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getPeriodRange(period, custom = {}) {
  const now = new Date();
  if (period === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (period === "week") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }
  if (period === "month") {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { from, to: endOfDay(now) };
  }

  const from = custom.from ? startOfDay(new Date(custom.from)) : startOfDay(now);
  const to = custom.to ? endOfDay(new Date(custom.to)) : endOfDay(now);
  return { from, to };
}

export function clampPage(page, totalPages) {
  if (totalPages <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(page || 1, totalPages));
}

export function sortBySortOrder(items = []) {
  return [...items].sort((a, b) => {
    const aOrder = toNumber(a.sortOrder, 9999);
    const bOrder = toNumber(b.sortOrder, 9999);
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "ru");
  });
}

export function isOrderInSales(order) {
  return Boolean(order && order.status !== ORDER_STATUS.CANCELED && order.isPaid);
}

export function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const safe = String(cell ?? "").replaceAll('"', '""');
          return `"${safe}"`;
        })
        .join(","),
    )
    .join("\n");
}

export function downloadTextFile(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function debounce(fn, timeout = 250) {
  let timer = null;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), timeout);
  };
}
