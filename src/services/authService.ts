import { authApi } from "@/api/auth";
import type { ApiUser, LoginResponse, RegisterClientPayload } from "@/api/types/auth";
import { AUTH_TOKEN_KEY } from "@/config/env";

function withInitials(user: ApiUser): ApiUser {
  return {
    ...user,
    initials: user.initials ?? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return { ...data, user: withInitials(data.user) };
  },

  async registerClient(payload: RegisterClientPayload): Promise<LoginResponse> {
    const { data } = await authApi.register(payload);
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return { ...data, user: withInitials(data.user) };
  },

  async fetchCurrentUser(): Promise<ApiUser | null> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    try {
      const { data } = await authApi.me();
      return withInitials(data);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // ignore — token may already be invalid
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
};
