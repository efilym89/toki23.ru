export const ORDER_STATUS = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  READY: "ready",
  COMPLETED: "completed",
  CANCELED: "canceled",
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.NEW]: "Новый",
  [ORDER_STATUS.IN_PROGRESS]: "В работе",
  [ORDER_STATUS.READY]: "Готов",
  [ORDER_STATUS.COMPLETED]: "Выдан",
  [ORDER_STATUS.CANCELED]: "Отменён",
};

export const ORDER_METHOD = {
  PICKUP: "pickup",
  DELIVERY: "delivery",
};

export const ORDER_METHOD_LABELS = {
  [ORDER_METHOD.PICKUP]: "Самовывоз",
  [ORDER_METHOD.DELIVERY]: "Доставка",
};

export const REPORT_PERIOD = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  CUSTOM: "custom",
};

export const STORAGE_KEYS = {
  DB: "kgs_clone_db_v2",
  CART: "kgs_clone_cart_v2",
  ADMIN_SESSION: "kgs_clone_admin_session_v2",
};

export const LOG_ACTION = {
  PRODUCT_CREATE: "product_create",
  PRODUCT_UPDATE: "product_update",
  PRODUCT_DELETE: "product_delete",
  CATEGORY_CREATE: "category_create",
  CATEGORY_UPDATE: "category_update",
  CATEGORY_DELETE: "category_delete",
  ORDER_STATUS_UPDATE: "order_status_update",
  ORDER_PAYMENT_UPDATE: "order_payment_update",
};
