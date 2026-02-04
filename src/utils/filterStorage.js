/**
 * Filter persistence utility
 * Stores and retrieves filter preferences per client
 */

const FILTER_STORAGE_KEY = "platform-modal-filters";

export const filterStorage = {
  /**
   * Get saved filters for a client
   */
  getFilters(clientId) {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : {};
      return data[clientId] || {
        statuses: [],
        priorities: [],
        dates: [],
      };
    } catch (error) {
      console.warn("Failed to load filters:", error);
      return {
        statuses: [],
        priorities: [],
        dates: [],
      };
    }
  },

  /**
   * Save filters for a client
   */
  saveFilters(clientId, filters) {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : {};
      data[clientId] = filters;
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save filters:", error);
    }
  },

  /**
   * Clear filters for a client
   */
  clearFilters(clientId) {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : {};
      delete data[clientId];
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to clear filters:", error);
    }
  },

  /**
   * Clear all filters
   */
  clearAll() {
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear all filters:", error);
    }
  },
};
