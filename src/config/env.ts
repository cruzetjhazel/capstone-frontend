/** Centralized Vite environment configuration for Laravel API integration. */

export const env = {
  /** Laravel API base URL, e.g. http://127.0.0.1:8000/api */
  apiUrl: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api",
  /** When true, use in-memory mock data instead of HTTP calls. Set false when Laravel is ready. */
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== "false",
  /** App name for document title / meta */
  appName: import.meta.env.VITE_APP_NAME ?? "Bulan Photography Booking",
} as const;

export const AUTH_TOKEN_KEY = "bulan_auth_token";
