import { getRepository } from "../data/repository.js";

export async function loginAdmin(login, password) {
  return getRepository().loginAdmin(login, password);
}

export async function logoutAdmin() {
  return getRepository().logoutAdmin();
}

export async function getCurrentAdmin() {
  return getRepository().getCurrentAdmin();
}
