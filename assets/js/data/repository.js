import { getAppConfig, isSupabaseConfigured } from "../app-config.js";
import { createLocalDb } from "./local-db.js";
import { createSupabaseDb } from "./supabase-db.js";

const config = getAppConfig();
const localDb = createLocalDb();
let activeDb = localDb;

if (config.DATA_PROVIDER === "supabase" && isSupabaseConfigured()) {
  try {
    activeDb = createSupabaseDb(config);
  } catch (error) {
    console.warn("Supabase client init failed, fallback to local provider", error);
    activeDb = localDb;
  }
}

export async function initRepository() {
  try {
    await activeDb.init();
  } catch (error) {
    if (activeDb !== localDb) {
      console.warn("Falling back to local DB due to init error", error);
      activeDb = localDb;
      await activeDb.init();
      return;
    }
    throw error;
  }
}

export function getRepository() {
  return activeDb;
}

export function isUsingSupabase() {
  return activeDb !== localDb;
}
