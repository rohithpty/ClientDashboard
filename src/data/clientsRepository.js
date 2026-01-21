import { seedClients } from "./seedClients.js";

const STORAGE_KEY = "rag-clients";

const safeParse = (stored) => {
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Failed to parse stored clients.", error);
    return null;
  }
};

export const localClientsRepository = {
  getClients() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : seedClients;
  },
  saveClients(clients) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  },
};
