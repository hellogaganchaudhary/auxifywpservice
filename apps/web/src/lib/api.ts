import axios from "axios";
import { getAccessToken, setAccessToken } from "@/lib/auth";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (
      error.response?.status !== 401 ||
      originalRequest.__isRetryRequest ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/super-admin/login")
    ) {
      return Promise.reject(error);
    }
    try {
      originalRequest.__isRetryRequest = true;
      const { data } = await refreshClient.get("/auth/refresh");
      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
        window.location.href = "/login";
        return new Promise(() => undefined);
      }
      return Promise.reject(error);
    }
  }
);

export default api;
