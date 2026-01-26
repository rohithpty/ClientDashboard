const STORAGE_KEY = "rag-admin-config";

const defaultConfig = {
  regions: ["APAC", "Europe", "Africa", "MEA", "Americas"],
  environments: ["Production", "Staging", "UAT", "Sandbox"],
  products: ["VoucherEngine", "Banking.Live"],
  technicalAccountManagers: ["Ava Hart", "Jordan Lee", "Morgan Blake"],
  accountManagers: ["Logan Price", "Riley Chen"],
};

const safeParse = (stored) => {
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Failed to parse stored admin config.", error);
    return null;
  }
};

const normalizeList = (list, fallback) =>
  Array.isArray(list) && list.length > 0 ? list : fallback;

export const localConfigRepository = {
  getConfig() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) {
      return defaultConfig;
    }
    return {
      regions: normalizeList(parsed.regions, defaultConfig.regions),
      environments: normalizeList(parsed.environments, defaultConfig.environments),
      products: normalizeList(parsed.products, defaultConfig.products),
      technicalAccountManagers: normalizeList(
        parsed.technicalAccountManagers,
        defaultConfig.technicalAccountManagers,
      ),
      accountManagers: normalizeList(parsed.accountManagers, defaultConfig.accountManagers),
    };
  },
  saveConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },
};
