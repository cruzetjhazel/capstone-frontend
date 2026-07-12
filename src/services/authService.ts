import { env } from "@/config/env";
import { authApi } from "@/api/auth";
import type { ApiUser, LoginResponse, RegisterClientPayload } from "@/api/types/auth";
import { AUTH_TOKEN_KEY } from "@/config/env";

/** Demo accounts for local development when mock API is enabled. */
const DEMO_ACCOUNTS: Record<string, { password: string; user: ApiUser }> = {
  "client@example.com": {
    password: "Client123!",
    user: { id: 1, name: "Jane Client", email: "client@example.com", role: "client", initials: "JC" },
  },
  "freelancer@example.com": {
    password: "Freelancer123!",
    user: { id: 2, name: "Marco Villanueva", email: "freelancer@example.com", role: "freelancer", initials: "MV" },
  },
  "studio@example.com": {
    password: "Studio123!",
    user: { id: 3, name: "HH Production", email: "studio@example.com", role: "studio", initials: "HH" },
  },
  "admin@example.com": {
    password: "Admin123!",
    user: { id: 4, name: "Alex Admin", email: "admin@example.com", role: "admin", initials: "AA" },
  },
};

function withInitials(user: ApiUser): ApiUser {
  return {
    ...user,
    initials: user.initials ?? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
  };
}

function mockLogin(email: string, password: string): LoginResponse {
  const account = DEMO_ACCOUNTS[email.trim().toLowerCase()];
  if (!account || account.password !== password) {
    throw new Error("Invalid email or password.");
  }
  return {
    token: `mock-token-${account.user.role}`,
    user: withInitials(account.user),
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    if (env.useMockApi) {
      const result = mockLogin(email, password);
      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      return result;
    }
    const { data } = await authApi.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return { ...data, user: withInitials(data.user) };
  },

  async registerClient(payload: RegisterClientPayload): Promise<LoginResponse> {
    if (env.useMockApi) {
      const result: LoginResponse = {
        token: "mock-token-client",
        user: withInitials({
          id: Date.now(),
          name: payload.name,
          email: payload.email,
          role: "client",
        }),
      };
      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      return result;
    }
    const { data } = await authApi.register(payload);
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return { ...data, user: withInitials(data.user) };
  },

  async fetchCurrentUser(): Promise<ApiUser | null> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    if (env.useMockApi) {
      const match = Object.values(DEMO_ACCOUNTS).find((a) => `mock-token-${a.user.role}` === token);
      return match ? withInitials(match.user) : null;
    }

    try {
      const { data } = await authApi.me();
      return withInitials(data);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  },

  async logout(): Promise<void> {
    if (!env.useMockApi) {
      try {
        await authApi.logout();
      } catch {
        // ignore — token may already be invalid
      }
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
};

export { DEMO_ACCOUNTS };
