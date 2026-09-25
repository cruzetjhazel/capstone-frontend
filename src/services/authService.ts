import { authApi } from "@/api/auth";
import type { ApiUser, LoginResponse, RegisterClientPayload } from "@/api/types/auth";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/tokenStorage";

function withInitials(user: ApiUser): ApiUser {
  return {
    ...user,
    initials: user.initials ?? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await authApi.login({ email, password });
    setAuthToken(data.token);
    return { ...data, user: withInitials(data.user) };
  },

  async registerClient(payload: RegisterClientPayload): Promise<LoginResponse> {
    const { data } = await authApi.register(payload);
    setAuthToken(data.token);
    return { ...data, user: withInitials(data.user) };
  },

  async fetchCurrentUser(): Promise<ApiUser | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const { data } = await authApi.me();
      return withInitials(data);
    } catch {
      clearAuthToken();
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // ignore — token may already be invalid
    }
    clearAuthToken();
  },

  getStoredToken(): string | null {
    return getAuthToken();
  },
};
