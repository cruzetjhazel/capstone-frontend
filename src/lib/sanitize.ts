// Lightweight input sanitization helpers (frontend only).
// The real backend must re-validate everything on the server.

/** Strip control chars, HTML tag brackets, and trim whitespace. */
export function sanitizeText(input: string, maxLength = 500): string {
  if (!input) return "";
  return input
    // eslint-disable-next-line no-control-regex -- strip control characters from user input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")                   // no raw tag brackets
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(input: string): string {
  return sanitizeText(input, 254).toLowerCase().replace(/\s+/g, "");
}

export function sanitizePhone(input: string): string {
  return (input || "").replace(/[^\d+\-\s()]/g, "").trim().slice(0, 20);
}

/** Only allow http(s) URLs, otherwise return empty string. */
export function sanitizeUrl(input: string): string {
  const v = sanitizeText(input, 300);
  if (!v) return "";
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString();
  } catch {
    return "";
  }
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isStrongPassword = (v: string) => v.length >= 8;
