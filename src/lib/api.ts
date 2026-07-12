import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { env, AUTH_TOKEN_KEY } from "@/config/env";

/**
 * Shared Axios instance for all Laravel API requests.
 * - Sends JSON Accept/Content-Type headers
 * - Attaches Bearer token from localStorage when present
 * - Redirects to /login on 401 (except auth endpoints)
 */
const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 30_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    if (status === 401 && !url.includes("/login") && !url.includes("/register")) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;

/** Extract a human-readable message from a Laravel validation/error response. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
  if (data?.message) return data.message;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (first?.[0]) return first[0];
  }
  return fallback;
}
