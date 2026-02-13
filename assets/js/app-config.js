const defaultConfig = {
  DATA_PROVIDER: "local",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  SUPABASE_STORAGE_BUCKET: "menu-images",
  ADMIN_LOGIN: "admin",
  ADMIN_PASSWORD: "admin123",
  SHOP_NAME: "King Kong Sushi",
  SUPPORT_PHONE: "+7 (800) 200-65-59",
  CURRENCY_SYMBOL: "₽",
  PAGE_SIZE: 18,
  ADMIN_PAGE_SIZE: 20,
};

let cache = null;

export function getAppConfig() {
  if (cache) {
    return cache;
  }

  const runtimeConfig = typeof window !== "undefined" ? window.APP_CONFIG || {} : {};
  cache = { ...defaultConfig, ...runtimeConfig };
  return cache;
}

export function isSupabaseConfigured() {
  const config = getAppConfig();
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
}
