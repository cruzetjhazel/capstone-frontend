import CryptoJS from "crypto-js";
import { AUTH_TOKEN_KEY } from "@/config/env";

const SECRET = import.meta.env.VITE_STORAGE_SECRET ?? "dev-only-secret-change-me";

export function setAuthToken(token: string): void {
  const encrypted = CryptoJS.AES.encrypt(token, SECRET).toString();
  localStorage.setItem(AUTH_TOKEN_KEY, encrypted);
}

export function getAuthToken(): string | null {
  const stored = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!stored) return null;

  try {
    const decrypted = CryptoJS.AES.decrypt(stored, SECRET).toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      // Old plain-text token from before encryption was added — force a fresh login.
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
    return decrypted;
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
