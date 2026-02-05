/**
 * Search result caching utility
 * Stores results with timestamps and handles expiration
 */

const CACHE_STORAGE_KEY = "platform-search-cache";
const CACHE_TTL_MINUTES = 30; // Cache valid for 30 minutes

class SearchCache {
  constructor() {
    this.cache = this.loadFromStorage();
  }

  /**
   * Load cache from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn("Failed to load cache from storage:", error);
      return {};
    }
  }

  /**
   * Save cache to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn("Failed to save cache to storage:", error);
    }
  }

  /**
   * Generate cache key from search params
   */
  getCacheKey(query) {
    return `search:${query.toLowerCase().trim()}`;
  }

  /**
   * Check if cached result is still valid
   */
  isValid(cacheEntry) {
    if (!cacheEntry || !cacheEntry.timestamp) return false;
    const ageMinutes = (Date.now() - cacheEntry.timestamp) / (1000 * 60);
    return ageMinutes < CACHE_TTL_MINUTES;
  }

  /**
   * Get cached result if valid
   */
  get(query) {
    const key = this.getCacheKey(query);
    const entry = this.cache[key];

    if (!entry) return null;
    if (!this.isValid(entry)) {
      // Remove expired cache
      delete this.cache[key];
      this.saveToStorage();
      return null;
    }

    return entry.data;
  }

  /**
   * Store search result
   */
  set(query, results) {
    const key = this.getCacheKey(query);
    this.cache[key] = {
      timestamp: Date.now(),
      data: results,
    };
    this.saveToStorage();
  }

  /**
   * Clear cache for specific query
   */
  invalidate(query) {
    const key = this.getCacheKey(query);
    delete this.cache[key];
    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache = {};
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    const entries = Object.entries(this.cache);
    const validEntries = entries.filter(([_, entry]) => this.isValid(entry));
    const expiredEntries = entries.filter(([_, entry]) => !this.isValid(entry));

    // Clean expired entries
    expiredEntries.forEach(([key]) => {
      delete this.cache[key];
    });
    if (expiredEntries.length > 0) {
      this.saveToStorage();
    }

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: expiredEntries.length,
      ttlMinutes: CACHE_TTL_MINUTES,
    };
  }
}

// Singleton instance
export const searchCache = new SearchCache();
