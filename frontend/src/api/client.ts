import { useAuthStore } from "../store/authStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = `Ошибка запроса (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string; title?: string };
      if (typeof body.detail === "string" && body.detail.length > 0) {
        detail = body.detail;
      } else if (typeof body.title === "string" && body.title.length > 0) {
        detail = body.title;
      }
    } catch {
      /* HTML или пустой ответ */
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, `Ошибка запроса (${response.status})`);
  }
  return response.blob();
}
