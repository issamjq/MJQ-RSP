/**
 * Base API client using native fetch.
 * Reads VITE_API_BASE_URL from environment variables.
 * All requests include JSON headers and return parsed JSON.
 */

// In development Vite proxies /api → http://localhost:4000, so BASE_URL is empty.
// In production set VITE_API_BASE_URL to your Render backend URL.
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

/**
 * Fetch with one automatic retry on network errors (CORS/connection failures
 * during Render restarts). API errors (4xx/5xx) are NOT retried.
 */
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (networkErr) {
    // Wait 2 seconds then retry once — handles brief Render restart window
    await new Promise(r => setTimeout(r, 2000));
    return fetch(url, options);
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  let url = `${BASE_URL}${path}`;

  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const res = await fetchWithRetry(url, { headers: JSON_HEADERS });
  return handleResponse<T>(res);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: JSON_HEADERS,
  });
  return handleResponse<T>(res);
}
