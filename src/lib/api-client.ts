import { API_BASE } from "./constants";

/**
 * Dispatch a global event when a 401 is received from the backend.
 * The app component listens for this to redirect to login.
 */
function handleUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hermes:unauthorized"));
  }
}

/** Check response and handle 401 globally */
function checkResponse(res: Response): void {
  if (res.status === 401) {
    handleUnauthorized();
  }
}

export async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  checkResponse(res);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  checkResponse(res);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiDelete<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  checkResponse(res);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  checkResponse(res);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  checkResponse(res);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}
