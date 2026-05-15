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

/** Get or create a session token for a specific poll */
export function getOrCreateSessionToken(pollId: string): string {
  const key = `pollrange_session_${pollId}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = generateSessionToken();
  localStorage.setItem(key, token);
  return token;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDatetime(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isPollActive(expiresAt: string): boolean {
  return isAfter(new Date(expiresAt), new Date());
}

export function timeUntilExpiry(expiresAt: string): string {
  if (!isPollActive(expiresAt)) return "Expired";
  return formatDistanceToNow(new Date(expiresAt), { addSuffix: true });
}

export function buildShareUrl(shareToken: string): string {
  const base = config.appUrl;
  return `${base}/p/${shareToken}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/** Normalize API error to a display message */
export function getApiErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";
  
  const axiosError = error as {
    response?: { 
      status?: number; 
      data?: { 
        message?: string; 
        error?: { message?: string };
        errors?: { message: string }[] 
      } 
    };
  };

  const status = axiosError?.response?.status;
  const data = axiosError?.response?.data;
  
  // Extract server message (check both data.message and data.error.message)
  const serverMsg = data?.message || data?.error?.message;
  
  if (status === 401) return "Please log in to continue.";
  if (status === 403) return serverMsg || "You don't have permission to do that.";
  if (status === 404) return "Resource not found.";
  if (status === 410) return "This poll has expired.";
  
  return serverMsg || "Something went wrong. Please try again.";
}
