import { API_URL } from "./theme";
import { clearTokens, saveTokens } from "./session";
import type { ChatMessage, HelpRequest, RequestLocation, ShiftPublic, TokenPair, User, WalletMe } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export function setTokens(tokens: TokenPair | null) {
  accessToken = tokens?.access_token ?? null;
  refreshToken = tokens?.refresh_token ?? null;
}

async function tryRefresh() {
  if (!refreshToken) {
    return false;
  }
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) {
          return false;
        }
        const tokens = (await response.json()) as TokenPair;
        setTokens(tokens);
        await saveTokens(tokens);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && (await tryRefresh())) {
    return apiFetch<T>(path, init, false);
  }
  if (response.status === 401) {
    setTokens(null);
    await clearTokens();
  }
  if (!response.ok) {
    let detail = "Ошибка запроса";
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      /* пустой ответ */
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function register(email: string, password: string, displayName: string, asExecutor: boolean) {
  return apiFetch<TokenPair>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
      as_executor: asExecutor,
    }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<TokenPair>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe() {
  return apiFetch<User>("/api/v1/auth/me");
}

export function listNearby(lat: number, lng: number) {
  return apiFetch<HelpRequest[]>(`/api/v1/requests?lat=${lat}&lng=${lng}&radius_m=5000`);
}

export function listMine() {
  return apiFetch<HelpRequest[]>("/api/v1/requests?mine=true");
}

export function getRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}`);
}

export function takeRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/take`, { method: "POST", body: "{}" });
}

export function refuseRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/refuse`, { method: "POST", body: "{}" });
}

export function cancelRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}`, { method: "DELETE" });
}

export function startRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/start`, { method: "POST" });
}

export function completeRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/complete`, { method: "POST" });
}

export function listMessages(id: string) {
  return apiFetch<ChatMessage[]>(`/api/v1/requests/${id}/messages`);
}

export function sendMessage(id: string, body: string) {
  return apiFetch<ChatMessage>(`/api/v1/requests/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function pingLocation(id: string, latitude: number, longitude: number) {
  return apiFetch<RequestLocation>(`/api/v1/requests/${id}/location`, {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export function getLocation(id: string) {
  return apiFetch<RequestLocation>(`/api/v1/requests/${id}/location`);
}

export function getWallet() {
  return apiFetch<WalletMe>("/api/v1/wallet/me");
}

export function shiftOn(latitude: number, longitude: number) {
  return apiFetch<ShiftPublic>("/api/v1/shift/on", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export function shiftOff() {
  return apiFetch<ShiftPublic>("/api/v1/shift/off", { method: "POST" });
}

export function shiftMe() {
  return apiFetch<ShiftPublic>("/api/v1/shift/me");
}
