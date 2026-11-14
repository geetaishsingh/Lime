/**
 * ============================================================================
 * LIME AUTHENTICATION STORAGE MANAGER
 * Safe cross-platform token and session persistence for Mobile & Desktop.
 * Provides in-memory fallbacks when localStorage is restricted (e.g., iOS Safari Private Mode).
 * ============================================================================
 */

const ACCESS_TOKEN_KEY = "lime_access_token";
const REFRESH_TOKEN_KEY = "lime_refresh_token";
const CACHED_USER_KEY = "lime_cached_user";

// In-memory fallback if localStorage is disabled or throws quota errors
const memoryStore = new Map();

const isLocalStorageAvailable = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const testKey = "__lime_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (_e) {
    return false;
  }
};

const storageAvailable = isLocalStorageAvailable();

const safeGet = (key) => {
  try {
    if (storageAvailable) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) || null;
  } catch (_e) {
    return memoryStore.get(key) || null;
  }
};

const safeSet = (key, value) => {
  try {
    if (storageAvailable) {
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    }
    if (value === null || value === undefined) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, value);
    }
  } catch (_e) {
    if (value === null || value === undefined) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, value);
    }
  }
};

const safeRemove = (key) => {
  try {
    if (storageAvailable) {
      window.localStorage.removeItem(key);
    }
    memoryStore.delete(key);
  } catch (_e) {
    memoryStore.delete(key);
  }
};

export const authStorage = {
  getAccessToken: () => safeGet(ACCESS_TOKEN_KEY),
  setAccessToken: (token) => safeSet(ACCESS_TOKEN_KEY, token),

  getRefreshToken: () => safeGet(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => safeSet(REFRESH_TOKEN_KEY, token),

  setTokens: (accessToken, refreshToken) => {
    if (accessToken) safeSet(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) safeSet(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: () => {
    safeRemove(ACCESS_TOKEN_KEY);
    safeRemove(REFRESH_TOKEN_KEY);
  },

  getCachedUser: () => {
    const raw = safeGet(CACHED_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      safeRemove(CACHED_USER_KEY);
      return null;
    }
  },

  setCachedUser: (user) => {
    if (!user) {
      safeRemove(CACHED_USER_KEY);
      return;
    }
    try {
      safeSet(CACHED_USER_KEY, JSON.stringify(user));
    } catch (_e) {
      // Ignore serialization errors
    }
  },

  clearCachedUser: () => safeRemove(CACHED_USER_KEY),

  /**
   * Check if any authenticated credentials exist locally
   */
  hasAuth: () => {
    return Boolean(safeGet(ACCESS_TOKEN_KEY) || safeGet(REFRESH_TOKEN_KEY));
  },

  /**
   * Extract OAuth tokens from URL hash or search params on redirect landing.
   * Cleans the URL immediately to protect sensitive token parameters.
   */
  extractAndStoreOAuthTokens: () => {
    if (typeof window === "undefined") return false;

    try {
      const hash = window.location.hash.substring(1);
      const search = window.location.search.substring(1);
      const params = new URLSearchParams(hash || search);

      const token = params.get("token") || params.get("accessToken");
      const refreshToken = params.get("refreshToken") || params.get("refresh");

      if (token || refreshToken) {
        if (token) authStorage.setAccessToken(token);
        if (refreshToken) authStorage.setRefreshToken(refreshToken);

        console.info("[Lime Auth] OAuth tokens captured and stored securely");

        // Clean tokens from browser address bar & history
        const cleanUrl =
          window.location.pathname +
          (window.location.search && !search.includes("token")
            ? window.location.search
            : "");
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
      }
    } catch (err) {
      console.warn("[Lime Auth] Error parsing OAuth tokens from URL:", err.message);
    }
    return false;
  },
};

export default authStorage;
