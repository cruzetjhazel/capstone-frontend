import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Derive display initials from a full name (e.g. "Maria Santos" -> "MS"). */
export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// GCash reference numbers are 13 digits, shown as "1234 567 890123".
// Only the digits are stored/sent; the spaces are added automatically for display.
export const formatGcashRef = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  const compact = raw.replace(/\s/g, "");
  if (!/^\d+$/.test(compact)) return raw; // leave old/non-numeric values untouched
  return [compact.slice(0, 4), compact.slice(4, 7), compact.slice(7, 13)].filter(Boolean).join(" ");
};