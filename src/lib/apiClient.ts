/**
 * Base API client using native fetch.
 * Reads VITE_API_BASE_URL from environment variables.
 * Automatically attaches the Firebase ID token to every request.
 */

import { auth } from "./firebase";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message = json?.error?.message || `HTTP ${res.status}`;
    const code = json?.error?.code || "UNKNOWN";
    throw new ApiError(message, res.status, code);
  }

  return json as T;
}

/** Get the current user's Firebase ID token (refreshes automatically if expired). */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    await auth.authStateReady(); // wait for Firebase to restore session from storage
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

/**
 * Fetch with one automatic retry on network errors (handles brief Render restart window).
 * API errors (4xx/5xx) are NOT retried.
 */
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    await new Promise(r => setTimeout(r, 2000));
    return fetch(url, options);
  }
}

export async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  let url = `${BASE_URL}${path}`;

  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const authHeader = await getAuthHeader();
  const res = await fetchWithRetry(url, {
    headers: { "Content-Type": "application/json", ...authHeader },
  });
  return handleResponse<T>(res);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function del<T>(path: string): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeader },
  });
  return handleResponse<T>(res);
}
