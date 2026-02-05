const STORAGE_KEY = "rag-clients-v2";
const LEGACY_STORAGE_KEY = "rag-clients";

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
    if (Array.isArray(parsed)) {
      return parsed;
    }
    const legacyParsed = safeParse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacyParsed) && legacyParsed.length) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return [];
  },
  saveClients(clients) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  },
};
