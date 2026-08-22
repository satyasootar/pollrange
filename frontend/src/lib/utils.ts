import { config } from "@/config/config";
import { v4 as uuidv4 } from "uuid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isAfter } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a UUID v4 session token for anonymous response dedup */
export function generateSessionToken(): string {
  return uuidv4();
}

/**
 * Generate a 24-char hex string compatible with a Mongo ObjectId. Used as stable
 * client-side ids for form sections/questions/options so branching targets, quiz
 * answer keys, and option counters keep the same identity after persistence.
 */
export function newObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const rest = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return timestamp + rest;
}

/** Get or create a session token for a specific poll */
export function getOrCreateSessionToken(pollId: string): string {
  const key = `kollects_session_${pollId}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = generateSessionToken();
  localStorage.setItem(key, token);
  return token;
}

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Return a new array shuffled with an unbiased Fisher-Yates algorithm.
 * When a `seed` is given the order is deterministic for that seed, so the same
 * input always produces the same order (stable across re-renders/refetches).
 */
export function shuffle<T>(items: readonly T[], seed?: string): T[] {
  const rand = seed !== undefined ? seededRandom(seed) : Math.random;
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDatetime(date: string | Date | undefined | null): string {
  if (!date) return "Not set";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Not set";
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isPollActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true; // No expiry means always active
  return isAfter(new Date(expiresAt), new Date());
}

export function timeUntilExpiry(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "No expiry";
  if (!isPollActive(expiresAt)) return "Expired";
  return formatDistanceToNow(new Date(expiresAt), { addSuffix: true });
}

export function buildShareUrl(shareToken: string): string {
  const base = config.appUrl;
  return `${base}/p/${shareToken}`;
}

export function buildFormShareUrl(shareToken: string): string {
  return `${config.appUrl}/f/${shareToken}`;
}

/** Trigger a browser download for a Blob (used for CSV export). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export interface ApiValidationError {
  path: string;
  message: string;
}

interface ApiErrorResponse {
  status?: number;
  data?: {
    message?: string;
    error?: { message?: string };
    errors?: ApiValidationError[];
  };
}

/** Normalize API error to a display message */
export function getApiErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";

  const axiosError = error as { response?: ApiErrorResponse };
  const status = axiosError?.response?.status;
  const data = axiosError?.response?.data;

  // Prefer the specific field error (e.g. "Invalid expiry date…") over the
  // generic "Validation Error" wrapper message.
  const serverMsg = data?.errors?.[0]?.message || data?.message || data?.error?.message;

  if (status === 401) return "Please log in to continue.";
  if (status === 403) return serverMsg || "You don't have permission to do that.";
  if (status === 404) return "Resource not found.";
  if (status === 410) return "This poll has expired.";

  return serverMsg || "Something went wrong. Please try again.";
}

/** Extracts the field-level validation errors from a 400 Validation Error response, if present. */
export function getValidationErrors(error: unknown): ApiValidationError[] | null {
  const axiosError = error as { response?: ApiErrorResponse };
  const status = axiosError?.response?.status;
  const errors = axiosError?.response?.data?.errors;
  return status === 400 && errors && errors.length > 0 ? errors : null;
}
