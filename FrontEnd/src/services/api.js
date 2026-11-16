import axios from "axios";
import { serverUrl } from "../config";
import authStorage from "../utils/authStorage";

// Enable cookies on all axios requests by default
axios.defaults.withCredentials = true;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Global Axios Request Interceptor
 * Injects Authorization header and request ID
 */
axios.interceptors.request.use(
  (config) => {
    const token = authStorage.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.headers["x-request-id"]) {
      config.headers["x-request-id"] =
        "req_" + Math.random().toString(36).slice(2, 9);
    }

    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Global Axios Response Interceptor
 * Handles 401 token refresh with mutex lock and concurrent request queue
 */
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const url = originalRequest.url || "";

    // Ignore authentication endpoints themselves to prevent infinite loops
    const isAuthRoute = url.includes("/api/auth/");

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      const refreshToken = authStorage.getRefreshToken();

      if (isRefreshing) {
        // Queue concurrent requests while token refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Plain request without triggering interceptors again
        const { data } = await axios.post(
          `${serverUrl}/api/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              ...(refreshToken ? { "x-refresh-token": refreshToken } : {}),
            },
          }
        );

        if (data?.success && (data.token || data.accessToken)) {
          const newAccess = data.token || data.accessToken;
          const newRefresh = data.refreshToken || refreshToken;

          authStorage.setTokens(newAccess, newRefresh);
          if (data.user) {
            authStorage.setCachedUser(data.user);
          }

          processQueue(null, newAccess);

          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return axios(originalRequest);
        } else {
          throw new Error("Invalid refresh response");
        }
      } catch (refreshErr) {
        const refreshStatus = refreshErr.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          authStorage.clearTokens();
          authStorage.clearCachedUser();
        }
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const api = axios.create({
  baseURL: `${serverUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
