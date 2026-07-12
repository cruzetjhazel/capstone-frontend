import api from "@/lib/api";
import type { LoginPayload, LoginResponse, RegisterClientPayload, ApiUser } from "@/api/types/auth";

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>("/login", payload),

  register: (payload: RegisterClientPayload | FormData) =>
    api.post<LoginResponse>("/register", payload),

  logout: () =>
    api.post<{ message: string }>("/logout"),

  me: () =>
    api.get<ApiUser>("/user"),
};
